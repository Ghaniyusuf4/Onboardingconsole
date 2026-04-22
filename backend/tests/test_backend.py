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
def test_apk_upload_list(project_id):
    files = {"file": ("test.apk", io.BytesIO(b"PK\x03\x04fakeapk"), "application/vnd.android.package-archive")}
    r = requests.post(f"{BASE}/api/projects/{project_id}/apk", headers=H, files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["size"] > 0 and d["storage_path"] and d["id"]
    l = requests.get(f"{BASE}/api/projects/{project_id}/apks", headers=H)
    assert l.status_code == 200
    assert any(a["id"] == d["id"] for a in l.json())

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
