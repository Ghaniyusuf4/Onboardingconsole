"""Email notification service — sends transactional emails via Resend."""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@singular.net")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def _resend_client():
    import resend
    resend.api_key = RESEND_API_KEY
    return resend


def _format_date(iso_date: Optional[str]) -> str:
    if not iso_date:
        return "No deadline set"
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y")
    except Exception:
        return iso_date


async def send_action_item_assigned(
    contact_email: str,
    contact_name: str,
    item_title: str,
    due_date: Optional[str],
    project_name: str,
    share_url: Optional[str] = None,
) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", contact_email)
        return

    due_str = _format_date(due_date)
    share_link_html = (
        f'<p><a href="{share_url}" style="color:#f97316;">View project status →</a></p>'
        if share_url else ""
    )

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#f97316;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Singular Onboarding</h1>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>Hi {contact_name},</p>
        <p>A new action item has been assigned to you as part of your onboarding for <strong>{project_name}</strong>.</p>
        <div style="background:#f9fafb;border-left:4px solid #f97316;padding:16px 20px;margin:24px 0;border-radius:4px;">
          <p style="margin:0 0 8px;font-weight:600;">{item_title}</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">Due: {due_str}</p>
        </div>
        <p>Please complete this item before the due date to keep your onboarding on track.</p>
        {share_link_html}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;">
          This message was sent by your Singular Solutions Engineer.
          If you have questions, reply to this email.
        </p>
      </div>
    </div>
    """

    try:
        r = _resend_client()
        r.Emails.send({
            "from": FROM_EMAIL,
            "to": [contact_email],
            "subject": f"Action required: {item_title} — {project_name} onboarding",
            "html": html,
        })
        logger.info("Sent assignment email to %s for item '%s'", contact_email, item_title)
    except Exception as e:
        logger.error("Failed to send assignment email: %s", e)
        raise


async def send_deadline_reminder(
    contact_email: str,
    contact_name: str,
    item_title: str,
    days_until_due: int,
    project_name: str,
    share_url: Optional[str] = None,
) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping reminder to %s", contact_email)
        return

    urgency = "Today is the deadline" if days_until_due <= 0 else (
        "Tomorrow is the deadline" if days_until_due == 1 else
        f"{days_until_due} days remaining"
    )
    share_link_html = (
        f'<p><a href="{share_url}" style="color:#f97316;">View project status →</a></p>'
        if share_url else ""
    )

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#dc2626;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Action Item Reminder — {urgency}</h1>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>Hi {contact_name},</p>
        <p>This is a reminder that the following action item for <strong>{project_name}</strong> is due soon.</p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;margin:24px 0;border-radius:4px;">
          <p style="margin:0 0 8px;font-weight:600;">{item_title}</p>
          <p style="margin:0;color:#dc2626;font-size:14px;font-weight:600;">{urgency}</p>
        </div>
        <p>Please complete or update the status of this item to keep your onboarding on track.</p>
        {share_link_html}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;">
          Sent by Singular Onboarding Console · <a href="{FRONTEND_URL}" style="color:#9ca3af;">Visit console</a>
        </p>
      </div>
    </div>
    """

    try:
        r = _resend_client()
        r.Emails.send({
            "from": FROM_EMAIL,
            "to": [contact_email],
            "subject": f"Reminder: '{item_title}' — {urgency}",
            "html": html,
        })
        logger.info("Sent reminder email to %s (%d days)", contact_email, days_until_due)
    except Exception as e:
        logger.error("Failed to send reminder email: %s", e)
        raise


async def send_go_live_summary(
    contact_email: str,
    contact_name: str,
    project_name: str,
    go_live_date: str,
    days_until_go_live: int,
    open_items: list,
    share_url: Optional[str] = None,
) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping go-live summary to %s", contact_email)
        return

    date_str = _format_date(go_live_date)
    items_html = "".join(
        f'<li style="margin-bottom:6px;">{item.get("title","")}'
        f' <span style="color:#6b7280;font-size:12px;">({item.get("priority","medium")} priority)</span></li>'
        for item in open_items[:10]
    ) or "<li>All action items complete!</li>"

    share_link_html = (
        f'<p><a href="{share_url}" style="color:#f97316;">View full project status →</a></p>'
        if share_url else ""
    )

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#f97316;margin:0;font-size:20px;">Go Live in {days_until_go_live} days — {project_name}</h1>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>Hi {contact_name},</p>
        <p>Your Singular integration Go Live date is <strong>{date_str}</strong> — {days_until_go_live} days away.</p>
        <p style="font-weight:600;">Open action items:</p>
        <ul style="padding-left:20px;line-height:1.8;">{items_html}</ul>
        {share_link_html}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="font-size:12px;color:#9ca3af;">
          Sent by Singular Onboarding Console · <a href="{FRONTEND_URL}" style="color:#9ca3af;">Visit console</a>
        </p>
      </div>
    </div>
    """

    try:
        r = _resend_client()
        r.Emails.send({
            "from": FROM_EMAIL,
            "to": [contact_email],
            "subject": f"Go Live in {days_until_go_live} days — {project_name} · {date_str}",
            "html": html,
        })
        logger.info("Sent Go Live summary email to %s (%d days)", contact_email, days_until_go_live)
    except Exception as e:
        logger.error("Failed to send Go Live summary: %s", e)
        raise
