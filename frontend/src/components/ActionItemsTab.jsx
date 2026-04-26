import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash, PencilSimple, CheckCircle, Circle, Timer } from "@phosphor-icons/react";
import { toast } from "sonner";

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUS_ICON = {
  done: <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />,
  in_progress: <Timer weight="fill" className="w-4 h-4 text-orange-500" />,
  open: <Circle weight="regular" className="w-4 h-4 text-zinc-400" />,
};

const fmtDate = (s) => {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return s; }
};

const daysUntil = (s) => {
  if (!s) return null;
  const diff = Math.ceil((new Date(s) - new Date()) / 86400000);
  return diff;
};

function ItemDialog({ open, onClose, onSave, initial, contacts }) {
  const [form, setForm] = useState({
    title: "", description: "", assigned_to_contact_id: "", due_date: "", priority: "medium",
    ...initial,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    setForm({ title: "", description: "", assigned_to_contact_id: "", due_date: "", priority: "medium", ...initial });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    await onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.item_id ? "Edit action item" : "New action item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ai-title">Title *</Label>
            <Input id="ai-title" value={form.title} onChange={set("title")} placeholder="Integrate Singular SDK" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ai-desc">Description</Label>
            <textarea
              id="ai-desc"
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Additional details…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-due">Due date</Label>
              <Input id="ai-due" type="date" value={form.due_date ? form.due_date.slice(0, 10) : ""} onChange={set("due_date")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-priority">Priority</Label>
              <select
                id="ai-priority"
                value={form.priority}
                onChange={set("priority")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {["critical", "high", "medium", "low"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ai-contact">Assign to contact <span className="text-[var(--sg-fg-3)] font-normal">(triggers email + Slack alert)</span></Label>
            <select
              id="ai-contact"
              value={form.assigned_to_contact_id}
              onChange={set("assigned_to_contact_id")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Unassigned</option>
              {contacts.map((c) => (
                <option key={c.contact_id} value={c.contact_id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial?.item_id ? "Save changes" : "Create item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ActionItemsTab({ project }) {
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [itemsR, contactsR] = await Promise.all([
        api.get(`/projects/${project.id}/action-items`),
        api.get(`/projects/${project.id}/contacts`),
      ]);
      setItems(itemsR.data);
      setContacts(contactsR.data);
    } catch {
      toast.error("Failed to load action items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [project.id]);

  const onSave = async (form) => {
    try {
      if (editing?.item_id) {
        await api.put(`/projects/${project.id}/action-items/${editing.item_id}`, form);
        toast.success("Item updated");
      } else {
        await api.post(`/projects/${project.id}/action-items`, form);
        toast.success("Action item created" + (form.assigned_to_contact_id ? " — email + Slack alert sent" : ""));
      }
      await load();
    } catch {
      toast.error("Failed to save action item");
    }
  };

  const cycleStatus = async (item) => {
    const next = { open: "in_progress", in_progress: "done", done: "open" }[item.status] || "open";
    try {
      await api.put(`/projects/${project.id}/action-items/${item.item_id}`, { status: next });
      setItems((prev) => prev.map((i) => i.item_id === item.item_id ? { ...i, status: next } : i));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const onDelete = async (itemId) => {
    if (!window.confirm("Delete this action item?")) return;
    try {
      await api.delete(`/projects/${project.id}/action-items/${itemId}`);
      toast.success("Item deleted");
      await load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const open = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");

  const renderItem = (item) => {
    const days = daysUntil(item.due_date);
    const overdue = days !== null && days < 0;
    const dueSoon = days !== null && days >= 0 && days <= 3;

    return (
      <div
        key={item.item_id}
        className={`panel-soft p-4 flex items-start gap-3 ${overdue && item.status !== "done" ? "border-red-200 bg-red-50/30" : ""}`}
        data-testid={`action-item-${item.item_id}`}
      >
        <button onClick={() => cycleStatus(item)} className="mt-0.5 flex-shrink-0" title="Cycle status">
          {STATUS_ICON[item.status] || STATUS_ICON.open}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${item.status === "done" ? "line-through text-[var(--sg-fg-3)]" : "text-[var(--sg-fg)]"}`}>
              {item.title}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
              {item.priority}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-[var(--sg-fg-3)] mt-1">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {item.contact && (
              <span className="text-xs text-[var(--sg-fg-3)]">→ {item.contact.name}</span>
            )}
            {item.due_date && (
              <span className={`text-xs font-medium ${overdue ? "text-red-600" : dueSoon ? "text-orange-500" : "text-[var(--sg-fg-3)]"}`}>
                {overdue ? `⚠ ${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due ${fmtDate(item.due_date)}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-[var(--sg-bg-2)] text-[var(--sg-fg-3)]" title="Edit">
            <PencilSimple weight="bold" className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.item_id)} className="p-1.5 rounded hover:bg-red-50 text-[var(--sg-fg-3)] hover:text-red-600" title="Delete">
            <Trash weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="action-items-tab">
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Action Items</h2>
            <p className="muted">{open.length} open · {done.length} done</p>
          </div>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus weight="bold" className="w-4 h-4" /> New item
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--sg-fg-3)]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="panel-soft p-10 text-center">
            <div className="w-12 h-12 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center mx-auto text-[var(--sg-orange)]">
              <Plus weight="bold" className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-[var(--sg-fg)] mt-4">No action items yet</h3>
            <p className="text-sm text-[var(--sg-fg-3)] mt-1">
              Create action items to assign tasks to customer contacts with deadlines.
              Email and Slack alerts are sent automatically.
            </p>
            <Button onClick={openAdd} className="mt-4" variant="outline">Create first item</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {open.length > 0 && (
              <div className="space-y-2">
                <p className="eyebrow">Open ({open.length})</p>
                {open.map(renderItem)}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2">
                <p className="eyebrow">Completed ({done.length})</p>
                {done.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </section>

      <ItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onSave}
        initial={editing}
        contacts={contacts}
      />
    </div>
  );
}
