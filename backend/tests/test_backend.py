"""Backend API tests for Singular Onboarding app."""
import os, io, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://onboard-console.preview.emergentagent.com").rstrip("/")
TOKEN = os.environ["T1_TOKEN"]
TOKEN2 = os.environ["T2_TOKEN"]

H = {"Authorization": f"Bearer {TOKEN}"}
H2 = {"Authorization": f"Bearer {TOKEN2}"}

# ---- health ----
def test_health():
    r = requests.get(f"{BASE}/api/")
    assert r.status_code == 200
    assert r.json().get("service") == "singular-onboarding"

# ---- auth ----
def test_me_unauth():
    r = requests.get(f"{BASE}/api/auth/me")
    assert r.status_code == 401

def test_me_bearer():
    r = requests.get(f"{BASE}/api/auth/me", headers=H)
    assert r.status_code == 200
    assert "email" in r.json()

def test_session_missing():
    r = requests.post(f"{BASE}/api/auth/session", json={})
    assert r.status_code in (400, 422)

def test_logout_ok():
    # Logout without cookie should still be ok
    r = requests.post(f"{BASE}/api/auth/logout")
    assert r.status_code == 200

# ---- projects ----
@pytest.fixture(scope="module")
def project_id():
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_Proj", "customer": "TEST_Cust", "platform": "android", "apply_template": True})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "TEST_Proj"
    assert len(d["phases"]) == 8
    total_tasks = sum(len(p["tasks"]) for p in d["phases"])
    assert total_tasks > 0
    pid = d["id"]
    yield pid
    requests.delete(f"{BASE}/api/projects/{pid}", headers=H)

def test_list_projects(project_id):
    r = requests.get(f"{BASE}/api/projects", headers=H)
    assert r.status_code == 200
    assert any(p["id"] == project_id for p in r.json())

def test_get_project_tree(project_id):
    r = requests.get(f"{BASE}/api/projects/{project_id}", headers=H)
    assert r.status_code == 200
    d = r.json()
    assert len(d["phases"]) == 8

def test_patch_keys(project_id):
    r = requests.patch(f"{BASE}/api/projects/{project_id}/keys", headers=H,
                       json={"sdk_key": "sdk_fake", "api_key": "api_fake"})
    assert r.status_code == 200
    g = requests.get(f"{BASE}/api/projects/{project_id}", headers=H).json()
    assert g["sdk_key"] == "sdk_fake" and g["api_key"] == "api_fake"

def test_patch_task_and_checklist(project_id):
    d = requests.get(f"{BASE}/api/projects/{project_id}", headers=H).json()
    tid = d["phases"][0]["tasks"][0]["id"]
    cid = d["phases"][0]["tasks"][0]["checklist"][0]["id"]
    r = requests.patch(f"{BASE}/api/projects/{project_id}/tasks/{tid}", headers=H,
                       json={"status": "in_progress", "priority": "high", "owner": "me"})
    assert r.status_code == 200
    r2 = requests.patch(f"{BASE}/api/projects/{project_id}/tasks/{tid}/checklist/{cid}", headers=H,
                        json={"done": True})
    assert r2.status_code == 200
    d2 = requests.get(f"{BASE}/api/projects/{project_id}", headers=H).json()
    t = d2["phases"][0]["tasks"][0]
    assert t["status"] == "in_progress" and t["priority"] == "high" and t["owner"] == "me"
    assert t["checklist"][0]["done"] is True

# ---- APK upload ----
import zipfile

def _make_fake_sdk_apk():
    """Build an in-memory zip that looks like an APK containing Singular SDK markers in classes.dex."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        dex_body = (
            b"dex\n035\x00" + b"\x00" * 32
            + b"com/singular/sdk/Singular;"
            + b"com/singular/sdk/SingularConfig;"
            + b'SDK_VERSION = "12.3.1"'
            + b"com.singular.sdk"
            + b"\x00" * 32
        )
        zf.writestr("classes.dex", dex_body)
        # minimal manifest placeholder (will fail AXML parse — that's fine, audit must stay 200)
        zf.writestr("AndroidManifest.xml", b"not-real-axml")
    return buf.getvalue()

def test_apk_upload_list_non_zip(project_id):
    """Non-zip should upload OK, audit returns has_singular_sdk=false and errors[]."""
    files = {"file": ("test.apk", io.BytesIO(b"PK\x03\x04fakeapk"), "application/vnd.android.package-archive")}
    r = requests.post(f"{BASE}/api/projects/{project_id}/apk", headers=H, files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["size"] > 0 and d["storage_path"] and d["id"]
    assert "audit" in d
    aud = d["audit"]
    assert aud.get("has_singular_sdk") is False
    assert isinstance(aud.get("errors", []), list)
    assert len(aud["errors"]) > 0  # "Not a valid APK/AAB archive"
    # list returns it
    l = requests.get(f"{BASE}/api/projects/{project_id}/apks", headers=H)
    assert l.status_code == 200
    rows = l.json()
    assert any(a["id"] == d["id"] for a in rows)
    # no Mongo _id leakage
    for a in rows:
        assert "_id" not in a
        assert "audit" in a

def test_apk_upload_audit_detects_singular():
    """Synthetic zip with Singular markers should flip has_singular_sdk true + detect version."""
    # Fresh project
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_AuditProj", "apply_template": False})
    pid = r.json()["id"]
    try:
        apk_bytes = _make_fake_sdk_apk()
        files = {"file": ("sdkish.apk", io.BytesIO(apk_bytes), "application/vnd.android.package-archive")}
        up = requests.post(f"{BASE}/api/projects/{pid}/apk", headers=H, files=files)
        assert up.status_code == 200, up.text
        d = up.json()
        aud = d.get("audit") or {}
        # Structural contract
        assert aud.get("has_singular_sdk") is True, f"audit={aud}"
        assert aud.get("sdk_version") == "12.3.1", f"audit={aud}"
        assert "manifest" in aud and isinstance(aud["manifest"], dict)
        findings = aud.get("findings") or []
        assert isinstance(findings, list) and len(findings) >= 3
        for f in findings:
            assert "label" in f and "ok" in f and "detail" in f
            assert isinstance(f["ok"], bool)
        score = aud.get("score") or {}
        assert "passed" in score and "total" in score
        assert score["total"] > 0
        # Detection findings should be ok=true
        labels = {f["label"]: f["ok"] for f in findings}
        assert labels.get("Singular SDK classes present") is True
        assert labels.get("Singular SDK version discovered") is True
    finally:
        requests.delete(f"{BASE}/api/projects/{pid}", headers=H)

# ---- Health score w/ APK signal (iter3) ----
def test_health_fallback_zero_apks(project_id):
    """With zero test runs and zero APKs, score equals progress (fallback branch)."""
    # Fresh project with template so we have tasks but 0 progress & 0 apks
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_HealthZeroApk", "apply_template": True})
    pid = r.json()["id"]
    try:
        h = requests.get(f"{BASE}/api/projects/{pid}/health", headers=H).json()
        # New top-level fields
        for k in ("apk_uploaded", "apk_sdk_detected", "apk_sdk_version", "apk_count"):
            assert k in h, f"missing {k} in health: {h}"
        assert h["apk_uploaded"] is False
        assert h["apk_sdk_detected"] is False
        assert h["apk_sdk_version"] is None
        assert h["apk_count"] == 0
        # Fallback branch: score equals progress
        assert h["score"] == h["progress"]
        # Breakdown includes 'APK SDK integrated' row w/ weight 10
        br = h["breakdown"]
        row = next((x for x in br if x["label"] == "APK SDK integrated"), None)
        assert row is not None, f"missing APK SDK row: {br}"
        assert row["weight"] == 10
        assert row["value"] == 0
        assert "no APK yet" in row["note"]
        # Existing row weights should reflect the new split: 55 / 20 / 15 / 10
        pp = next(x for x in br if x["label"] == "Phase progress")
        sdk = next(x for x in br if x["label"] == "SDK test pass rate")
        attr = next(x for x in br if x["label"] == "Attribution pass rate")
        assert pp["weight"] == 55
        assert sdk["weight"] == 20
        assert attr["weight"] == 15
    finally:
        requests.delete(f"{BASE}/api/projects/{pid}", headers=H)


def test_health_with_green_apk_50pct_progress():
    """Green APK on 50%-progress project: score = round(0.55*50 + 0.20*50 + 0.15*50 + 0.10*100) = 55."""
    # Fresh project, template=False so we control task count via patches; easier path: use template and close half.
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_Health50Green", "apply_template": True})
    pid = r.json()["id"]
    try:
        tree = requests.get(f"{BASE}/api/projects/{pid}", headers=H).json()
        all_tids = [t["id"] for p in tree["phases"] for t in p["tasks"]]
        assert len(all_tids) > 0
        half = len(all_tids) // 2
        # Close exactly half the tasks
        for tid in all_tids[:half]:
            rr = requests.patch(f"{BASE}/api/projects/{pid}/tasks/{tid}", headers=H,
                                json={"status": "closed"})
            assert rr.status_code == 200
        # Upload green-audit APK
        apk_bytes = _make_fake_sdk_apk()
        up = requests.post(f"{BASE}/api/projects/{pid}/apk", headers=H,
                           files={"file": ("g.apk", io.BytesIO(apk_bytes), "application/vnd.android.package-archive")})
        assert up.status_code == 200
        assert up.json()["audit"]["has_singular_sdk"] is True
        # Re-fetch health
        h = requests.get(f"{BASE}/api/projects/{pid}/health", headers=H).json()
        assert h["apk_sdk_detected"] is True
        assert h["apk_sdk_version"] == "12.3.1"
        assert h["apk_count"] >= 1
        # Progress should be close to 50 (integer division)
        expected_progress = int((half / len(all_tids)) * 100)
        assert h["progress"] == expected_progress
        # Compute expected score: 0.55*p + 0.20*p + 0.15*p + 0.10*100 (test_runs & attr_runs are 0 so s_sdk=s_attr=progress)
        expected_score = round(0.55 * expected_progress + 0.20 * expected_progress + 0.15 * expected_progress + 0.10 * 100)
        assert h["score"] == expected_score, f"got {h['score']} expected {expected_score} (progress={expected_progress})"
        if expected_progress == 50:
            assert h["score"] == 55
        # Breakdown row reflects detection
        row = next(x for x in h["breakdown"] if x["label"] == "APK SDK integrated")
        assert row["value"] == 100
        assert "12.3.1" in row["note"]
    finally:
        requests.delete(f"{BASE}/api/projects/{pid}", headers=H)


def test_projects_list_exposes_apk_fields():
    """GET /api/projects returns apk_sdk_detected + apk_sdk_version per item."""
    # Create a project + upload green APK so one item is known-detected
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_ListApkFields", "apply_template": False})
    pid = r.json()["id"]
    try:
        apk_bytes = _make_fake_sdk_apk()
        requests.post(f"{BASE}/api/projects/{pid}/apk", headers=H,
                      files={"file": ("g.apk", io.BytesIO(apk_bytes), "application/vnd.android.package-archive")})
        rows = requests.get(f"{BASE}/api/projects", headers=H).json()
        assert isinstance(rows, list) and len(rows) > 0
        for it in rows:
            assert "apk_sdk_detected" in it
            assert "apk_sdk_version" in it
        mine = next(x for x in rows if x["id"] == pid)
        assert mine["apk_sdk_detected"] is True
        assert mine["apk_sdk_version"] == "12.3.1"
    finally:
        requests.delete(f"{BASE}/api/projects/{pid}", headers=H)


# ---- Singular test console & attribution (expect 4xx from upstream, but our API stores run) ----
def test_singular_test_console(project_id):
    r = requests.post(f"{BASE}/api/singular/test-console", headers=H,
                      json={"project_id": project_id, "sdk_key": "fake_sdk", "device_id": "dev-1", "platform": "android"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["kind"] == "test_console"
    assert d["ok"] is False  # upstream will reject fake key
    assert "id" in d

def test_singular_attribution(project_id):
    r = requests.post(f"{BASE}/api/singular/attribution", headers=H,
                      json={"api_key": "fake_api", "device_id": "dev-1", "platform": "android",
                            "device_id_type": "advertising_id"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["kind"] == "attribution"
    assert "ok" in d

def test_list_test_runs(project_id):
    r = requests.get(f"{BASE}/api/projects/{project_id}/test-runs", headers=H)
    assert r.status_code == 200
    assert len(r.json()) >= 1

# ---- Auth isolation ----
def test_auth_isolation(project_id):
    r = requests.get(f"{BASE}/api/projects/{project_id}", headers=H2)
    assert r.status_code == 404

# ---- Delete cascade ----
def test_delete_project_cascade():
    # create fresh
    r = requests.post(f"{BASE}/api/projects", headers=H,
                      json={"name": "TEST_DelProj", "apply_template": False})
    pid = r.json()["id"]
    d = requests.delete(f"{BASE}/api/projects/{pid}", headers=H)
    assert d.status_code == 200
    g = requests.get(f"{BASE}/api/projects/{pid}", headers=H)
    assert g.status_code == 404
