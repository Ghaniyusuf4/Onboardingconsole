import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, FolderSimple, ArrowRight, Trash, CloudArrowUp, ChartLine, Lightning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", customer: "", platform: "android", apply_template: true });

  const load = async () => {
    setLoading(true);
    const r = await api.get("/projects");
    setProjects(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Project name required");
    await api.post("/projects", form);
    setOpen(false);
    setForm({ name: "", customer: "", platform: "android", apply_template: true });
    toast.success("Project created");
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete project?")) return;
    await api.delete(`/projects/${id}`);
    load();
  };

  const totals = projects.reduce((acc, p) => {
    acc.total += p.tasks_total;
    acc.closed += p.tasks_closed;
    return acc;
  }, { total: 0, closed: 0 });
  const overallPct = totals.total ? Math.round((totals.closed / totals.total) * 100) : 0;

  return (
    <div className="py-6 space-y-6" data-testid="dashboard-page">
      {/* Hero */}
      <header className="panel p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3">
            <span className="eyebrow eyebrow-orange">Powered by Singular</span>
            <div className="font-display font-bold text-[var(--sg-fg-2)] text-base mt-3">Faster integrations · Verified attribution</div>
            <h1 className="font-display font-black text-3xl lg:text-5xl text-[var(--sg-fg)] tracking-tight mt-3 leading-[1.05]">
              Onboarding Projects
            </h1>
            <p className="text-[var(--sg-fg-2)] mt-4 max-w-xl">
              Track every customer integration from kickoff to launch. Validate SDK events with the Testing Console, confirm campaign attribution per device, and ship integrations with proof.
            </p>
            <div className="flex gap-3 mt-6">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button data-testid="new-project-button" className="button button-primary h-11">
                    <Plus weight="bold" className="w-4 h-4" /> New Project
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Create Onboarding Project</DialogTitle>
                    <DialogDescription>Initialize a new customer onboarding workspace with the standard 8-phase plan.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="eyebrow">Project Name</Label>
                      <Input data-testid="new-project-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp · Mobile Onboarding" />
                    </div>
                    <div>
                      <Label className="eyebrow">Customer</Label>
                      <Input data-testid="new-project-customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Acme Corp" />
                    </div>
                    <div>
                      <Label className="eyebrow">Platform</Label>
                      <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                        <SelectTrigger data-testid="new-project-platform"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="android">Android</SelectItem>
                          <SelectItem value="ios">iOS</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-[var(--sg-border)] px-3 py-2 bg-[var(--sg-panel-soft)]">
                      <div>
                        <div className="text-sm font-medium">Apply Standard Template</div>
                        <div className="text-xs text-[var(--sg-fg-3)]">Pre-load 8 phases &amp; full checklist.</div>
                      </div>
                      <Switch checked={form.apply_template} onCheckedChange={(v) => setForm({ ...form, apply_template: v })} data-testid="new-project-apply-template" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <button data-testid="create-project-confirm" onClick={create} className="button button-primary">Create</button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <a href="https://support.singular.net/hc/en-us/categories/360002441132" target="_blank" rel="noreferrer" className="button button-soft h-11">SDK Docs</a>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="metric-grid">
              <div className="metric-card"><span>Projects</span><strong>{projects.length}</strong></div>
              <div className="metric-card"><span>Tasks Closed</span><strong>{totals.closed}/{totals.total}</strong></div>
              <div className="metric-card"><span>Overall</span><strong>{overallPct}%</strong></div>
            </div>
            <div className="status-progress mt-3">
              <div className="status-progress-head">
                <div>
                  <strong className="font-display text-[var(--sg-fg)]">Workspace Progress</strong>
                  <p className="text-xs text-[var(--sg-fg-3)] mt-0.5">Aggregate completion across all projects.</p>
                </div>
                <span className="progress-pill">{overallPct}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${overallPct}%` }} /></div>
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Strip */}
      <section className="workflow-strip">
        <div className="wf-step">
          <div className="wf-num">1</div>
          <div className="wf-body">
            <strong>Plan & Track</strong>
            <p>Create a project, apply the standard 8-phase template, assign owners, and track progress per checklist.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Upload & Test</strong>
            <p>Drop the customer's APK into object storage, then trigger the Singular Testing Console with the SDK key.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">3</div>
          <div className="wf-body">
            <strong>Verify & Ship</strong>
            <p>Hit the Attribution Details API with device IDs to confirm install attribution and ship the integration.</p>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="panel p-6 lg:p-8">
        <div className="section-head">
          <div>
            <h2>Your Projects</h2>
            <p className="muted">Open a project to access its tracker, testing console and attribution panel.</p>
          </div>
          <span className="badge badge-orange">{projects.length} active</span>
        </div>

        {loading ? <div className="text-[var(--sg-fg-3)] text-sm">Loading…</div> : projects.length === 0 ? (
          <div className="dropzone" onClick={() => setOpen(true)}>
            <div className="dropzone-icon"><FolderSimple weight="bold" className="w-7 h-7" /></div>
            <h3>No projects yet — create your first onboarding project</h3>
            <p>You'll get an 8-phase plan, testing console, and attribution panel ready to go.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
            {projects.map((p) => (
              <div key={p.id} data-testid={`project-card-${p.id}`} className="panel-soft p-5 hover:shadow-md hover:border-[var(--sg-orange)] transition-all group">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge badge-neutral uppercase">{p.platform}</span>
                    <h3 className="font-display font-bold text-lg text-[var(--sg-fg)] mt-2.5 leading-tight">{p.name}</h3>
                    <p className="text-sm text-[var(--sg-fg-3)] mt-1">{p.customer || "—"}</p>
                  </div>
                  <button onClick={() => remove(p.id)} className="opacity-0 group-hover:opacity-100 text-[var(--sg-fg-3)] hover:text-[var(--sg-error)] transition" data-testid={`delete-project-${p.id}`}>
                    <Trash weight="bold" className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-[var(--sg-fg-3)] mb-2">
                    <span>{p.tasks_closed}/{p.tasks_total} tasks</span>
                    <span className="font-mono font-semibold text-[var(--sg-fg)]">{p.progress}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
                </div>
                <Link to={`/projects/${p.id}`} data-testid={`open-project-${p.id}`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--sg-orange)] hover:gap-2 transition-all">
                  Open project <ArrowRight weight="bold" className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
