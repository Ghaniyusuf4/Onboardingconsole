import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MagnifyingGlass, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Attribution({ project }) {
  const [apiKey, setApiKey] = useState(project.api_key || "");
  const [deviceId, setDeviceId] = useState("");
  const [deviceIdType, setDeviceIdType] = useState(project.platform === "ios" ? "idfa" : "advertising_id");
  const [platform, setPlatform] = useState(project.platform === "ios" ? "ios" : "android");
  const [appName, setAppName] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);

  const load = async () => {
    const r = await api.get(`/projects/${project.id}/test-runs`);
    setResults(r.data.filter(x => x.kind === "attribution"));
  };
  useEffect(() => { load(); }, [project.id]);

  const saveKey = async () => {
    await api.patch(`/projects/${project.id}/keys`, { api_key: apiKey });
    toast.success("API key saved to project");
  };

  const verify = async () => {
    if (!apiKey) return toast.error("API key required");
    if (!deviceId) return toast.error("Device ID required");
    setBusy(true);
    try {
      await api.post("/singular/attribution", {
        api_key: apiKey, device_id: deviceId, device_id_type: deviceIdType, platform, app: appName || null,
      });
      toast.success("Attribution query sent");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5" data-testid="attribution-tab">
      <section className="panel p-6 lg:p-8">
        <div className="section-head">
          <div>
            <h2>Attribution Details API</h2>
            <p className="muted">Hits Singular's Attribution Details endpoint with a device identifier and returns the matching attribution record.</p>
          </div>
          <span className="badge badge-orange">Attribution Verification</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="eyebrow">API Key</Label>
              <div className="flex gap-2 mt-2">
                <Input data-testid="attr-api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="api_xxxxx" className="font-mono text-xs h-10" />
                <button className="button button-soft h-10" onClick={saveKey} data-testid="save-api-key">Save</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="eyebrow">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="mt-2 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="eyebrow">Device ID Type</Label>
                <Select value={deviceIdType} onValueChange={setDeviceIdType}>
                  <SelectTrigger data-testid="device-id-type" className="mt-2 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertising_id">advertising_id (GAID)</SelectItem>
                    <SelectItem value="android_id">android_id</SelectItem>
                    <SelectItem value="idfa">idfa</SelectItem>
                    <SelectItem value="idfv">idfv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="eyebrow">Device ID</Label>
              <Input data-testid="attr-device-id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. 38400000-8cf0-11bd-b23e-10b96e40000d" className="font-mono text-xs h-10 mt-2" />
            </div>
            <div>
              <Label className="eyebrow">App (optional)</Label>
              <Input data-testid="attr-app" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="com.example.app" className="font-mono text-xs h-10 mt-2" />
            </div>
            <button data-testid="verify-attribution-button" onClick={verify} disabled={busy} className="button button-primary w-full h-12 justify-center disabled:opacity-50">
              <MagnifyingGlass weight="bold" className="w-4 h-4" /> {busy ? "Querying…" : "Verify Attribution"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Recent Verifications</h2>
            <p className="muted">{results.length} record(s)</p>
          </div>
        </div>
        <div className="space-y-3">
          {results.length === 0 && <div className="text-sm text-[var(--sg-fg-3)] panel-soft p-8 text-center">No verifications yet.</div>}
          {results.map(r => (
            <div key={r.id} className="panel-soft p-5" data-testid={`attribution-result-${r.id}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.ok
                    ? <span className="badge badge-success"><ShieldCheck weight="bold" className="w-3 h-3" />OK</span>
                    : <span className="badge badge-error"><XCircle weight="bold" className="w-3 h-3" />Error {r.status_code || "—"}</span>}
                  <span className="text-xs font-mono text-[var(--sg-fg-2)]">{r.request?.platform} · {r.request?.device_id_type}</span>
                  <span className="text-xs font-mono text-[var(--sg-fg-3)]">{r.request?.device_id}</span>
                </div>
                <span className="text-xs text-[var(--sg-fg-3)]">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <pre className="bg-[#0E1430] rounded-md p-3 mt-3 text-xs font-mono overflow-x-auto text-zinc-200 border border-[#1F2647]">
{JSON.stringify(r.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
