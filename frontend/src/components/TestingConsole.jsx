import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, ArrowsClockwise, Terminal, ShieldCheck, Warning } from "@phosphor-icons/react";
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
    const tc = r.data.filter(x => x.kind === "test_console");
    setLogs(tc);
  };
  useEffect(() => { loadLogs(); }, [project.id]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [logs]);

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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" data-testid="testing-console">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <p className="eyebrow mb-1">Singular Testing Console</p>
          <h3 className="font-display font-bold text-lg text-zinc-950">Trigger SDK Test</h3>
          <p className="text-sm text-zinc-500 mt-1">Calls Singular start_session API and validates device events.</p>
          <div className="space-y-4 mt-5">
            <div>
              <Label className="eyebrow">SDK Key</Label>
              <div className="flex gap-2 mt-1">
                <Input data-testid="sdk-key-input" value={sdkKey} onChange={(e) => setSdkKey(e.target.value)} placeholder="sdk_xxxxx" className="font-mono text-xs" />
                <Button variant="outline" onClick={saveKey} data-testid="save-sdk-key">Save</Button>
              </div>
            </div>
            <div>
              <Label className="eyebrow">Device ID</Label>
              <Input data-testid="device-id-input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder={platform === "ios" ? "IDFA / IDFV" : "Advertising ID (GAID)"} className="font-mono text-xs mt-1" />
            </div>
            <div>
              <Label className="eyebrow">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="platform-select" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button data-testid="trigger-test-button" onClick={trigger} disabled={busy} className="w-full bg-[#0055FF] hover:bg-[#003BCC] gap-2 h-11">
              <Play weight="bold" className="w-4 h-4" /> {busy ? "Triggering…" : "Trigger Test Session"}
            </Button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <p className="eyebrow mb-2">SDK Validation Checklist</p>
          <ul className="text-sm text-zinc-700 space-y-2 mt-3">
            {[
              "Session starts on first app launch",
              "Install/Attribution events visible in Export Logs",
              "Custom User ID method triggered",
              "Revenue/IAP events validated",
              "Deep Link & DDL callbacks reach app",
              "SKAdNetwork SDK params received",
              "Uninstall tracking + Global Properties",
            ].map((t, i) => (
              <li key={i} className="flex gap-2"><ShieldCheck weight="bold" className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span>{t}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[680px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-300 text-sm">
              <Terminal weight="bold" className="w-4 h-4" />
              <span className="font-display font-bold">live_testing.log</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadLogs} className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2">
              <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3" data-testid="test-logs">
            {logs.length === 0 && <div className="text-zinc-600 italic">No test runs yet. Trigger your first test session →</div>}
            {logs.map((l) => (
              <div key={l.id} className="border-l-2 border-zinc-800 pl-3 py-1">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                  <span>{new Date(l.created_at).toISOString()}</span>
                  <span className={l.ok ? "text-emerald-400" : "text-red-400"}>[{l.status_code || "ERR"}]</span>
                  <span className="text-zinc-400">{l.request?.platform} · {l.request?.device_id}</span>
                </div>
                <pre className={`mt-1 whitespace-pre-wrap break-all ${l.ok ? "text-emerald-400 terminal-glow" : "text-red-400"}`}>
{JSON.stringify(l.response, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
