import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6" data-testid="attribution-tab">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="eyebrow mb-1">Attribution Details API</p>
          <h3 className="font-display font-bold text-lg text-zinc-950">Verify device attribution</h3>
          <p className="text-sm text-zinc-500 mt-1">Hits Singular's Attribution Details endpoint with a device identifier and returns the matching attribution record.</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="eyebrow">API Key</Label>
            <div className="flex gap-2 mt-1">
              <Input data-testid="attr-api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="api_xxxxx" className="font-mono text-xs" />
              <Button variant="outline" onClick={saveKey} data-testid="save-api-key">Save</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="eyebrow">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="eyebrow">Device ID Type</Label>
              <Select value={deviceIdType} onValueChange={setDeviceIdType}>
                <SelectTrigger data-testid="device-id-type" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertising_id">advertising_id (GAID)</SelectItem>
                  <SelectItem value="android_id">android_id</SelectItem>
                  <SelectItem value="idfa">idfa</SelectItem>
                  <SelectItem value="idfv">idfv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="eyebrow">Device ID</Label>
            <Input data-testid="attr-device-id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. 38400000-8cf0-11bd-b23e-10b96e40000d" className="font-mono text-xs mt-1" />
          </div>
          <div>
            <Label className="eyebrow">App (optional)</Label>
            <Input data-testid="attr-app" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="com.example.app" className="font-mono text-xs mt-1" />
          </div>
          <Button data-testid="verify-attribution-button" onClick={verify} disabled={busy} className="w-full bg-[#0055FF] hover:bg-[#003BCC] gap-2 h-11">
            <MagnifyingGlass weight="bold" className="w-4 h-4" /> {busy ? "Querying…" : "Verify Attribution"}
          </Button>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Recent Verifications</p>
        <div className="space-y-3">
          {results.length === 0 && <div className="text-sm text-zinc-500 bg-white border border-zinc-200 rounded-xl p-6 text-center">No verifications yet.</div>}
          {results.map(r => (
            <div key={r.id} className="bg-white border border-zinc-200 rounded-xl p-5" data-testid={`attribution-result-${r.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {r.ok ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 gap-1"><ShieldCheck weight="bold" className="w-3 h-3" />OK</Badge>
                        : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 gap-1"><XCircle weight="bold" className="w-3 h-3" />Error {r.status_code}</Badge>}
                  <span className="text-xs font-mono text-zinc-500">{r.request?.platform} · {r.request?.device_id_type}</span>
                  <span className="text-xs font-mono text-zinc-400">{r.request?.device_id}</span>
                </div>
                <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <pre className="bg-zinc-50 border border-zinc-200 rounded-md p-3 mt-3 text-xs font-mono overflow-x-auto text-zinc-700">
{JSON.stringify(r.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
