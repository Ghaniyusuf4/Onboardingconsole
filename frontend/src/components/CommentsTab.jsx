import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Chat, EnvelopeSimpleOpen } from "@phosphor-icons/react";
import { toast } from "sonner";

const stamp = (s) => new Date(s).toLocaleString();

export default function CommentsTab({ project }) {
  const [data, setData] = useState({ comments: [], unread: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await api.get(`/projects/${project.id}/comments`);
    setData(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [project.id]);

  const markRead = async (id) => {
    await api.patch(`/projects/${project.id}/comments/${id}`);
    toast.success("Marked as read");
    load();
  };

  // Group by task
  const byTask = data.comments.reduce((acc, c) => {
    (acc[c.task_id] = acc[c.task_id] || { title: c.task_title, items: [] }).items.push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-5" data-testid="comments-tab">
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Customer Comments</h2>
            <p className="muted">{data.total} comment(s) · {data.unread} unread</p>
          </div>
          {data.unread > 0 && <span className="badge badge-orange">{data.unread} new</span>}
        </div>
        {loading ? <div className="text-sm text-[var(--sg-fg-3)]">Loading…</div>
          : data.comments.length === 0 ? (
            <div className="panel-soft p-10 text-center">
              <div className="w-12 h-12 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center mx-auto text-[var(--sg-orange)]">
                <Chat weight="bold" className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-[var(--sg-fg)] mt-4">No comments yet</h3>
              <p className="text-sm text-[var(--sg-fg-3)] mt-1">When you share this project with your customer, their comments will appear here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byTask).map(([taskId, group]) => (
                <div key={taskId} className="panel-soft p-5" data-testid={`comments-group-${taskId}`}>
                  <p className="eyebrow">Task</p>
                  <h4 className="font-display font-bold text-[var(--sg-fg)] mt-1 mb-3">{group.title}</h4>
                  <div className="space-y-3">
                    {group.items.map(c => (
                      <div key={c.id} data-testid={`comment-${c.id}`} className={`flex gap-3 p-3 rounded-md border ${c.read ? "border-[var(--sg-border)] bg-white" : "border-[var(--sg-orange)] bg-[var(--sg-orange-soft)]/30"}`}>
                        <Avatar className="w-8 h-8 mt-0.5">
                          <AvatarFallback className="bg-[var(--sg-orange)] text-white text-xs font-bold">{c.author_name[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[var(--sg-fg)]">{c.author_name}</span>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--sg-fg-3)]">customer</span>
                            <span className="text-xs text-[var(--sg-fg-3)] ml-auto">{stamp(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-[var(--sg-fg-2)] mt-1.5 whitespace-pre-wrap">{c.body}</p>
                          {!c.read && (
                            <button onClick={() => markRead(c.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--sg-orange)] hover:text-[var(--sg-orange-hover)]" data-testid={`mark-read-${c.id}`}>
                              <EnvelopeSimpleOpen weight="bold" className="w-3.5 h-3.5" /> Mark as read
                            </button>
                          )}
                          {c.read && (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--sg-fg-3)]">
                              <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[var(--sg-success)]" /> Read
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
