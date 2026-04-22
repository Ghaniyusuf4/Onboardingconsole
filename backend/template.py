"""Default 8-phase onboarding plan applied to new projects."""
from __future__ import annotations

from typing import List

from models import ChecklistItem, Phase, Task


def build_default_phases() -> List[Phase]:
    template = [
        ("Platform Setup", "Account provisioning and team access", [
            ("Singular Account Provisioning", "Singular", "high", ["Team Management defined", "Agency Access defined"]),
            ("Analytics Data Connectors", "Solution Engineer", "high", ["Data connector alerts wired to Slack"]),
        ]),
        ("Configure Your Apps", "Verify app setup", [
            ("Verify setup in Apps page", "CSM", "high", ["App package names verified", "Bundle IDs verified"]),
        ]),
        ("Data Import & SDK Setup", "Historical import and SDK integration", [
            ("Device-Level Historical Data Import", "Solution Engineer", "high", ["File spec aligned", "Initial QA file delivered", "Delta file post-integration"]),
            ("SDK Documentation Review", "Solution Engineer", "medium", ["Requirements gathered"]),
            ("SDK Basic Integration", "Solution Engineer", "high", [
                "Sessions trigger validated via SDK console",
                "Install and Attribution validated via Export Logs",
                "Custom User ID method validated",
                "Revenue/IAP receipt events validated",
                "Deep Link & Deferred Deeplink callbacks validated",
                "SKAdNetwork SDK parameters validated",
                "Uninstall tracking & Global properties validated",
                "SDK QA across versions 4.2-4.11",
                "Google Play License Key added",
                "Push notifications session start logs",
                "Referral tracking validated",
                "Meta App ID configuration validated",
                "Tech enablement flag removed",
                "First app launch after Play Store live",
            ]),
        ]),
        ("SAN Partner Configuration", "Self-attributing networks setup", [
            ("Facebook (coordinated event switch)", "CSM", "high", ["Events imported for SKAN", "Advanced AEM setup"]),
            ("Google AdWords", "CSM", "high", ["AppsFlyer vs Singular numbers consistent", "AF vs Firebase discrepancy ratio consistent"]),
            ("Snapchat (coordinated event switch)", "CSM", "medium", ["Account linked", "Events mapped"]),
            ("Twitter", "CSM", "medium", ["Account linked"]),
            ("Apple Search Ads", "CSM", "medium", ["Account linked", "Token validated"]),
        ]),
        ("Reporting & Partner Configurations", "QA reports and dashboards", [
            ("SAN Configuration QA", "CSM", "high", ["KPI events mapped 24h after SDK trigger", "Custom dimensions defined"]),
            ("Configure Campaign Report", "CSM", "medium", ["Saved in Analytics > Pivot/Reports", "Dimensions/metrics validated with POC"]),
            ("Configure Creative Report", "Singular", "medium", ["Saved in Analytics > Creatives"]),
            ("Configure Dashboard", "Singular", "medium", ["Saved in Dashboards"]),
            ("Audiences", "CSM", "low", ["Partners list shared for Audience segments"]),
            ("Fraud Global Rules", "CSM", "low", ["Rules reviewed for app applicability"]),
            ("Fraud Custom Rules", "CSM", "low", ["City-level tracker data", "QR codes created", "Partner configs for all networks"]),
        ]),
        ("Data Output & Erasure", "GDPR and ETL setup", [
            ("Implement GDPR Erasure Mechanism", "Solution Engineer", "high", ["Partner configs created", "Validated via Export Logs"]),
            ("Configure ETL Data Destination", "Solution Engineer", "medium", ["Validated via support script"]),
            ("Reverse ETL Configuration", "Solution Engineer", "low", ["Destination wired", "Mappings validated"]),
        ]),
        ("Device-Level Historical Import", "File ingestion processing", [
            ("Historical Import File Provided", "Solution Engineer", "low", ["Document delivered", "Validated via ingestion techniques"]),
            ("Historical Import Processing", "Singular", "low", ["Job triggered", "Results validated"]),
        ]),
        ("SKAN Setup & Campaign Launch", "iOS SKAN model and launch", [
            ("SKAN Setup", "CSM", "low", ["AppsFlyer SKAN model shared", "Singular reviewed with POC"]),
            ("Configure SKAN model", "CSM", "low", ["Campaign setup expectations reviewed"]),
            ("Campaign Launch", "Customer", "low", ["Campaigns launched on SAN networks", "SAN attribution data validated"]),
        ]),
    ]
    phases: List[Phase] = []
    for i, (pname, pdesc, tasks) in enumerate(template):
        phase = Phase(name=pname, description=pdesc, order=i)
        for tname, owner, priority, items in tasks:
            t = Task(title=tname, owner=owner, priority=priority, status="open",
                     checklist=[ChecklistItem(label=lbl) for lbl in items])
            phase.tasks.append(t)
        phases.append(phase)
    return phases
