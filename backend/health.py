"""Weighted project health score computation."""
from __future__ import annotations

from typing import Optional


def compute_health(project: dict, runs: list, detailed: bool = False, apks: Optional[list] = None) -> dict:
    pid = project["id"]
    total = sum(len(p.get("tasks", [])) for p in project.get("phases", []))
    closed = sum(1 for p in project.get("phases", []) for t in p.get("tasks", []) if t.get("status") == "closed")
    blocked = sum(1 for p in project.get("phases", []) for t in p.get("tasks", []) if t.get("status") == "blocked")
    progress = int((closed / total) * 100) if total else 0

    test_runs = [r for r in runs if r.get("project_id") == pid and r.get("kind") == "test_console"]
    attr_runs = [r for r in runs if r.get("project_id") == pid and r.get("kind") == "attribution"]
    sdk_pass = int((sum(1 for r in test_runs if r.get("ok")) / len(test_runs)) * 100) if test_runs else None
    attr_pass = int((sum(1 for r in attr_runs if r.get("ok")) / len(attr_runs)) * 100) if attr_runs else None

    # APK-audit-derived signal: is the Singular SDK integrated in any uploaded build?
    project_apks = [a for a in (apks or []) if a.get("project_id") == pid]
    green_apks = [a for a in project_apks if (a.get("audit") or {}).get("has_singular_sdk")]
    apk_uploaded = len(project_apks) > 0
    apk_sdk_detected = len(green_apks) > 0
    latest_green = max(green_apks, key=lambda a: a.get("uploaded_at", ""), default=None)
    apk_sdk_version = (latest_green or {}).get("audit", {}).get("sdk_version") if latest_green else None
    apk_signal = 100 if apk_sdk_detected else (0 if apk_uploaded else None)

    if sdk_pass is None and attr_pass is None and apk_signal is None:
        score = progress
    else:
        s_sdk = sdk_pass if sdk_pass is not None else progress
        s_attr = attr_pass if attr_pass is not None else progress
        s_apk = apk_signal if apk_signal is not None else progress
        score = round(0.55 * progress + 0.20 * s_sdk + 0.15 * s_attr + 0.10 * s_apk)
    if blocked > 0:
        score = max(0, score - min(20, blocked * 5))

    grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 50 else "D" if score >= 25 else "F"

    base = {
        "score": score, "grade": grade, "progress": progress,
        "tasks_total": total, "tasks_closed": closed, "blocked": blocked,
        "sdk_pass_rate": sdk_pass, "attribution_pass_rate": attr_pass,
        "sdk_runs": len(test_runs), "attribution_runs": len(attr_runs),
        "apk_uploaded": apk_uploaded, "apk_sdk_detected": apk_sdk_detected,
        "apk_sdk_version": apk_sdk_version, "apk_count": len(project_apks),
    }
    if detailed:
        base["breakdown"] = [
            {"label": "Phase progress", "weight": 55, "value": progress},
            {"label": "SDK test pass rate", "weight": 20,
             "value": sdk_pass if sdk_pass is not None else 0,
             "note": "no runs yet" if sdk_pass is None else f"{len(test_runs)} run(s)"},
            {"label": "Attribution pass rate", "weight": 15,
             "value": attr_pass if attr_pass is not None else 0,
             "note": "no runs yet" if attr_pass is None else f"{len(attr_runs)} run(s)"},
            {"label": "APK SDK integrated", "weight": 10,
             "value": apk_signal if apk_signal is not None else 0,
             "note": (f"v{apk_sdk_version}" if apk_sdk_version else ("detected" if apk_sdk_detected else ("not detected" if apk_uploaded else "no APK yet")))},
            {"label": "Blocked task penalty", "weight": 0,
             "value": -min(20, blocked * 5), "note": f"{blocked} blocked"},
        ]
    return base
