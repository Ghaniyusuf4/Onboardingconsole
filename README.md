# Singular Onboarding Console

A full-stack web app for managing **Singular customer onboarding projects** with an integrated **Live Testing Console**, APK static audit, attribution verification, and Slack slash-command integration.

<p align="center">
  <img src="frontend/public/singular-logo.svg" height="48" alt="Singular" />
</p>

---

## Features

- Multi-tenant onboarding workspace (Google OAuth)
- 8-phase project tracker · Kanban + Table views · per-task checklist
- **APK / AAB static audit** — detects Singular SDK classes, version, required manifest permissions
- **Live Testing Console** — server-side proxy to `api.singular.net/api/v1/testing/start_session`
- **Attribution verification** — server-side proxy to `api.singular.net/api/v1/attribution`
- **Re-audit endpoints** — single + bulk re-scan of previously uploaded APKs
- Weighted project **health score** (phase progress / SDK test / attribution / APK audit / blocked penalty)
- Customer-facing share links + two-way comments
- Slack slash commands (`/singular projects | health | comments | help`)
- In-app guidance panels on every Singular-integration tab

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19 · React Router v7 · Tailwind · Shadcn/UI · Phosphor Icons |
| Backend | FastAPI · Motor (async Mongo) · pyaxmlparser · requests |
| Database | MongoDB |
| Storage | Emergent Object Storage (APK binaries) — replaceable with S3 / R2 |
| Auth | Emergent-managed Google OAuth — replaceable with Google Cloud OAuth |

---

## Project layout

```
app/
├── backend/
│   ├── server.py           # FastAPI entrypoint (~54 lines)
│   ├── deps.py             # Mongo client, auth, storage, slack signature
│   ├── models.py           # Pydantic models
│   ├── health.py           # compute_health()
│   ├── template.py         # 8-phase onboarding template
│   ├── apk_audit.py        # APK / AAB static analyzer
│   ├── routes/
│   │   ├── auth.py         # /api/auth/*
│   │   ├── projects.py     # /api/projects/* + share links + comments
│   │   ├── apk.py          # /api/projects/{id}/apk + re-audit
│   │   ├── singular.py     # /api/singular/test-console + /api/singular/attribution
│   │   └── slack.py        # /api/slack/*
│   ├── tests/              # pytest suite
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Tracker, TestingConsole, Attribution, ApkUpload, HealthGauge, etc.
│   │   ├── pages/          # Login · Dashboard · ProjectDetail · PublicShare · Integrations
│   │   └── lib/api.js      # Axios instance (reads REACT_APP_BACKEND_URL)
│   ├── package.json
│   └── .env.example
└── memory/
    └── PRD.md              # Product requirements + changelog
```

---

## Local development

### 1. Prerequisites
- Python ≥ 3.10
- Node ≥ 18 + Yarn
- MongoDB ≥ 6 (local install, Docker, or MongoDB Atlas)

### 2. Clone + install
```bash
git clone https://github.com/Ghaniyusuf4/Onboardingconsole
cd Onboardingconsole

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

### 3. Environment files
Copy the examples and fill in values:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
See each file for required variables (Mongo, Google OAuth, object storage, etc.).

### 4. Run

```bash
# Terminal 1 — backend
cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 — frontend
cd frontend && yarn start
```

Open http://localhost:3000.

### 5. Tests
```bash
cd backend && pytest tests/ -v
```

---

## API reference (selection)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/session` | Exchange Google session-id → app token |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/projects` | List projects with health scores |
| `POST` | `/api/projects` | Create project (8-phase template) |
| `GET` | `/api/projects/{id}/health` | Detailed health breakdown |
| `POST` | `/api/projects/{id}/apk` | Upload .apk/.aab → audited & stored |
| `POST` | `/api/projects/{id}/apks/{apk_id}/re-audit` | Re-run static audit on one APK |
| `POST` | `/api/projects/{id}/apks/re-audit-missing` | Bulk re-audit uploads without findings |
| `POST` | `/api/singular/test-console` | Proxy to Singular start_session |
| `POST` | `/api/singular/attribution` | Proxy to Singular Attribution Details |
| `POST` | `/api/projects/{id}/share` | Create customer share link |
| `POST` | `/api/slack/command` | Slack slash-command dispatcher |

---

## Migrating off Emergent

This repo was originally built on the Emergent platform. To run it standalone:

| Originally | Replace with |
|---|---|
| Emergent-managed Google OAuth | Your own Google Cloud OAuth client (Client ID + Secret) |
| Emergent LLM key | Direct provider key (Anthropic / OpenAI / Gemini) |
| Emergent Object Storage | AWS S3 · Cloudflare R2 · Supabase Storage · local disk |

The server-side storage layer lives in `backend/deps.py` (`put_object` / `get_object`). Swap these two helpers to your storage provider of choice — the rest of the code is unchanged.

---

## Continuing development with Claude

```bash
pip install anthropic
```
```python
from anthropic import Anthropic
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
msg = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "…"}],
)
```

Get an API key at https://console.anthropic.com.

---

## License

Proprietary — for Singular customers & partners.
