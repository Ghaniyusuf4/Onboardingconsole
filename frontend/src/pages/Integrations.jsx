import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Copy, Plug, ArrowSquareOut, Check, Trash, SlackLogo, MicrosoftTeamsLogo, Lightning } from "@phosphor-icons/react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Integrations() {
  const [token, setToken] = useState(null);
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadLinks = async () => {
    const r = await api.get("/slack/links");
    setLinks(r.data);
  };
  useEffect(() => { loadLinks(); }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api.post("/slack/link-token");
      setToken(r.data);
      toast.success("Link token generated · valid 15 minutes");
    } finally { setBusy(false); }
  };

  const copy = async (s) => {
    await navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  const unlink = async (sid) => {
    await api.delete(`/slack/links/${sid}`);
    toast.success("Unlinked");
    loadLinks();
  };

  const webhookUrl = `${BACKEND_URL}/api/slack/command`;

  return (
    <div className="py-6 space-y-6" data-testid="integrations-page">
      <header className="panel p-8">
        <span className="eyebrow eyebrow-orange">Integrations</span>
        <h1 className="font-display font-black text-3xl lg:text-4xl text-[var(--sg-fg)] tracking-tight mt-2">Bring Singular into your team's tools</h1>
        <p className="text-[var(--sg-fg-2)] mt-2 max-w-2xl">Surface project health and customer comments where your team already works — Slack and Microsoft Teams.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Slack */}
        <div className="panel p-6 lg:col-span-2">
          <div className="section-head">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#4A154B] grid place-items-center text-white">
                <SlackLogo weight="fill" className="w-5 h-5" />
              </div>
              <div>
                <h2>Slack</h2>
                <p className="muted">Slash commands for project health, comments, and project list.</p>
              </div>
            </div>
            {links.length > 0 ? <span className="badge badge-success"><Check weight="bold" className="w-3 h-3" />Connected</span> : <span className="badge badge-neutral">Not connected</span>}
          </div>

          {/* Setup steps */}
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="wf-num flex-shrink-0">1</div>
              <div className="flex-1">
                <strong className="font-display text-[var(--sg-fg)] block">Create a Slack app</strong>
                <p className="text-sm text-[var(--sg-fg-2)] mt-1">Go to <a className="text-[var(--sg-orange)] font-semibold inline-flex items-center gap-0.5" href="https://api.slack.com/apps" target="_blank" rel="noreferrer">api.slack.com/apps <ArrowSquareOut weight="bold" className="w-3 h-3" /></a> → "Create New App" → "From scratch". Name it <code className="font-mono bg-[var(--sg-panel-soft)] px-1.5 py-0.5 rounded">Singular Onboarding</code> and pick your workspace.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="wf-num flex-shrink-0">2</div>
              <div className="flex-1">
                <strong className="font-display text-[var(--sg-fg)] block">Add a slash command</strong>
                <p className="text-sm text-[var(--sg-fg-2)] mt-1">In the app settings, go to <strong>Slash Commands</strong> → "Create New Command" with:</p>
                <div className="panel-soft p-3 mt-2 text-xs space-y-1.5">
                  <div className="flex justify-between gap-3"><span className="text-[var(--sg-fg-3)] uppercase tracking-wider">Command</span><code className="font-mono">/singular</code></div>
                  <div className="flex justify-between gap-3 items-center">
                    <span className="text-[var(--sg-fg-3)] uppercase tracking-wider">Request URL</span>
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <Input value={webhookUrl} readOnly className="font-mono text-[10px] h-7" data-testid="slack-webhook-url" />
                      <button onClick={() => copy(webhookUrl)} className="button button-soft h-7 text-xs px-2"><Copy weight="bold" className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3"><span className="text-[var(--sg-fg-3)] uppercase tracking-wider">Description</span><span>Singular project health & comments</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[var(--sg-fg-3)] uppercase tracking-wider">Usage hint</span><code className="font-mono">[help|projects|health &lt;name&gt;|comments &lt;name&gt;]</code></div>
                </div>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="wf-num flex-shrink-0">3</div>
              <div className="flex-1">
                <strong className="font-display text-[var(--sg-fg)] block">Set the signing secret</strong>
                <p className="text-sm text-[var(--sg-fg-2)] mt-1">In Slack: <strong>Basic Information</strong> → copy the <strong>Signing Secret</strong>. Add it to your backend env as <code className="font-mono bg-[var(--sg-panel-soft)] px-1.5 py-0.5 rounded">SLACK_SIGNING_SECRET</code> and restart. (Skip in dev mode — requests will be accepted unsigned with a log warning.)</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="wf-num flex-shrink-0">4</div>
              <div className="flex-1">
                <strong className="font-display text-[var(--sg-fg)] block">Install &amp; link your account</strong>
                <p className="text-sm text-[var(--sg-fg-2)] mt-1">Install the app to your workspace, then generate a link token below and run it in any Slack channel.</p>
                {!token ? (
                  <button onClick={generate} disabled={busy} className="button button-primary mt-3" data-testid="generate-link-token">
                    <Lightning weight="bold" className="w-4 h-4" /> {busy ? "Generating…" : "Generate Link Token"}
                  </button>
                ) : (
                  <div className="panel-soft p-4 mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="eyebrow">Run this in Slack (valid 15 min)</span>
                      <span className="badge badge-warning">{new Date(token.expires_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={token.command} readOnly className="font-mono text-xs" data-testid="link-command" />
                      <button onClick={() => copy(token.command)} className="button button-primary"><Copy weight="bold" className="w-4 h-4" />Copy</button>
                    </div>
                    <button onClick={generate} className="text-xs text-[var(--sg-orange)] mt-2 font-semibold hover:underline">Regenerate</button>
                  </div>
                )}
              </div>
            </li>
          </ol>

          {/* Linked accounts */}
          {links.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--sg-border)]">
              <p className="eyebrow mb-3">Linked Slack Accounts</p>
              <div className="space-y-2">
                {links.map(l => (
                  <div key={l.slack_user_id} className="panel-soft p-3 flex items-center gap-3" data-testid={`slack-link-${l.slack_user_id}`}>
                    <div className="w-8 h-8 rounded-md bg-[#4A154B] grid place-items-center text-white"><SlackLogo weight="fill" className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-mono text-[var(--sg-fg)]">{l.slack_user_id}</div>
                      <div className="text-xs text-[var(--sg-fg-3)]">Team {l.slack_team_id} · linked {new Date(l.linked_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => unlink(l.slack_user_id)} className="button button-ghost text-[var(--sg-error)]" data-testid={`unlink-${l.slack_user_id}`}>
                      <Trash weight="bold" className="w-4 h-4" />Unlink
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Available commands + Teams placeholder */}
        <aside className="space-y-5">
          <div className="panel p-6">
            <p className="eyebrow">Available Commands</p>
            <div className="space-y-3 mt-3">
              {[
                ["/singular help", "Show command list"],
                ["/singular projects", "List projects with health"],
                ["/singular health <name>", "Detailed health breakdown"],
                ["/singular comments <name>", "Recent customer comments"],
                ["/singular link <token>", "Link your Slack account"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="text-xs">
                  <code className="font-mono text-[var(--sg-orange)] font-semibold">{cmd}</code>
                  <p className="text-[var(--sg-fg-3)] mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6 opacity-70">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-[#5059C9] grid place-items-center text-white">
                <MicrosoftTeamsLogo weight="fill" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[var(--sg-fg)]">Microsoft Teams</h2>
                <span className="badge badge-neutral mt-1">Coming soon</span>
              </div>
            </div>
            <p className="text-xs text-[var(--sg-fg-2)]">Same commands as Slack via a Teams Messaging Extension. The Slack webhook is Teams-compatible — only the manifest differs.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
