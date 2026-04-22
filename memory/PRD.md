# Singular Onboarding Console — PRD

## Original Problem Statement
Build a web app for **Singular Onboarding project management** plus a **Live Testing Console** for customers. Customers upload an APK, run validations against Singular's Testing Console API and Attribution Details API, and track structured onboarding plans (8 phases / 30+ tasks / 100+ checklist items). Visual style adapted from the provided Singular self-serve portal index.html.

## User Personas
- **Singular CSM** – manages multiple customer onboarding projects, owns checklist completion, tracks progress.
- **Solution Engineer** – performs SDK integration validation, runs APK live tests, verifies attribution.
- **Customer Technical Team** – uploads APKs, enters their SDK/API keys, validates events against their builds.

## Architecture
- **Backend**: FastAPI · MongoDB · Emergent Object Storage (APKs) · Emergent Google OAuth. Routes prefixed `/api`.
- **Frontend**: React 19 · React Router v7 · Tailwind · Shadcn/UI · Phosphor Icons.
- **Singular APIs**: Server-side proxies to `api.singular.net/api/v1/testing/start_session` and `api.singular.net/api/v1/attribution`.
- **APK Audit**: `/app/backend/apk_audit.py` — zipfile + pyaxmlparser; scans `classes*.dex` for `com/singular/sdk/*` signatures + `SDK_VERSION` constants; parses AndroidManifest.xml for permissions/package/version.

## Core Requirements
1. Google OAuth login, multi-project workspace per user.
2. Project tracker with 8 phases, Kanban + Table views, owner / status / priority / checklist per task.
3. APK upload (drag-drop, .apk/.aab) to object storage with static audit report.
4. Live Testing Console with terminal-style log feed against Singular Testing Console API.
5. Attribution verification panel against Singular Attribution Details API.
6. Per-project SDK key & API key save.
7. In-app guidance on how to use each Singular tool (Testing, Attribution, APK).

## Implemented (up to Feb 2026)
- Auth: `/api/auth/{session,me,logout}` with cookie + Bearer fallback.
- Projects: list / create (with 8-phase template) / get / delete / update keys.
- Tasks: status / priority / owner / comments + per-checklist-item toggle.
- APK upload → object storage + **static audit** (Singular SDK detection, version, permissions, findings list with pass/fail score). (Feb 2026)
- Singular proxies: `/singular/test-console`, `/singular/attribution` — graceful non-200 upstream stored as `ok=false` test_runs.
- Slack slash commands (`/singular projects|health|comments|help`) with link-token flow.
- Customer share links + two-way comments.
- Health score gauges, SE Copilot + Historical Import iframe embeds.
- **GuidancePanel** component on Testing / Attribution / APK tabs — 4 numbered steps each, auto-opens for new projects. (Feb 2026)
- **ApkAuditReport** component rendering per-file audit findings with pass/fail checklist. (Feb 2026)

## Testing
- iteration_1: 15/15 backend, 9/9 frontend.
- iteration_2: 16/16 backend (APK audit tests added), 11/11 frontend (guidance panels + audit report verified).

## Backlog
- **P1**: Real-time WebSocket stream for Testing Console (currently polled refresh).
- **P1**: Project sharing / multi-user collaboration on a single project.
- **P2**: Re-audit endpoint for APKs uploaded before Feb 2026 (existing records have no `audit` field).
- **P2**: Explicit upload size guard on `/api/projects/{id}/apk` before `file.read()`.
- **P2**: Return 404 from `DELETE /api/projects/{id}` when project not found.
- **P2**: Tighten `status_code` capture in `/singular/test-console` (sentinel pattern like attribution route).
- **P2**: Split `server.py` (~580 lines) into routers: auth / projects / apk / singular / slack.
- **P2**: Add `aria-describedby` / DialogDescription to New Project dialog (a11y).
- **P3**: Export onboarding plan to PDF / CSV.
- **P3**: Slack / email notification when a phase reaches 100%.
- **P3**: Templates library — onboarding plan presets per industry.

## Next Action Items
- Confirm with user whether to proceed with `server.py` router split or keep building features.
- Optionally implement re-audit for historical APKs.
