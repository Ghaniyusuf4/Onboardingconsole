import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, ArrowsClockwise, Terminal, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function TestingConsole({ project }) {
  const [sdkKey, setSdkKey] = useState(project.sdk_key || "");
  const [deviceId, setDeviceId] = useState("");
  const [platform, setPlatform] = useState(project.platform === "ios" ? "ios" : "android");
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  const loadLogs = async () => {
    const r = await api.get(`/projects/${project.id}/test-runs`);
    setLogs(r.data.filter(x => x.kind === "test_console"));
  };
  useEffect(() => { loadLogs(); }, [project.id]);

  const trigger = async () => {
    if (!sdkKey) return toast.error("SDK key required");
    if (!deviceId) return toast.error("Device ID required");
    setBusy(true);
    try {
      await api.post("/singular/test-console", {
        project_id: project.id, sdk_key: sdkKey, device_id: deviceId, platform,
      });
      toast.success("Request sent");
      loadLogs();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const saveKey = async () => {
    await api.patch(`/projects/${project.id}/keys`, { sdk_key: sdkKey });
    toast.success("SDK key saved");
  };

  return (
    <div className="space-y-5" data-testid="testing-console">
      {/* Workflow strip */}
      <section className="workflow-strip">
        <div className="wf-step">
          <div className="wf-num">1</div>
          <div className="wf-body">
            <strong>Enter SDK Key &amp; Device ID</strong>
            <p>Paste the customer's Singular SDK key and the device's advertising identifier.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">2</div>
          <div className="wf-body">
            <strong>Trigger Test Session</strong>
            <p>We call <code>api.singular.net/api/v1/testing/start_session</code> server-side.</p>
          </div>
        </div>
        <div className="wf-step">
          <div className="wf-num">3</div>
          <div className="wf-body">
            <strong>Stream Live Events</strong>
            <p>SDK events flow into the terminal — validate sessions, installs, custom events, and revenue.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <section className="panel p-6">
            <div className="section-head">
              <div>
                <h2>Trigger SDK Test</h2>
                <p className="muted">Calls Singular start_session endpoint.</p>
              </div>
              <span className="badge badge-orange">Testing Console</span>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="eyebrow">SDK Key</Label>
                <div className="flex gap-2 mt-2">
                  <Input data-testid="sdk-key-input" value={sdkKey} onChange={(e) => setSdkKey(e.target.value)} placeholder="sdk_xxxxx" className="font-mono text-xs h-10" />
                  <button className="button button-soft h-10" onClick={saveKey} data-testid="save-sdk-key">Save</button>
                </div>
              </div>
              <div>
                <Label className="eyebrow">Device ID</Label>
                <Input data-testid="device-id-input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder={platform === "ios" ? "IDFA / IDFV" : "Advertising ID (GAID)"} className="font-mono text-xs h-10 mt-2" />
              </div>
              <div>
                <Label className="eyebrow">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger data-testid="platform-select" className="mt-2 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button data-testid="trigger-test-button" onClick={trigger} disabled={busy} className="button button-primary w-full h-12 justify-center disabled:opacity-50">
                <Play weight="bold" className="w-4 h-4" /> {busy ? "Triggering…" : "Trigger Test Session"}
              </button>
            </div>
          </section>

          <section className="panel p-6">
            <div className="section-head">
              <div>
                <h2>SDK Validation Checklist</h2>
                <p className="muted">From Singular's recommended QA flow.</p>
              </div>
            </div>
            <ul className="text-sm text-[var(--sg-fg)] space-y-2.5">
              {[
                "Session starts on first app launch",
                "Install/Attribution events visible in Export Logs",
                "Custom User ID method triggered",
                "Revenue/IAP events validated",
                "Deep Link & DDL callbacks reach app",
                "SKAdNetwork SDK params received",
                "Uninstall tracking + Global Properties",
              ].map((t, i) => (
                <li key={i} className="flex gap-2 items-start"><ShieldCheck weight="fill" className="w-4 h-4 text-[var(--sg-success)] mt-0.5 flex-shrink-0" /><span>{t}</span></li>
              ))}
            </ul>
          </section>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-[#0E1430] rounded-[var(--sg-radius-lg)] border border-[#1F2647] overflow-hidden flex flex-col h-[720px] shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2647] bg-gradient-to-b from-[#141B3D] to-[#0E1430]">
              <div className="flex items-center gap-2 text-zinc-200 text-sm">
                <Terminal weight="bold" className="w-4 h-4 text-[var(--sg-orange)]" />
                <span className="font-display font-bold">live_testing.log</span>
                <span className="badge ml-2" style={{ background: "rgba(255,86,52,0.15)", color: "var(--sg-orange)", borderColor: "rgba(255,86,52,0.3)" }}>{logs.length} runs</span>
              </div>
              <button onClick={loadLogs} className="text-zinc-400 hover:text-white text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5">
                <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3" data-testid="test-logs">
              {logs.length === 0 && (
                <div className="text-zinc-500 italic">
                  <span className="text-[var(--sg-orange)]">$</span> waiting for test session… trigger your first test on the left →
                </div>
              )}
              {logs.map((l) => (
                <div key={l.id} className="border-l-2 pl-3 py-1" style={{ borderColor: l.ok ? "var(--sg-success)" : "var(--sg-error)" }}>
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                    <span>{new Date(l.created_at).toISOString()}</span>
                    <span className={l.ok ? "text-[var(--sg-success)]" : "text-[var(--sg-error)]"}>[{l.status_code || "ERR"}]</span>
                    <span className="text-zinc-400">{l.request?.platform} · {l.request?.device_id}</span>
                  </div>
                  <pre className={`mt-1 whitespace-pre-wrap break-all ${l.ok ? "text-[var(--sg-success)] terminal-glow" : "text-[#F69287]"}`}>
{JSON.stringify(l.response, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
