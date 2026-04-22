# Singular Onboarding Console — PRD

## Original Problem Statement
Build a web app for **Singular Onboarding project management** plus a **Live Testing Console** for customers. Customers upload an APK, run validations against Singular's Testing Console API and Attribution Details API, and track structured onboarding plans (8 phases / 30+ tasks / 100+ checklist items).

## User Personas
- **Singular CSM** – manages multiple customer onboarding projects, owns checklist completion.
- **Solution Engineer** – performs SDK integration validation, runs APK live tests, verifies attribution.
- **Customer Technical Team** – uploads APKs, enters SDK/API keys, validates events against their builds.

## Architecture
- **Backend**: FastAPI · MongoDB · Emergent Object Storage · Emergent-managed Google OAuth. Routes prefixed `/api`.
  - Modular layout (as of Feb 2026 refactor):
    - `server.py` (54 lines) — entrypoint: mounts routers + CORS + lifecycle.
    - `deps.py` — Mongo client, `get_current_user`, object-storage helpers, Slack signature.
    - `models.py` — Pydantic models.
    - `health.py` — `compute_health`.
    - `template.py` — 8-phase onboarding template.
    - `apk_audit.py` — static APK/AAB audit (zipfile + pyaxmlparser + DEX scan).
    - `routes/auth.py · projects.py · apk.py · singular.py · slack.py` — feature routers.
- **Frontend**: React 19 · React Router v7 · Tailwind · Shadcn/UI · Phosphor Icons.
- **Singular APIs**: Server-side proxies to `api.singular.net/api/v1/testing/start_session` and `.../attribution`.

## Core Requirements
1. Google OAuth login, multi-project workspace per user.
2. 8-phase tracker, Kanban + Table views, owner / status / priority / checklist per task.
3. APK upload (drag-drop, .apk/.aab) to object storage with static audit.
4. Live Testing Console against Singular Testing Console API.
5. Attribution verification against Singular Attribution Details API.
6. Per-project SDK / API key storage.
7. In-app guidance panels on Testing / Attribution / APK tabs.
8. APK-audit signal wired into project health score (10% weight).

## Implementation Timeline
- **Initial MVP**: auth, projects, tasks, comments, share links, Slack commands, iframe embeds, health gauges.
- **Feb 2026 wave 1**: APK/AAB static audit (Singular SDK detection + version + permissions) + `GuidancePanel` + `ApkAuditReport`.
- **Feb 2026 wave 2**: APK-audit signal folded into health score (new 10% weight row, tracker `apk-verified-badge` on SDK Basic Integration).
- **Feb 2026 wave 3**: `server.py` refactor into routers + `POST /api/projects/{id}/apks/{id}/re-audit` + `POST /api/projects/{id}/apks/re-audit-missing` (bulk) + frontend "Re-audit older uploads" button. DELETE `/projects/{id}` now returns 404 on missing. `test-console` status_code capture tightened.

## Testing
- iter_1: 15/15 backend + 9/9 frontend.
- iter_2: 16/16 backend + 11/11 frontend (APK audit + guidance panels).
- iter_3: 19/19 backend + 11/11 frontend (health-score APK signal).
- iter_4: 25/25 backend + all frontend (refactor + re-audit).

## Backlog
- **P1**: Real-time WebSocket streaming for Testing Console logs.
- **P1**: Project sharing / multi-user collaboration on a single project.
- **P2**: `re-audit-missing` returns 404 when project unknown (currently 200 with zero counters).
- **P2**: Upload size guard before `await file.read()` on `/apk`.
- **P2**: DialogDescription / aria-describedby on New Project dialog.
- **P2**: Per-row "Re-auditing…" spinner on APK rows.
- **P3**: PDF/CSV export of onboarding plan.
- **P3**: Slack / email notification when a phase hits 100%.
- **P3**: Industry-specific onboarding templates library.

## Next Action Items
- Decide whether to ship P2 polish or move on to P1 WebSocket streaming.

## Test credentials / ops
- Auth: Emergent-managed Google OAuth. Test sessions seeded via mongosh per `/app/auth_testing.md`.
- `/app/memory/test_credentials.md` lists seed process.
- Singular keys: user-provided per project; upstream 4xx is persisted as `ok=false` test_runs (expected behaviour).
