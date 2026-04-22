import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
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
  const [currentFile, setCurrentFile] = useState(null);
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
    setUploading(true); setProgress(0); setCurrentFile(file);
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
    } finally { setUploading(false); setProgress(0); setCurrentFile(null); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  return (
    <div className="space-y-5" data-testid="apk-upload-tab">
      {/* 5-step grid */}
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>APK Validation Workflow</h2>
            <p className="muted">Upload · Validate · Run SDK Test · Verify Attribution · Sign Off</p>
          </div>
          <span className="badge badge-neutral">Live tracking</span>
        </div>
        <div className="step-grid">
          <div className={`step-card ${uploading ? "is-active" : files.length > 0 ? "is-done" : "is-active"}`} data-testid="step-upload"><span>1</span><strong>Upload</strong></div>
          <div className={`step-card ${files.length > 0 ? "is-done" : ""}`}><span>2</span><strong>Validate</strong></div>
          <div className="step-card"><span>3</span><strong>Run SDK</strong></div>
          <div className="step-card"><span>4</span><strong>Attribute</strong></div>
          <div className="step-card"><span>5</span><strong>Sign Off</strong></div>
        </div>
      </section>

      {/* Dropzone */}
      <div
        onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="apk-dropzone"
        className={`dropzone ${drag ? "is-drag" : ""}`}
      >
        <input ref={inputRef} type="file" accept=".apk,.aab" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="apk-file-input" />
        <div className="dropzone-icon">APK</div>
        <h3>Drop your APK or AAB here, or browse from your computer</h3>
        <p>Supports .apk and .aab files up to 200MB. Stored securely in object storage. Required: a build with the Singular SDK integrated.</p>
        <div className="flex gap-2 justify-center mt-5">
          <button className="button button-primary" type="button" onClick={(e)=>{e.stopPropagation(); inputRef.current?.click();}} data-testid="apk-choose-button">Choose File</button>
          <button className="button button-soft" type="button" onClick={(e)=>{e.stopPropagation();}}>Reset Session</button>
        </div>
      </div>

      {/* Upload progress + metric grid */}
      {uploading && (
        <section className="status-progress">
          <div className="status-progress-head">
            <div>
              <strong className="font-display text-[var(--sg-fg)]">Uploading {currentFile?.name}</strong>
              <p className="text-xs text-[var(--sg-fg-3)] mt-0.5">Direct-to-storage stream — no edge timeouts.</p>
            </div>
            <span className="progress-pill">{progress}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </section>
      )}

      <section className="metric-grid">
        <div className="metric-card"><span>APKs Uploaded</span><strong>{files.length}</strong></div>
        <div className="metric-card"><span>Latest Size</span><strong>{files[0] ? fmtBytes(files[0].size) : "—"}</strong></div>
        <div className="metric-card"><span>Last Upload</span><strong>{files[0] ? new Date(files[0].uploaded_at).toLocaleDateString() : "—"}</strong></div>
      </section>

      {/* List */}
      <section className="panel p-6">
        <div className="section-head">
          <div>
            <h2>Uploaded APKs</h2>
            <p className="muted">Stored securely in object storage with metadata.</p>
          </div>
        </div>
        <div className="space-y-2">
          {files.length === 0 && <div className="text-sm text-[var(--sg-fg-3)] panel-soft p-8 text-center">No APKs uploaded yet.</div>}
          {files.map(f => (
            <div key={f.id} data-testid={`apk-row-${f.id}`} className="panel-soft p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-[var(--sg-orange-soft)] grid place-items-center text-[var(--sg-orange)] flex-shrink-0">
                <FileArchive weight="bold" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--sg-fg)] truncate">{f.filename}</div>
                <div className="text-xs text-[var(--sg-fg-3)] font-mono">{fmtBytes(f.size)} · {new Date(f.uploaded_at).toLocaleString()}</div>
              </div>
              <span className="badge badge-success"><CheckCircle weight="bold" className="w-3 h-3" />Stored</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
