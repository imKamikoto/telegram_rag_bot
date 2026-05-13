import React, { useCallback, useRef, useState } from "react";
import { KnowledgeBase } from "../types";
import { PageHeader } from "../components/layout";
import { WBtn, WKbTile, fmtSize } from "../components/primitives";
import { WIcon } from "../components/icons";

interface UploadItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number; // 0-100
  error?: string;
}

function uploadFileWithProgress(
  file: File,
  kbId: number,
  onProgress: (pct: number) => void,
  token: string,
  apiBase: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("knowledge_base_id", String(kbId));

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        try { reject(new Error(JSON.parse(xhr.responseText).detail || xhr.statusText)); }
        catch { reject(new Error(xhr.statusText)); }
      }
    };
    xhr.onerror = () => reject(new Error("Сетевая ошибка"));
    xhr.open("POST", `${apiBase}/document/file`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(form);
  });
}

const ACCEPTED = ".pdf,.docx,.md,.txt";
const ACCEPTED_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown", "text/plain"];

function isAccepted(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "docx", "md", "txt"].includes(ext);
}

export function ScreenUpload({ kb, onBack, onDone }: {
  kb: KnowledgeBase;
  onBack: () => void;
  onDone: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(isAccepted);
    setItems(prev => [
      ...prev,
      ...arr.map(f => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "queued" as const,
        progress: 0,
      })),
    ]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const startUpload = async () => {
    const queued = items.filter(i => i.status === "queued");
    if (!queued.length) return;
    setRunning(true);

    const token = localStorage.getItem("admin_token") ?? "";
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

    for (const item of queued) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i));
      try {
        await uploadFileWithProgress(
          item.file, kb.id,
          pct => setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i)),
          token, apiBase,
        );
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done", progress: 100 } : i));
      } catch (e) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, status: "error", error: (e as Error).message } : i));
      }
    }

    setRunning(false);
  };

  const allDone = items.length > 0 && items.every(i => i.status === "done" || i.status === "error");
  const queuedCount = items.filter(i => i.status === "queued").length;

  return (
    <>
      <PageHeader
        breadcrumb={["Базы знаний", kb.name, "Загрузка документов"]}
        onBreadcrumbRoot={onBack}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WKbTile id={kb.id} name={kb.name} size={28}/>
            <span>Загрузка документов</span>
          </div>
        }
        subtitle={`В базу: ${kb.name}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <WBtn variant="ghost" onClick={onBack}>Назад</WBtn>
            {allDone
              ? <WBtn variant="primary" onClick={onDone}>Готово</WBtn>
              : <WBtn variant="primary" disabled={running || queuedCount === 0} onClick={startUpload}>
                  {running ? "Загрузка…" : `Загрузить ${queuedCount > 0 ? `(${queuedCount})` : ""}`}
                </WBtn>
            }
          </div>
        }
      />

      <div style={{ padding: "24px 28px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Info bar */}
        <div style={{
          display: "flex", gap: 24, padding: "10px 16px",
          background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)",
          fontSize: 12, color: "var(--muted)",
        }}>
          <span>📁 Форматы: PDF, DOCX, MD, TXT</span>
          <span>⚙ Чанки: 512 токенов · перекрытие 50</span>
          <span>🗄 База: <b style={{ color: "var(--fg)" }}>{kb.name}</b></span>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-strong)"}`,
            borderRadius: 12,
            padding: "48px 32px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "var(--accent-soft)" : "var(--surface)",
            transition: "all 0.15s",
          }}
        >
          <input ref={fileInputRef} type="file" accept={ACCEPTED} multiple hidden
            onChange={e => addFiles(e.target.files ?? [])}/>
          <div style={{ fontSize: 32, marginBottom: 12 }}>☁️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
            Перетащите файлы сюда
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            или нажмите для выбора · PDF, DOCX, MD, TXT
          </div>
        </div>

        {/* Upload queue */}
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 1,
            border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {items.map(item => (
              <UploadRow key={item.id} item={item} onRemove={() => removeItem(item.id)}/>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: () => void }) {
  const ext = item.file.name.split(".").pop()?.toLowerCase() ?? "txt";
  const extColors: Record<string, string> = { pdf: "#DC2626", md: "#0EA5E9", docx: "#2563EB", txt: "#71717A" };
  const color = extColors[ext] || "#71717A";

  const statusIcon = item.status === "done" ? "✓" : item.status === "error" ? "✕" : null;
  const statusColor = item.status === "done" ? "var(--success)" : item.status === "error" ? "var(--danger)" : "var(--muted)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* ext badge */}
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 20, borderRadius: 3, fontSize: 9, fontWeight: 700,
        background: color, color: "#fff", fontFamily: "var(--mono)",
        letterSpacing: 0.5, flexShrink: 0,
      }}>{ext.toUpperCase()}</span>

      {/* name + size */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.file.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
          {fmtSize(item.file.size)}
        </div>
      </div>

      {/* progress bar (uploading) */}
      {item.status === "uploading" && (
        <div style={{ width: 120, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 10.5, color: "var(--muted)", marginBottom: 3 }}>
            <span>Загрузка…</span><span>{item.progress}%</span>
          </div>
          <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 999 }}>
            <div style={{ width: `${item.progress}%`, height: "100%",
              background: "var(--accent)", borderRadius: 999, transition: "width 0.1s" }}/>
          </div>
        </div>
      )}

      {/* status */}
      {item.status !== "uploading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {statusIcon && (
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 700 }}>{statusIcon}</span>
          )}
          {item.status === "queued" && (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>В очереди</span>
          )}
          {item.status === "done" && (
            <span style={{ fontSize: 11.5, color: "var(--success)" }}>Загружен</span>
          )}
          {item.status === "error" && (
            <span style={{ fontSize: 11.5, color: "var(--danger)" }} title={item.error}>Ошибка</span>
          )}
        </div>
      )}

      {/* remove (only if not uploading) */}
      {item.status !== "uploading" && (
        <button onClick={onRemove} style={{
          width: 22, height: 22, border: 0, background: "transparent",
          color: "var(--muted)", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <WIcon name="close" size={11}/>
        </button>
      )}
    </div>
  );
}
