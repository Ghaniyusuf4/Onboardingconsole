import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash, PencilSimple, EnvelopeSimple, SlackLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

const ROLES = ["Technical Lead", "Engineering Manager", "Product Manager", "Project Manager", "Marketing", "Other"];

function ContactDialog({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: "", email: "", role: "", slack_user_id: "", ...initial });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    setForm({ name: "", email: "", role: "", slack_user_id: "", ...initial });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    await onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.contact_id ? "Edit contact" : "Add customer contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Full name *</Label>
            <Input id="c-name" value={form.name} onChange={set("name")} placeholder="Jane Smith" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">Email *</Label>
            <Input id="c-email" type="email" value={form.email} onChange={set("email")} placeholder="jane@customer.com" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-role">Role</Label>
            <select
              id="c-role"
              value={form.role}
              onChange={set("role")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select role…</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-slack">Slack user ID <span className="text-[var(--sg-fg-3)] font-normal">(optional — for direct alerts)</span></Label>
            <Input id="c-slack" value={form.slack_user_id} onChange={set("slack_user_id")} placeholder="U012AB3CD" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial?.contact_id ? "Save changes" : "Add contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsTab({ project }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/projects/${project.id}/contacts`);
      setContacts(r.data);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [project.id]);

  const onSave = async (form) => {
    try {
      if (editing?.contact_id) {
        await api.put(`/projects/${project.id}/contacts/${editing.contact_id}`, form);
        toast.success("Contact updated");
      } else {
        await api.post(`/projects/${project.id}/contacts`, form);
        toast.success("Contact added");
      }
      await load();
    } catch {
      toast.error("Failed to save contact");
    }
  };

  const onDelete = async (contactId) => {
    if (!window.confirm("Remove this contact?")) return;
    try {
      await api.delete(`/projects/${project.id}/contacts/${contactId}`);
      toast.success("Contact removed");
      await load();
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setDialogOpen(true); };

  return (
    <div className="space-y-5" data-testid="contacts-tab">
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Customer Contacts</h2>
            <p className="muted">People on the customer side who receive alerts and action items</p>
          </div>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <UserPlus weight="bold" className="w-4 h-4" /> Add contact
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--sg-fg-3)]">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="panel-soft p-10 text-center">
            <div className="w-12 h-12 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center mx-auto text-[var(--sg-orange)]">
              <UserPlus weight="bold" className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-[var(--sg-fg)] mt-4">No contacts yet</h3>
            <p className="text-sm text-[var(--sg-fg-3)] mt-1">Add customer contacts to assign action items and send email + Slack alerts.</p>
            <Button onClick={openAdd} className="mt-4" variant="outline">Add first contact</Button>
          </div>
        ) : (
          <div className="grid gap-3 mt-4">
            {contacts.map((c) => (
              <div key={c.contact_id} className="panel-soft p-4 flex items-center gap-4" data-testid={`contact-${c.contact_id}`}>
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-[var(--sg-orange)] text-white font-bold">
                    {c.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--sg-fg)]">{c.name}</span>
                    {c.role && <span className="badge">{c.role}</span>}
                    {c.slack_user_id && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--sg-fg-3)]">
                        <SlackLogo weight="fill" className="w-3 h-3" /> Slack linked
                      </span>
                    )}
                  </div>
                  <a href={`mailto:${c.email}`} className="text-sm text-[var(--sg-fg-3)] hover:text-[var(--sg-orange)] flex items-center gap-1 mt-0.5">
                    <EnvelopeSimple weight="bold" className="w-3.5 h-3.5" /> {c.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2 rounded hover:bg-[var(--sg-bg-2)] text-[var(--sg-fg-3)] hover:text-[var(--sg-fg)]"
                    title="Edit"
                  >
                    <PencilSimple weight="bold" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(c.contact_id)}
                    className="p-2 rounded hover:bg-red-50 text-[var(--sg-fg-3)] hover:text-red-600"
                    title="Remove"
                    data-testid={`delete-contact-${c.contact_id}`}
                  >
                    <Trash weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onSave}
        initial={editing}
      />
    </div>
  );
}
