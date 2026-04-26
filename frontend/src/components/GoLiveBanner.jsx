import { useState } from "react";
import { api } from "@/lib/api";
import { Rocket, CalendarBlank, PencilSimple, X } from "@phosphor-icons/react";
import { toast } from "sonner";

const fmtDate = (s) => {
  try {
    return new Date(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch { return s; }
};

const daysUntil = (s) => Math.ceil((new Date(s) - new Date()) / 86400000);

const urgencyStyle = (days) => {
  if (days < 0) return { bg: "bg-red-600", text: "text-white", label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { bg: "bg-red-500", text: "text-white", label: "Go Live today!" };
  if (days <= 3) return { bg: "bg-orange-500", text: "text-white", label: `${days}d to Go Live` };
  if (days <= 14) return { bg: "bg-[var(--sg-orange)]", text: "text-white", label: `${days} days to Go Live` };
  return { bg: "bg-[var(--sg-bg-2)]", text: "text-[var(--sg-fg)]", label: `${days} days to Go Live` };
};

export default function GoLiveBanner({ project, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [dateInput, setDateInput] = useState(project.go_live_date ? project.go_live_date.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${project.id}/go-live-date`, { go_live_date: dateInput || null });
      toast.success(dateInput ? "Go Live date saved" : "Go Live date cleared");
      setEditing(false);
      onUpdated?.();
    } catch {
      toast.error("Failed to save Go Live date");
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${project.id}/go-live-date`, { go_live_date: null });
      setDateInput("");
      setEditing(false);
      toast.success("Go Live date cleared");
      onUpdated?.();
    } catch {
      toast.error("Failed to clear Go Live date");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="panel p-4 flex items-center gap-3 flex-wrap" data-testid="go-live-editor">
        <CalendarBlank weight="bold" className="w-5 h-5 text-[var(--sg-orange)] flex-shrink-0" />
        <span className="font-semibold text-[var(--sg-fg)] text-sm">Set Go Live date</span>
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving}
          className="button button-primary h-8 px-3 text-xs"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="button button-soft h-8 px-3 text-xs">Cancel</button>
        {project.go_live_date && (
          <button onClick={clear} className="button h-8 px-3 text-xs text-red-600 hover:bg-red-50 border border-red-200">
            Clear date
          </button>
        )}
      </div>
    );
  }

  if (!project.go_live_date) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="panel p-4 w-full text-left flex items-center gap-3 hover:bg-[var(--sg-bg-2)] transition-colors group"
        data-testid="go-live-set-prompt"
      >
        <div className="w-9 h-9 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)] flex-shrink-0">
          <Rocket weight="bold" className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--sg-fg)]">Set Go Live date</p>
          <p className="text-xs text-[var(--sg-fg-3)]">Add a target date to track countdown and trigger reminders</p>
        </div>
        <PencilSimple weight="bold" className="w-4 h-4 text-[var(--sg-fg-3)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  const days = daysUntil(project.go_live_date);
  const { bg, text, label } = urgencyStyle(days);

  return (
    <div className={`${bg} rounded-lg p-4 flex items-center gap-4`} data-testid="go-live-banner">
      <div className="w-10 h-10 rounded-md bg-white/20 grid place-items-center flex-shrink-0">
        <Rocket weight="fill" className={`w-5 h-5 ${text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wider ${text} opacity-80`}>Go Live</p>
        <p className={`font-display font-bold text-lg ${text} leading-tight`}>{label}</p>
        <p className={`text-xs ${text} opacity-70`}>{fmtDate(project.go_live_date)}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className={`p-2 rounded hover:bg-white/20 ${text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
        title="Edit Go Live date"
      >
        <PencilSimple weight="bold" className="w-4 h-4" />
      </button>
    </div>
  );
}
