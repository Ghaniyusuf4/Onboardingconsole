import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CloudArrowUp, FileArchive, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const fmtBytes = (b) => {
  if (!b) return "—";
  const u = ["B","KB","MB","GB"]; let i=0; while (b>=1024 && i<u.length-1){ b/=1024; i++; }
  return `${b.toFixed(1)} ${u[i]}`;
};

export default function ApkUpload({ project }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const load = async () => {
    const r = await api.get(`/projects/${project.id}/apks`);
    setFiles(r.data);
  };
  useEffect(() => { load(); }, [project.id]);

  const upload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk") && !file.name.toLowerCase().endsWith(".aab")) {
      return toast.error("Only .apk or .aab files allowed");
    }
    setUploading(true); setProgress(0);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/projects/${project.id}/apk`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      toast.success("APK uploaded");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); setProgress(0); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  return (
    <div className="space-y-6" data-testid="apk-upload-tab">
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <p className="eyebrow">Workflow</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 mt-3 border border-zinc-200 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          {["Upload","Validate","Push to Test","Run SDK","Results"].map((s,i)=>(
            <div key={s} className="p-4 flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${i===0 ? "bg-[#0055FF] text-white":"bg-zinc-100 text-zinc-500"}`}>{i+1}</div>
              <div className="text-sm font-medium text-zinc-900">{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="apk-dropzone"
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${drag ? "border-[#0055FF] bg-[#0055FF]/5" : "border-zinc-300 bg-zinc-50/50 hover:border-[#0055FF] hover:bg-[#0055FF]/5"}`}
      >
        <input ref={inputRef} type="file" accept=".apk,.aab" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="apk-file-input" />
        <div className="w-14 h-14 rounded-md bg-zinc-100 grid place-items-center mx-auto text-zinc-500">
          <CloudArrowUp weight="bold" className="w-7 h-7" />
        </div>
        <h3 className="font-display font-bold text-zinc-900 mt-4">Drop your APK here or browse</h3>
        <p className="text-sm text-zinc-500 mt-1">Supports .apk and .aab files up to 200MB. Stored securely in object storage.</p>
        <Badge variant="secondary" className="mt-4 font-mono">apk · aab</Badge>
      </div>

      {uploading && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>Uploading…</span><span className="font-mono font-semibold text-zinc-900">{progress}%</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0055FF] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-3">Uploaded APKs</p>
        <div className="space-y-2">
          {files.length === 0 && <div className="text-sm text-zinc-500 bg-white border border-zinc-200 rounded-xl p-6 text-center">No APKs uploaded yet.</div>}
          {files.map(f => (
            <div key={f.id} data-testid={`apk-row-${f.id}`} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-emerald-50 grid place-items-center text-emerald-600">
                <FileArchive weight="bold" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900 truncate">{f.filename}</div>
                <div className="text-xs text-zinc-500 font-mono">{fmtBytes(f.size)} · {new Date(f.uploaded_at).toLocaleString()}</div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 gap-1"><CheckCircle weight="bold" className="w-3 h-3" />Stored</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
