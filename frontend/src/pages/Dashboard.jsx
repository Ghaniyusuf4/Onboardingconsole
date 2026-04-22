import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, FolderSimple, ArrowRight, Trash } from "@phosphor-icons/react";
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

  return (
    <div className="p-8 lg:p-12 max-w-[1400px] mx-auto" data-testid="dashboard-page">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="eyebrow mb-2">Workspace</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tight text-zinc-950">Onboarding Projects</h1>
          <p className="text-zinc-500 mt-2">Track every customer integration from kickoff to launch.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-project-button" className="bg-[#0055FF] hover:bg-[#003BCC] text-white h-11 px-5 gap-2">
              <Plus weight="bold" className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Onboarding Project</DialogTitle></DialogHeader>
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
              <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Apply Standard Template</div>
                  <div className="text-xs text-zinc-500">Pre-load 8 phases & full checklist.</div>
                </div>
                <Switch checked={form.apply_template} onCheckedChange={(v) => setForm({ ...form, apply_template: v })} data-testid="new-project-apply-template" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="create-project-confirm" onClick={create} className="bg-[#0055FF] hover:bg-[#003BCC]">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-zinc-400">Loading…</div> : projects.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-16 text-center">
          <div className="w-12 h-12 rounded-md bg-zinc-100 grid place-items-center mx-auto text-zinc-400">
            <FolderSimple weight="bold" className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-zinc-900 mt-4">No projects yet</h3>
          <p className="text-zinc-500 text-sm mt-1">Create your first onboarding project to get started.</p>
          <Button onClick={() => setOpen(true)} className="mt-5 bg-[#0055FF] hover:bg-[#003BCC]">Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
          {projects.map((p) => (
            <div key={p.id} data-testid={`project-card-${p.id}`} className="bg-white border border-zinc-200 rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">{p.platform}</p>
                  <h3 className="font-display font-bold text-lg text-zinc-950 mt-1">{p.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{p.customer || "—"}</p>
                </div>
                <button onClick={() => remove(p.id)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition" data-testid={`delete-project-${p.id}`}>
                  <Trash weight="bold" className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>{p.tasks_closed}/{p.tasks_total} tasks</span>
                  <span className="font-mono font-semibold text-zinc-900">{p.progress}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0055FF] rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <Link to={`/projects/${p.id}`} data-testid={`open-project-${p.id}`} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#0055FF] hover:gap-2 transition-all">
                Open project <ArrowRight weight="bold" className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
