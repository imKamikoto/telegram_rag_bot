import React, { useState } from "react";
import { Document, KnowledgeBase } from "../types";
import { PageHeader, Toolbar, WTable, Modal, FieldRow, WInput } from "../components/layout";
import { WBtn, WKbTile, WSearch, fmt } from "../components/primitives";

export function ScreenKBList({ kbs, documents, busy, onCreate, onDelete, onSelectKb }: {
  kbs: KnowledgeBase[]; documents: Document[]; busy: boolean;
  onCreate: (name: string, desc: string) => void;
  onDelete: (kb: KnowledgeBase) => void;
  onSelectKb: (kb: KnowledgeBase) => void;
}) {
  const [q, setQ]               = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName]         = useState("");
  const [desc, setDesc]         = useState("");

  const filtered = kbs.filter(kb =>
    kb.name.toLowerCase().includes(q.toLowerCase()) ||
    (kb.description || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Базы знаний"
        subtitle={`${kbs.length} баз · ${documents.length} документов`}
        action={<WBtn variant="primary" size="md" icon="plus" onClick={() => setShowCreate(v => !v)}>
          Новая база
        </WBtn>}
      />

      {showCreate && (
        <Modal title="Создать базу знаний" subtitle="Новая база для хранения документов"
          onClose={() => setShowCreate(false)}
          footer={<>
            <WBtn variant="ghost" onClick={() => setShowCreate(false)}>Отмена</WBtn>
            <WBtn variant="primary" disabled={busy || !name.trim()} onClick={() => {
              onCreate(name.trim(), desc.trim());
              setName(""); setDesc(""); setShowCreate(false);
            }}>Создать</WBtn>
          </>}>
          <FieldRow label="Название"><WInput value={name} onChange={setName} placeholder="Engineering Wiki"/></FieldRow>
          <FieldRow label="Описание"><WInput value={desc} onChange={setDesc} placeholder="Опционально"/></FieldRow>
        </Modal>
      )}

      <Toolbar>
        <WSearch placeholder="Поиск баз…" value={q} onChange={setQ} width={240}/>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{filtered.length} баз</span>
      </Toolbar>

      <WTable<KnowledgeBase>
        columns={[
          { label: "Название", cell: kb => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <WKbTile id={kb.id} name={kb.name} size={22}/>
              <span style={{ fontWeight: 500, color: "var(--fg)" }}>{kb.name}</span>
            </div>
          )},
          { label: "Описание", cell: kb => (
            <span style={{ color: "var(--muted)" }}>{kb.description || "—"}</span>
          )},
          { label: "Документов", w: 100, cell: kb => (
            <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
              {documents.filter(d => d.knowledge_base_id === kb.id).length}
            </span>
          )},
          { label: "Создана", w: 130, cell: kb => (
            <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
              {fmt(kb.created_at)}
            </span>
          )},
          { label: "", w: 44, cell: kb => (
            <div onClick={e => e.stopPropagation()}>
              <WBtn variant="danger" icon="trash" disabled={busy} onClick={() => onDelete(kb)}/>
            </div>
          )},
        ]}
        rows={filtered}
        onRow={onSelectKb}
        empty="Нет баз знаний"
      />
    </>
  );
}
