"""Scheduled background jobs — deadline reminders and Go Live countdowns.

Runs inside the FastAPI process via APScheduler AsyncIOScheduler.
Jobs fire once daily at 9 AM UTC.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")

REMINDER_DAYS = [7, 3, 1]          # Days before due date to send action item reminders
GO_LIVE_DAYS = [14, 7, 3]          # Days before Go Live to send countdown summaries
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


@scheduler.scheduled_job("cron", hour=9, minute=0, id="deadline_reminders")
async def send_deadline_reminders() -> None:
    """Send email + Slack reminders for action items due in 1, 3, or 7 days."""
    from deps import db
    from email_service import send_deadline_reminder
    from routes.slack import send_contact_alert

    now = datetime.now(timezone.utc)
    sent = 0

    for days in REMINDER_DAYS:
        target_date = (now + timedelta(days=days)).date().isoformat()
        items = await db.action_items.find(
            {"due_date": {"$regex": f"^{target_date}"}, "status": {"$ne": "done"}},
            {"_id": 0},
        ).to_list(500)

        for item in items:
            contact_id = item.get("assigned_to_contact_id")
            if not contact_id:
                continue
            contact = await db.customer_contacts.find_one({"contact_id": contact_id}, {"_id": 0})
            if not contact:
                continue
            project = await db.projects.find_one(
                {"id": item["project_id"]}, {"_id": 0, "name": 1, "share_token": 1}
            )
            if not project:
                continue
            share_token = project.get("share_token")
            share_url = f"{FRONTEND_URL}/share/{share_token}" if share_token else None

            try:
                await send_deadline_reminder(
                    contact_email=contact["email"],
                    contact_name=contact["name"],
                    item_title=item["title"],
                    days_until_due=days,
                    project_name=project["name"],
                    share_url=share_url,
                )
                sent += 1
            except Exception as e:
                logger.error("Email reminder failed for item %s: %s", item["item_id"], e)

            try:
                await send_contact_alert(
                    contact=contact,
                    project_name=project["name"],
                    item_title=item["title"],
                    due_date=item.get("due_date"),
                    share_url=share_url,
                    is_reminder=True,
                    days_until_due=days,
                )
            except Exception as e:
                logger.error("Slack reminder failed for item %s: %s", item["item_id"], e)

    logger.info("Deadline reminder job complete — %d emails sent", sent)


@scheduler.scheduled_job("cron", hour=8, minute=0, id="go_live_countdowns")
async def send_go_live_countdowns() -> None:
    """Send Go Live countdown summaries to all contacts on projects approaching Go Live."""
    from deps import db
    from email_service import send_go_live_summary

    now = datetime.now(timezone.utc)
    sent = 0

    for days in GO_LIVE_DAYS:
        target_date = (now + timedelta(days=days)).date().isoformat()
        projects = await db.projects.find(
            {"go_live_date": {"$regex": f"^{target_date}"}},
            {"_id": 0, "id": 1, "name": 1, "go_live_date": 1, "share_token": 1},
        ).to_list(200)

        for project in projects:
            project_id = project["id"]
            contacts = await db.customer_contacts.find(
                {"project_id": project_id}, {"_id": 0}
            ).to_list(50)
            if not contacts:
                continue

            open_items = await db.action_items.find(
                {"project_id": project_id, "status": {"$ne": "done"}},
                {"_id": 0, "title": 1, "priority": 1, "due_date": 1},
            ).sort("due_date", 1).to_list(20)

            share_token = project.get("share_token")
            share_url = f"{FRONTEND_URL}/share/{share_token}" if share_token else None

            for contact in contacts:
                try:
                    await send_go_live_summary(
                        contact_email=contact["email"],
                        contact_name=contact["name"],
                        project_name=project["name"],
                        go_live_date=project["go_live_date"],
                        days_until_go_live=days,
                        open_items=open_items,
                        share_url=share_url,
                    )
                    sent += 1
                except Exception as e:
                    logger.error("Go Live summary failed for %s: %s", contact["email"], e)

    logger.info("Go Live countdown job complete — %d emails sent", sent)


def start() -> None:
    scheduler.start()
    logger.info("APScheduler started — deadline reminders at 09:00 UTC, Go Live countdowns at 08:00 UTC")


def stop() -> None:
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")
