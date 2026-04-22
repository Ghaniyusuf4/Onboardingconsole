"""
APK / AAB static analyser for Singular SDK presence & version.

Audit strategy:
  * Open the uploaded bytes as a zip archive (both .apk and .aab are zips).
  * Parse AndroidManifest.xml for package / version / permissions.
      - .apk → binary AXML parsed with pyaxmlparser.
      - .aab → base/manifest/AndroidManifest.xml is a protobuf; we fall back
               to string-sniffing, which is enough for the audit report.
  * Scan every classes*.dex (APK) or base/dex/classes*.dex (AAB) for
    well-known Singular SDK class signatures and version strings.
  * Produce a structured finding set that the UI renders as pass/fail rows.
"""
from __future__ import annotations

import io
import re
import zipfile
from typing import Any, Dict, List, Optional

# Signatures we expect when the Singular SDK is linked into the build.
_SDK_CLASS_SIGNATURES = [
    b"com/singular/sdk/Singular",
    b"com/singular/sdk/SingularConfig",
    b"com/singular/sdk/SingularInstallReceiver",
    b"com/singular/sdk/internal/SingularInstance",
]
_SDK_HUMAN_STRINGS = [
    b"com.singular.sdk",
    b"Singular.init",
    b"SingularConfig",
    b"singular_config.json",
]
# SDK version constants the Singular Android SDK embeds in bytecode.
_VERSION_PATTERNS = [
    re.compile(rb"SDK_VERSION[^0-9]{0,16}(\d{1,2}\.\d{1,2}\.\d{1,2})"),
    re.compile(rb"singular[-_]?sdk[^0-9]{0,12}(\d{1,2}\.\d{1,2}\.\d{1,2})", re.I),
    re.compile(rb"Singular[^0-9]{0,12}v?(\d{1,2}\.\d{1,2}\.\d{1,2})"),
]

# Permissions we want to flag for a Singular-ready build.
_RECOMMENDED_PERMS = {
    "com.google.android.gms.permission.AD_ID": "Required on Android 13+ to read the Advertising ID (GAID).",
    "android.permission.INTERNET": "Required — SDK posts attribution events over HTTPS.",
    "android.permission.ACCESS_NETWORK_STATE": "Recommended — lets the SDK defer events on offline devices.",
}


def _is_apk(filename: str) -> bool:
    return filename.lower().endswith(".apk")


def _parse_apk_manifest(zf: zipfile.ZipFile) -> Dict[str, Any]:
    """Parse binary AndroidManifest.xml from an APK."""
    try:
        from pyaxmlparser.axmlprinter import AXMLPrinter  # type: ignore
        from lxml import etree  # type: ignore
    except Exception as exc:  # pragma: no cover
        return {"parser_error": f"pyaxmlparser unavailable: {exc}"}

    try:
        raw = zf.read("AndroidManifest.xml")
    except KeyError:
        return {"parser_error": "AndroidManifest.xml missing"}

    try:
        axml = AXMLPrinter(raw)
        root = etree.fromstring(axml.get_buff())
    except Exception as exc:
        return {"parser_error": f"AXML parse failed: {exc}"}

    ns = "{http://schemas.android.com/apk/res/android}"
    package = root.attrib.get("package")
    version_name = root.attrib.get(f"{ns}versionName") or root.attrib.get("versionName")
    version_code = root.attrib.get(f"{ns}versionCode") or root.attrib.get("versionCode")
    perms: List[str] = []
    for el in root.findall("uses-permission"):
        name = el.attrib.get(f"{ns}name") or el.attrib.get("name")
        if name:
            perms.append(name)
    min_sdk: Optional[str] = None
    target_sdk: Optional[str] = None
    uses_sdk = root.find("uses-sdk")
    if uses_sdk is not None:
        min_sdk = uses_sdk.attrib.get(f"{ns}minSdkVersion")
        target_sdk = uses_sdk.attrib.get(f"{ns}targetSdkVersion")
    return {
        "package": package,
        "version_name": version_name,
        "version_code": version_code,
        "min_sdk": min_sdk,
        "target_sdk": target_sdk,
        "permissions": perms,
    }


def _parse_aab_manifest(zf: zipfile.ZipFile) -> Dict[str, Any]:
    """Best-effort manifest info for .aab (protobuf-based)."""
    name = "base/manifest/AndroidManifest.xml"
    if name not in zf.namelist():
        return {"parser_error": "base/manifest/AndroidManifest.xml missing"}
    raw = zf.read(name)
    # Protobuf is binary; extract printable strings to find package hint.
    tokens = re.findall(rb"[A-Za-z0-9_.\-/:]{4,}", raw)
    decoded = [t.decode("utf-8", "ignore") for t in tokens]
    package = next((t for t in decoded if re.fullmatch(r"[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,6}", t) and not t.startswith("android.")), None)
    return {
        "package": package,
        "version_name": None,
        "version_code": None,
        "min_sdk": None,
        "target_sdk": None,
        "permissions": [t for t in decoded if t.startswith("android.permission.") or t.startswith("com.google.android.gms.permission.")],
        "note": "AAB manifest is protobuf — values derived from string extraction.",
    }


def _scan_dex_blobs(zf: zipfile.ZipFile, names: List[str]) -> Dict[str, Any]:
    """Search DEX blobs for Singular class/version signatures."""
    found_classes: List[str] = []
    found_strings: List[str] = []
    version: Optional[str] = None
    total_bytes = 0
    for name in names:
        try:
            blob = zf.read(name)
        except Exception:
            continue
        total_bytes += len(blob)
        for sig in _SDK_CLASS_SIGNATURES:
            if sig in blob and sig.decode() not in found_classes:
                found_classes.append(sig.decode())
        for sig in _SDK_HUMAN_STRINGS:
            if sig in blob and sig.decode() not in found_strings:
                found_strings.append(sig.decode())
        if version is None:
            for pat in _VERSION_PATTERNS:
                m = pat.search(blob)
                if m:
                    version = m.group(1).decode()
                    break
    return {
        "sdk_classes_found": found_classes,
        "sdk_strings_found": found_strings,
        "sdk_version": version,
        "dex_files_scanned": len(names),
        "dex_bytes_scanned": total_bytes,
    }


def audit(data: bytes, filename: str) -> Dict[str, Any]:
    """Return a structured audit dict. Never raises — errors go in `errors`."""
    result: Dict[str, Any] = {
        "filename": filename,
        "format": "apk" if _is_apk(filename) else "aab" if filename.lower().endswith(".aab") else "unknown",
        "size_bytes": len(data),
        "errors": [],
    }
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        result["errors"].append(f"Not a valid APK/AAB archive: {exc}")
        result["has_singular_sdk"] = False
        result["findings"] = [{"label": "Archive valid", "ok": False, "detail": str(exc)}]
        return result

    names = zf.namelist()
    result["entry_count"] = len(names)

    if result["format"] == "apk":
        dex_names = [n for n in names if re.fullmatch(r"classes\d*\.dex", n)]
        manifest = _parse_apk_manifest(zf)
    elif result["format"] == "aab":
        dex_names = [n for n in names if re.fullmatch(r"base/dex/classes\d*\.dex", n)]
        manifest = _parse_aab_manifest(zf)
    else:
        dex_names = []
        manifest = {"parser_error": "Unknown container"}

    result["manifest"] = manifest
    scan = _scan_dex_blobs(zf, dex_names)
    result.update(scan)
    result["has_singular_sdk"] = bool(scan["sdk_classes_found"] or scan["sdk_strings_found"])

    # --- Build the findings checklist that the UI renders ---
    findings: List[Dict[str, Any]] = []
    findings.append({
        "label": "Archive is a valid APK/AAB",
        "ok": True,
        "detail": f"{result['entry_count']} entries · {result['size_bytes']:,} bytes",
    })
    findings.append({
        "label": "Singular SDK classes present",
        "ok": bool(scan["sdk_classes_found"]),
        "detail": ", ".join(scan["sdk_classes_found"]) or "No com.singular.sdk.* classes detected in DEX.",
    })
    findings.append({
        "label": "Singular SDK version discovered",
        "ok": bool(scan["sdk_version"]),
        "detail": scan["sdk_version"] or "Version constant not found — SDK may be obfuscated or very old.",
    })
    perms = manifest.get("permissions") or []
    for perm, why in _RECOMMENDED_PERMS.items():
        present = perm in perms
        findings.append({
            "label": f"Manifest permission: {perm}",
            "ok": present,
            "detail": why if present else f"Missing — {why}",
        })
    if manifest.get("package"):
        findings.append({
            "label": "App package identified",
            "ok": True,
            "detail": f"{manifest['package']} · v{manifest.get('version_name') or '—'} (code {manifest.get('version_code') or '—'})",
        })
    if manifest.get("parser_error"):
        findings.append({
            "label": "Manifest parsed",
            "ok": False,
            "detail": manifest["parser_error"],
        })

    result["findings"] = findings
    ok_count = sum(1 for f in findings if f["ok"])
    result["score"] = {"passed": ok_count, "total": len(findings)}
    return result
