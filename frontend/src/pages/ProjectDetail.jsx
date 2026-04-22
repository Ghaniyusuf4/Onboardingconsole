import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Share, Copy, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import Tracker from "@/components/Tracker";
import TestingConsole from "@/components/TestingConsole";
import Attribution from "@/components/Attribution";
import ApkUpload from "@/components/ApkUpload";
import Overview from "@/components/Overview";
import CommentsTab from "@/components/CommentsTab";
import HealthGauge, { HealthBreakdown } from "@/components/HealthGauge";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [health, setHealth] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [unread, setUnread] = useState(0);

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
  const pct = total ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="py-6 space-y-6" data-testid="project-detail-page">
      <header className="panel p-6 lg:p-8">
        <div className="flex items-center justify-between mb-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--sg-fg-3)] hover:text-[var(--sg-orange)] font-semibold uppercase tracking-wider" data-testid="back-to-dashboard">
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" /> Projects
          </Link>
          <button onClick={() => setShareOpen(true)} className="button button-soft h-9" data-testid="share-button">
            <Share weight="bold" className="w-4 h-4" />
            {shareToken ? "Manage Share Link" : "Share with Customer"}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-end">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-orange uppercase">{project.platform}</span>
              <span className="badge badge-neutral">{project.customer || "No customer"}</span>
            </div>
            <h1 className="font-display font-black text-3xl lg:text-4xl tracking-tight text-[var(--sg-fg)]">{project.name}</h1>
            <p className="text-sm text-[var(--sg-fg-2)] mt-2">Onboarding · SDK validation · Attribution verification</p>
          </div>
          <div className="lg:col-span-2 space-y-3">
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
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border border-[var(--sg-border)] p-1 rounded-md h-auto">
          <TabsTrigger data-testid="tab-overview" value="overview" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Overview</TabsTrigger>
          <TabsTrigger data-testid="tab-tracker" value="tracker" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Tracker</TabsTrigger>
          <TabsTrigger data-testid="tab-testing" value="testing" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Live Testing</TabsTrigger>
          <TabsTrigger data-testid="tab-attribution" value="attribution" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">Attribution</TabsTrigger>
          <TabsTrigger data-testid="tab-apk" value="apk" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none">APK Uploads</TabsTrigger>
          <TabsTrigger data-testid="tab-comments" value="comments" className="data-[state=active]:bg-[var(--sg-orange-soft)] data-[state=active]:text-[var(--sg-orange)] data-[state=active]:shadow-none gap-2">
            Comments
            {unread > 0 && <span className="bg-[var(--sg-orange)] text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full" data-testid="comments-unread-badge">{unread}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5"><Overview project={project} /></TabsContent>
        <TabsContent value="tracker" className="mt-5"><Tracker project={project} reload={reload} /></TabsContent>
        <TabsContent value="testing" className="mt-5"><TestingConsole project={project} /></TabsContent>
        <TabsContent value="attribution" className="mt-5"><Attribution project={project} /></TabsContent>
        <TabsContent value="apk" className="mt-5"><ApkUpload project={project} /></TabsContent>
        <TabsContent value="comments" className="mt-5"><CommentsTab project={project} /></TabsContent>
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
