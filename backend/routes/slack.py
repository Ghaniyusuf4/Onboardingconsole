"""Slack slash-command + link-token routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from deps import db, get_current_user, verify_slack_signature
from health import compute_health

router = APIRouter()


def slack_response(text: str, blocks: Optional[list] = None, ephemeral: bool = True) -> dict:
    payload = {"response_type": "ephemeral" if ephemeral else "in_channel", "text": text}
    if blocks:
        payload["blocks"] = blocks
    return payload


async def find_project_for_user(user_id: str, query: str) -> Optional[dict]:
    q = (query or "").strip().lower()
    if not q:
        return None
    docs = await db.projects.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    for d in docs:
        if d["name"].lower() == q or (d.get("customer") or "").lower() == q:
            return d
    for d in docs:
        if q in d["name"].lower() or q in (d.get("customer") or "").lower():
            return d
    return None


@router.post("/slack/link-token")
async def create_slack_link_token(request: Request):
    user = await get_current_user(request)
    token = f"lnk_{uuid.uuid4().hex[:16]}"
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.slack_link_tokens.insert_one({
        "token": token, "user_id": user.user_id, "expires_at": expires,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"link_token": token, "expires_at": expires, "command": f"/singular link {token}"}


@router.get("/slack/links")
async def list_slack_links(request: Request):
    user = await get_current_user(request)
    docs = await db.slack_links.find({"user_id": user.user_id}, {"_id": 0}).to_list(50)
    return docs


@router.delete("/slack/links/{slack_user_id}")
async def unlink_slack(slack_user_id: str, request: Request):
    user = await get_current_user(request)
    await db.slack_links.delete_one({"user_id": user.user_id, "slack_user_id": slack_user_id})
    return {"ok": True}


@router.post("/slack/command")
async def slack_command(
    request: Request,
    x_slack_request_timestamp: str = Header(None),
    x_slack_signature: str = Header(None),
):
    raw = await request.body()
    if not verify_slack_signature(x_slack_request_timestamp or "", raw, x_slack_signature or ""):
        raise HTTPException(401, "Invalid Slack signature")
    form = await request.form()
    text = (form.get("text") or "").strip()
    slack_user_id = form.get("user_id") or ""
    slack_team_id = form.get("team_id") or ""
    parts = text.split(maxsplit=1)
    sub = (parts[0] if parts else "").lower()
    arg = parts[1] if len(parts) > 1 else ""

    if sub == "help" or sub == "":
        return JSONResponse(slack_response(
            "*Singular Onboarding Console — Slash Commands*\n"
            "• `/singular link <token>` — link your Slack account (get a token at /integrations)\n"
            "• `/singular projects` — list your projects with health scores\n"
            "• `/singular health <project>` — health breakdown for a project\n"
            "• `/singular comments <project>` — recent customer comments\n"
            "• `/singular help` — show this help"
        ))

    if sub == "link":
        if not arg:
            return JSONResponse(slack_response("Usage: `/singular link <token>` — generate a token at the Integrations page."))
        link = await db.slack_link_tokens.find_one({"token": arg.strip()}, {"_id": 0})
        if not link:
            return JSONResponse(slack_response(":x: Invalid or expired link token."))
        exp = link.get("expires_at")
        if exp:
            try:
                exp_dt = datetime.fromisoformat(exp)
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt < datetime.now(timezone.utc):
                    return JSONResponse(slack_response(":x: Link token expired. Generate a new one."))
            except Exception:
                pass
        await db.slack_links.update_one(
            {"slack_user_id": slack_user_id, "slack_team_id": slack_team_id},
            {"$set": {"slack_user_id": slack_user_id, "slack_team_id": slack_team_id,
                      "user_id": link["user_id"],
                      "linked_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        await db.slack_link_tokens.delete_one({"token": arg.strip()})
        return JSONResponse(slack_response(":white_check_mark: Slack account linked! Try `/singular projects`."))

    # require link for everything below
    link = await db.slack_links.find_one(
        {"slack_user_id": slack_user_id, "slack_team_id": slack_team_id}, {"_id": 0},
    )
    if not link:
        return JSONResponse(slack_response(
            ":lock: Your Slack account isn't linked yet. Visit the Integrations page in Singular Onboarding Console, generate a link token, then run `/singular link <token>`."
        ))
    user_id = link["user_id"]

    if sub == "projects":
        docs = await db.projects.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        if not docs:
            return JSONResponse(slack_response("No projects yet."))
        runs = await db.test_runs.find(
            {"user_id": user_id}, {"_id": 0, "project_id": 1, "kind": 1, "ok": 1},
        ).to_list(5000)
        apks = await db.apk_uploads.find(
            {"user_id": user_id}, {"_id": 0, "project_id": 1, "audit": 1, "uploaded_at": 1},
        ).to_list(2000)
        lines = []
        for d in docs:
            h = compute_health(d, runs, apks=apks)
            grade_emoji = {"A": ":star:", "B": ":large_blue_circle:", "C": ":blue_heart:",
                           "D": ":orange_heart:", "F": ":red_circle:"}.get(h["grade"], ":white_circle:")
            lines.append(
                f"{grade_emoji} *{d['name']}* — {h['score']}/100 ({h['grade']}) · "
                f"{h['tasks_closed']}/{h['tasks_total']} tasks · {d.get('customer','—')}"
            )
        return JSONResponse(slack_response("*Your Onboarding Projects*\n" + "\n".join(lines)))

    if sub in ("health", "comments"):
        if not arg:
            return JSONResponse(slack_response(f"Usage: `/singular {sub} <project name or customer>`"))
        proj = await find_project_for_user(user_id, arg)
        if not proj:
            return JSONResponse(slack_response(f":mag: No project matching '{arg}'. Try `/singular projects`."))

        if sub == "health":
            runs = await db.test_runs.find({"project_id": proj["id"]}, {"_id": 0}).to_list(2000)
            apks = await db.apk_uploads.find({"project_id": proj["id"]}, {"_id": 0}).to_list(500)
            h = compute_health(proj, runs, detailed=True, apks=apks)
            blocks_text = "\n".join(
                f"• {b['label']} · {b['weight']}% → *{b['value']}*"
                + (f" _{b['note']}_" if b.get("note") else "")
                for b in h["breakdown"]
            )
            return JSONResponse(slack_response(
                f"*{proj['name']}* — Health *{h['score']}/100* ({h['grade']})\n"
                f"Tasks: {h['tasks_closed']}/{h['tasks_total']} · Blocked: {h['blocked']}\n"
                f"\n*Breakdown*\n{blocks_text}"
            ))

        # comments
        comments = await db.task_comments.find(
            {"project_id": proj["id"]}, {"_id": 0},
        ).sort("created_at", -1).to_list(10)
        if not comments:
            return JSONResponse(slack_response(f"No customer comments yet for *{proj['name']}*."))
        title_by_id = {t["id"]: t["title"] for p in proj.get("phases", []) for t in p.get("tasks", [])}
        unread = sum(1 for c in comments if not c.get("read"))
        lines = [f"*{proj['name']}* — {len(comments)} recent comment(s) · {unread} unread"]
        for c in comments[:5]:
            mark = ":envelope:" if not c.get("read") else ":envelope_with_arrow:"
            tt = title_by_id.get(c["task_id"], "(unknown task)")
            body = c["body"][:200] + ("…" if len(c["body"]) > 200 else "")
            lines.append(f"\n{mark} *{c['author_name']}* on _{tt}_\n> {body}")
        return JSONResponse(slack_response("\n".join(lines)))

    return JSONResponse(slack_response(f"Unknown command `{sub}`. Try `/singular help`."))
