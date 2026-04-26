import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Share, Copy, Trash, House, Kanban, Lightning, Robot, Target, Package, Database, ChatCircleDots, ListChecks, Clock, ArrowUpRight, Users, CheckSquare } from "@phosphor-icons/react";
import { toast } from "sonner";
import Tracker from "@/components/Tracker";
import TestingConsole from "@/components/TestingConsole";
import Attribution from "@/components/Attribution";
import ApkUpload from "@/components/ApkUpload";
import Overview from "@/components/Overview";
import CommentsTab from "@/components/CommentsTab";
import SECopilot from "@/components/SECopilot";
import HistoricalImport from "@/components/HistoricalImport";
import HealthGauge, { HealthBreakdown } from "@/components/HealthGauge";
import SingularLogo from "@/components/SingularLogo";
import GoLiveBanner from "@/components/GoLiveBanner";
import ContactsTab from "@/components/ContactsTab";
import ActionItemsTab from "@/components/ActionItemsTab";

const TAB_META = {
  overview:     { label: "Overview",          Icon: House,          color: "#3088F4" },
  tracker:      { label: "Tracker",           Icon: Kanban,         color: "#0F3384" },
  contacts:     { label: "Contacts",          Icon: Users,          color: "#059669" },
  actions:      { label: "Action Items",      Icon: CheckSquare,    color: "#f97316" },
  testing:      { label: "Live Testing",      Icon: Lightning,      color: "#03C1FF" },
  copilot:      { label: "SE Co-Pilot",       Icon: Robot,          color: "#7C3AED", badge: "AI" },
  attribution:  { label: "Attribution",       Icon: Target,         color: "#1FA168" },
  apk:          { label: "APK Uploads",       Icon: Package,        color: "#C77A00" },
  import:       { label: "Historical Import", Icon: Database,       color: "#0077A8" },
  comments:     { label: "Comments",          Icon: ChatCircleDots, color: "#FFB400" },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [health, setHealth] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [unread, setUnread] = useState(0);
  const [commentCounts, setCommentCounts] = useState({});

  const reload = async () => {
    const [pr, hr, cr] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/health`),
      api.get(`/projects/${id}/comments`),
    ]);
    setProject(pr.data);
    setHealth(hr.data);
    setShareToken(pr.data.share_token || null);
    setUnread(cr.data.unread || 0);
    const counts = {};
    for (const c of cr.data.comments || []) {
      counts[c.task_id] = (counts[c.task_id] || 0) + 1;
    }
    setCommentCounts(counts);
  };
  useEffect(() => { reload(); }, [id]);

  const createShare = async () => {
    const r = await api.post(`/projects/${id}/share`);
    setShareToken(r.data.share_token);
    toast.success("Share link created");
  };
  const revokeShare = async () => {
    await api.delete(`/projects/${id}/share`);
    setShareToken(null);
    toast.success("Share link revoked");
  };
  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : "";
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };

  if (!project) return <div className="py-12 text-[var(--sg-fg-3)] text-sm">Loading project…</div>;

  const total = project.phases.reduce((s, p) => s + p.tasks.length, 0);
  const closed = project.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "closed").length, 0);
  const blocked = project.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "blocked").length, 0);
  const inProgress = project.phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "in_progress").length, 0);
  const pct = total ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="py-6 space-y-6" data-testid="project-detail-page">
      <header className="project-hero panel p-6 lg:p-8 relative overflow-hidden">
        {/* Decorative animated watermark */}
        <div className="hero-watermark" aria-hidden="true">
          <SingularLogo height={420} color="#3088F4" />
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-dot orbit-dot-1" />
          <span className="orbit-dot orbit-dot-2" />
          <span className="orbit-dot orbit-dot-3" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--sg-fg-3)] hover:text-[var(--sg-blue)] font-semibold uppercase tracking-wider" data-testid="back-to-dashboard">
              <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> Projects
            </Link>
            <button onClick={() => setShareOpen(true)} className="button button-soft h-9" data-testid="share-button">
              <Share weight="bold" className="w-4 h-4" />
              {shareToken ? "Manage Share Link" : "Share with Customer"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-orange uppercase">{project.platform}</span>
                  <span className="badge badge-neutral">{project.customer || "No customer"}</span>
                </div>
                <h1 className="font-display font-black text-3xl lg:text-5xl tracking-tight text-[var(--sg-fg)] leading-[1.05]">{project.name}</h1>
                <p className="text-sm text-[var(--sg-fg-2)] mt-2">Onboarding · SDK validation · Attribution verification</p>
              </div>

              {/* Quick stats strip */}
              <div className="hero-stats mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="hero-stat">
                  <ListChecks weight="bold" className="w-3.5 h-3.5" style={{ color: "#1FA168" }} />
                  <span className="hs-num">{closed}<span className="hs-sub">/{total}</span></span>
                  <span className="hs-label">Closed</span>
                </div>
                <div className="hero-stat">
                  <Clock weight="bold" className="w-3.5 h-3.5" style={{ color: "#03C1FF" }} />
                  <span className="hs-num">{inProgress}</span>
                  <span className="hs-label">In progress</span>
                </div>
                <div className="hero-stat">
                  <Lightning weight="bold" className="w-3.5 h-3.5" style={{ color: "#FFB400" }} />
                  <span className="hs-num">{project.phases.length}</span>
                  <span className="hs-label">Phases</span>
                </div>
                <div className="hero-stat">
                  <ArrowUpRight weight="bold" className="w-3.5 h-3.5" style={{ color: blocked ? "var(--sg-error)" : "var(--sg-fg-3)" }} />
                  <span className="hs-num">{blocked}</span>
                  <span className="hs-label">Blocked</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <GoLiveBanner project={project} onUpdated={reload} />
              {health && (
                <div className="panel-soft p-5">
                  <div className="flex items-center justify-between">
                    <HealthGauge score={health.score} grade={health.grade} size={100} label="Onboarding Health" />
                    <span className="badge badge-orange">Health Score</span>
                  </div>
                  <HealthBreakdown breakdown={health.breakdown || []} blocked={health.blocked} />
                </div>
              )}
              <div className="status-progress">
                <div className="status-progress-head">
                  <div>
                    <strong className="font-display text-[var(--sg-fg)]">Overall completion</strong>
                    <p className="text-xs text-[var(--sg-fg-3)] mt-0.5">{closed}/{total} tasks closed</p>
                  </div>
                  <span className="progress-pill">{pct}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full project-tabs">
        <TabsList className="proj-tablist">
          {Object.entries(TAB_META).map(([value, m]) => (
            <TabsTrigger
              key={value}
              data-testid={`tab-${value}`}
              value={value}
              className="proj-tab"
              style={{ "--tab-color": m.color }}
            >
              <m.Icon weight="fill" className="proj-tab-icon" />
              <span>{m.label}</span>
              {m.badge && <span className="proj-tab-badge">{m.badge}</span>}
              {value === "comments" && unread > 0 && (
                <span className="proj-tab-badge" style={{ background: "var(--sg-error)", color: "white" }} data-testid="comments-unread-badge">{unread}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="proj-tab-content"><Overview project={project} /></TabsContent>
        <TabsContent value="tracker" className="proj-tab-content"><Tracker project={project} reload={reload} commentCounts={commentCounts} apkAudit={{ detected: health?.apk_sdk_detected, version: health?.apk_sdk_version }} /></TabsContent>
        <TabsContent value="contacts" className="proj-tab-content"><ContactsTab project={project} /></TabsContent>
        <TabsContent value="actions" className="proj-tab-content"><ActionItemsTab project={project} /></TabsContent>
        <TabsContent value="testing" className="proj-tab-content"><TestingConsole project={project} /></TabsContent>
        <TabsContent value="copilot" className="proj-tab-content"><SECopilot project={project} /></TabsContent>
        <TabsContent value="attribution" className="proj-tab-content"><Attribution project={project} /></TabsContent>
        <TabsContent value="apk" className="proj-tab-content"><ApkUpload project={project} /></TabsContent>
        <TabsContent value="import" className="proj-tab-content"><HistoricalImport project={project} /></TabsContent>
        <TabsContent value="comments" className="proj-tab-content"><CommentsTab project={project} /></TabsContent>
      </Tabs>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Customer Share Link</DialogTitle>
            <DialogDescription>
              Send your customer a read-only view of this onboarding project. They'll see phase progress, health score, and task status — but no SDK keys, API keys, or testing controls.
            </DialogDescription>
          </DialogHeader>
          {!shareToken ? (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--sg-fg-2)] mb-5">No share link active for this project. Create one to send to your customer.</p>
              <button onClick={createShare} data-testid="create-share-button" className="button button-primary mx-auto">
                <Share weight="bold" className="w-4 h-4" /> Create Share Link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="eyebrow">Public read-only URL</label>
                <div className="flex gap-2 mt-2">
                  <Input value={shareUrl} readOnly className="font-mono text-xs" data-testid="share-url" />
                  <button onClick={copyLink} className="button button-soft" data-testid="copy-share-link">
                    <Copy weight="bold" className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>
              <div className="panel-soft p-4 text-xs text-[var(--sg-fg-2)]">
                <strong className="text-[var(--sg-fg)] block mb-1">What your customer sees</strong>
                Health score · phase progress · task status · checklist progress · workflow strip. <br/>
                <strong className="text-[var(--sg-fg)] block mt-2 mb-1">What stays private</strong>
                SDK key · API key · testing console · attribution queries · APK uploads.
              </div>
              <div className="flex justify-between items-center">
                <button onClick={revokeShare} className="button button-ghost text-[var(--sg-error)]" data-testid="revoke-share-button">
                  <Trash weight="bold" className="w-4 h-4" /> Revoke link
                </button>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="button button-primary" data-testid="open-share-preview">Open preview ↗</a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
