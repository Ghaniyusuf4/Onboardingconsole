# Singular Onboarding Console — PRD

## Original Problem Statement
Build a web app for **Singular Onboarding project management** plus a **Live Testing Console** for customers. Customers upload an APK, run validations against Singular's Testing Console API and Attribution Details API, and track structured onboarding plans (8 phases / 30+ tasks / 100+ checklist items). Visual style adapted from the provided Singular self-serve portal index.html.

## User Personas
- **Singular CSM** – manages multiple customer onboarding projects, owns checklist completion, tracks progress.
- **Solution Engineer** – performs SDK integration validation, runs APK live tests, verifies attribution.
- **Customer Technical Team** – uploads APKs, enters their SDK/API keys, validates events against their builds.

## Architecture
- **Backend**: FastAPI · MongoDB · Emergent Object Storage (APKs) · Emergent-managed Google OAuth (sessions in mongo with httpOnly cookie + Bearer fallback). Routes prefixed `/api`.
- **Frontend**: React 19 · React Router v7 · Tailwind · Shadcn/UI · Phosphor Icons. Fonts: Chivo (display) / IBM Plex Sans (body) / JetBrains Mono (terminal).
- **Singular APIs**: Server-side proxies to `api.singular.net/api/v1/testing/start_session` and `api.singular.net/api/v1/attribution`.

## Core Requirements (Static)
1. Google OAuth login, multi-project workspace per user.
2. Project tracker with 8 phases (Platform Setup → Configure Apps → Data Import & SDK → SAN Partner Config → Reporting → Data Output & Erasure → Historical Import → SKAN & Launch). Kanban + Table views, owner / status / priority / checklist per task.
3. APK upload (drag-drop, .apk/.aab) to object storage, listed per project.
4. Live Testing Console with terminal-style log feed against Singular Testing Console API.
5. Attribution verification panel against Singular Attribution Details API with platform / device-id-type selector.
6. Per-project SDK key & API key save.

## Implemented (Feb 2026)
- Auth: `/api/auth/{session,me,logout}` + cookie + Bearer fallback.
- Projects: list / create (with full template) / get / delete / update keys.
- Tasks: status / priority / owner / comments updates; per-checklist-item toggle.
- APK upload to Emergent Object Storage with metadata in mongo.
- Singular proxies (test-console + attribution) — failures recorded as `ok=false` test_runs (no 500s).
- UI: login split-screen, dashboard projects grid with progress bars, project detail with 5 tabs (Overview / Tracker / Testing / Attribution / APK Uploads).
- Testing agent: 15/15 backend + 9/9 frontend flows passed.

## Backlog
- **P1**: Real-time WebSocket stream for Testing Console logs (currently polled refresh).
- **P1**: Project sharing / multi-user collaboration on a single project.
- **P2**: Server-side APK static analysis (parse AndroidManifest.xml for Singular SDK presence + version).
- **P2**: Export onboarding plan to PDF / CSV for handoff to customer exec teams.
- **P2**: Slack / email notification when a phase reaches 100%.
- **P3**: Templates library — multiple onboarding plan presets per industry.

## Next Action Items
- Optional polish (DELETE 404, dialog a11y description) flagged by testing agent.
- Wire WebSocket streaming for Testing Console once Singular streaming endpoint confirmed.
