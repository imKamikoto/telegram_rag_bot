import React, { useEffect, useMemo, useState } from "react";
import { Document, KBMember, KnowledgeBase, User } from "../types";
import { addKBMember, fetchDocuments, fetchKBMembers, indexDocument, removeKBMember, toggleDocumentActive, deleteDocument } from "../api";
import { PageHeader, Modal, Toolbar, WTable } from "../components/layout";
import { WAvatar, WBtn, WChip, WDocBadge, WKbTile, WSearch, fmt, fmtSize } from "../components/primitives";

type KbDetailTab = "docs" | "access" | "queries" | "settings";

export function ScreenKBDetail({ kb, allDocuments, users, busy, onBack, onDelete, onOpenUpload }: {
  kb: KnowledgeBase;
  allDocuments: Document[];
  users: User[];
  busy: boolean;
  onBack: () => void;
  onDelete: (kb: KnowledgeBase) => void;
  onOpenUpload: (kbId: number) => void;
}) {
  const [tab, setTab]           = useState<KbDetailTab>("docs");
  const [docs, setDocs]         = useState<Document[]>([]);
  const [members, setMembers]   = useState<KBMember[]>([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [indexingIds, setIndexingIds]   = useState<Set<number>>(new Set());
  const [docQ, setDocQ]         = useState("");
  const [memberQ, setMemberQ]   = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQ, setAddQ]         = useState("");
  const [addBusy, setAddBusy]   = useState(false);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([fetchDocuments(kb.id), fetchKBMembers(kb.id)])
      .then(([dRes, mRes]) => {
        setDocs(dRes.documents);
        setMembers(mRes.members);
      })
      .finally(() => setLoadingData(false));
  }, [kb.id]);

  const memberIds = useMemo(() => new Set(members.map(m => m.user_id)), [members]);
  const userMap   = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const availableUsers = useMemo(
    () => users.filter(u => !memberIds.has(u.id)),
    [users, memberIds],
  );
  const filteredAvailable = availableUsers.filter(u =>
    u.telegram_name.toLowerCase().includes(addQ.toLowerCase())
  );

  const handleAddMember = async (userId: number) => {
    setAddBusy(true);
    try {
      await addKBMember(kb.id, userId);
      const r = await fetchKBMembers(kb.id);
      setMembers(r.members);
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    await removeKBMember(kb.id, userId);
    const r = await fetchKBMembers(kb.id);
    setMembers(r.members);
  };

  const filteredDocs = docs.filter(d =>
    d.file_name.toLowerCase().includes(docQ.toLowerCase())
  );

  const filteredMembers = members.filter(m => {
    const u = userMap.get(m.user_id);
    const name = u?.telegram_name ?? String(m.user_id);
    return name.toLowerCase().includes(memberQ.toLowerCase());
  });

  const handleIndex = async (doc: Document) => {
    setIndexingIds(prev => new Set(prev).add(doc.id));
    try {
      await indexDocument(doc.id);
      const dRes = await fetchDocuments(kb.id);
      setDocs(dRes.documents);
    } finally {
      setIndexingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s; });
    }
  };

  const docStatusTone = (d: Document): "success" | "warn" | "danger" | "muted" => {
    if (indexingIds.has(d.id))      return "warn";
    if (d.status === "ready")       return "success";
    if (d.status === "indexing")    return "warn";
    if (d.status === "pending")     return "muted";
    return "danger";
  };

  const docStatusLabel = (d: Document) => {
    if (indexingIds.has(d.id))      return "Индексация…";
    if (d.status === "ready")       return "Индексирован";
    if (d.status === "indexing")    return "Индексация…";
    if (d.status === "pending")     return "Не индексирован";
    return d.status;
  };

  const tabs: { v: KbDetailTab; l: string; count?: number }[] = [
    { v: "docs",     l: "Документы", count: docs.length },
    { v: "access",   l: "Доступ",    count: members.length },
    { v: "queries",  l: "Запросы" },
    { v: "settings", l: "Настройки" },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={["Базы знаний", kb.name]}
        onBreadcrumbRoot={onBack}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <WKbTile id={kb.id} name={kb.name} size={28}/>
            <span>{kb.name}</span>
            <WChip tone="muted">Приватная</WChip>
          </div>
        }
        subtitle={kb.description || "Без описания"}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <WBtn variant="secondary" size="md" icon="refresh">Переиндексировать</WBtn>
            <WBtn variant="primary" size="md" icon="upload" onClick={() => onOpenUpload(kb.id)}>
              Добавить документ
            </WBtn>
          </div>
        }
      />

      <div style={{ display: "flex", padding: "0 28px", borderBottom: "1px solid var(--border)", marginTop: 4 }}>
        {tabs.map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{
            padding: "10px 16px", border: 0, background: "transparent",
            color: tab === t.v ? "var(--fg)" : "var(--muted)",
            fontSize: 13, fontWeight: tab === t.v ? 600 : 400,
            borderBottom: tab === t.v ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.l}
            {t.count !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 500, color: tab === t.v ? "var(--accent)" : "var(--muted)",
                background: tab === t.v ? "rgba(124,92,255,.1)" : "var(--surface-2)",
                borderRadius: 10, padding: "1px 6px",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "docs" && (
        <>
          <Toolbar>
            <WSearch placeholder="Поиск документов…" value={docQ} onChange={setDocQ} width={240}/>
            <WBtn variant="ghost" size="sm" icon="filter">Тип</WBtn>
            <WBtn variant="ghost" size="sm" icon="filter">Статус</WBtn>
            <div style={{ flex: 1 }}/>
            <WBtn variant="ghost" size="sm" icon="download">Экспорт</WBtn>
          </Toolbar>
          {loadingData ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Загрузка…</div>
          ) : (
            <WTable<Document>
              columns={[
                { label: "", w: 32, cell: () => (
                  <input type="checkbox" style={{ accentColor: "var(--accent)" }}/>
                )},
                { label: "Документ", cell: d => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <WDocBadge type={(d.file_name.split(".").pop() || "txt").toLowerCase()}/>
                    <span style={{ color: "var(--fg)", fontWeight: 500 }}>{d.file_name}</span>
                  </div>
                )},
                { label: "Размер", w: 80, cell: d => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>
                    {d.content_length > 0 ? fmtSize(d.content_length) : "—"}
                  </span>
                )},
                { label: "Стр.", w: 60, cell: d => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>
                    {d.page_count ?? "—"}
                  </span>
                )},
                { label: "Чанки", w: 72, cell: d => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>
                    {d.status === "ready" ? d.chunk_count : "—"}
                  </span>
                )},
                { label: "Статус", w: 150, cell: d => (
                  <WChip tone={docStatusTone(d)}>{docStatusLabel(d)}</WChip>
                )},
                { label: "Добавлен", w: 110, cell: d => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
                    {fmt(d.created_at)}
                  </span>
                )},
                { label: "", w: 120, cell: d => (
                  <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                    {(d.status === "pending" || d.status === "error") && (
                      <WBtn variant="secondary" size="sm"
                        disabled={indexingIds.has(d.id)}
                        onClick={() => handleIndex(d)}>
                        {indexingIds.has(d.id) ? "…" : "Индексировать"}
                      </WBtn>
                    )}
                    {d.status === "ready" && (
                      <WBtn variant="ghost" icon="check" onClick={() =>
                        toggleDocumentActive(d.id, !d.active)
                          .then(() => fetchDocuments(kb.id).then(r => setDocs(r.documents)))}/>
                    )}
                    <WBtn variant="danger" icon="trash" onClick={() =>
                      deleteDocument(d.id)
                        .then(() => fetchDocuments(kb.id).then(r => setDocs(r.documents)))}/>
                  </div>
                )},
              ]}
              rows={filteredDocs}
              empty="Нет документов"
            />
          )}
        </>
      )}

      {tab === "access" && (
        <>
          <Toolbar>
            <WSearch placeholder="Поиск участников…" value={memberQ} onChange={setMemberQ} width={240}/>
            <div style={{ flex: 1 }}/>
            <WBtn variant="primary" size="sm" icon="plus" onClick={() => { setAddQ(""); setShowAddModal(true); }}>
              Добавить пользователя
            </WBtn>
          </Toolbar>

          {/* Add user modal */}
          {showAddModal && (
            <Modal
              title="Добавить пользователя"
              subtitle="Выберите из списка — пользователь получит доступ к базе"
              onClose={() => setShowAddModal(false)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  height: 32, padding: "0 10px", borderRadius: 6,
                  border: "1px solid var(--border)", background: "var(--bg)",
                }}>
                  <svg width={13} height={13} viewBox="0 0 16 16" style={{ color: "var(--muted)", flexShrink: 0 }}>
                    <path d="M14 14l-3-3m1-4a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                  </svg>
                  <input
                    autoFocus
                    value={addQ}
                    onChange={e => setAddQ(e.target.value)}
                    placeholder="Поиск по имени…"
                    style={{ flex: 1, border: 0, background: "transparent",
                      color: "var(--fg)", fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
                  />
                </div>
                <div style={{
                  maxHeight: 280, overflowY: "auto",
                  border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
                }}>
                  {filteredAvailable.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center",
                      color: "var(--muted)", fontSize: 12.5 }}>
                      {availableUsers.length === 0 ? "Все пользователи уже добавлены" : "Ничего не найдено"}
                    </div>
                  ) : (
                    filteredAvailable.map(u => (
                      <button key={u.id} disabled={addBusy}
                        onClick={() => handleAddMember(u.id)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 14px", border: 0, borderBottom: "1px solid var(--border)",
                          background: "var(--bg)", cursor: addBusy ? "not-allowed" : "pointer",
                          textAlign: "left", fontFamily: "inherit",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--bg)")}
                      >
                        <WAvatar name={u.telegram_name} size={28}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg)" }}>
                            @{u.telegram_name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {u.role === "admin" ? "Администратор" : "Пользователь"} · TG {u.telegram_id}
                          </div>
                        </div>
                        <svg width={14} height={14} viewBox="0 0 16 16" style={{ color: "var(--accent)", flexShrink: 0 }}>
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </Modal>
          )}

          {loadingData ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Загрузка…</div>
          ) : (
            <WTable<KBMember>
              columns={[
                { label: "Пользователь", cell: m => {
                  const u = userMap.get(m.user_id);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <WAvatar name={u?.telegram_name ?? String(m.user_id)} size={24}/>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg)" }}>
                          @{u?.telegram_name ?? `user #${m.user_id}`}
                        </div>
                        {u && (
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            ID {u.telegram_id} · {u.role}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }},
                { label: "Добавлен", w: 150, cell: m => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
                    {fmt(m.created_at)}
                  </span>
                )},
                { label: "", w: 60, cell: m => (
                  <WBtn variant="danger" icon="trash"
                    onClick={() => handleRemoveMember(m.user_id)}/>
                )},
              ]}
              rows={filteredMembers}
              empty="Нет участников"
            />
          )}
        </>
      )}

      {tab === "queries" && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          История запросов пока недоступна
        </div>
      )}

      {tab === "settings" && (
        <div style={{ padding: "24px 28px", maxWidth: 480 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {[
                { l: "Название", v: kb.name },
                { l: "Описание", v: kb.description || "—" },
                { l: "ID", v: `#${kb.id}`, mono: true },
                { l: "Создана", v: fmt(kb.created_at), mono: true },
              ].map((f, i, arr) => (
                <div key={f.l} style={{
                  display: "grid", gridTemplateColumns: "160px 1fr",
                  padding: "10px 14px", alignItems: "center",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : 0,
                }}>
                  <span style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{f.l}</span>
                  <span style={{ fontSize: 12.5, color: "var(--fg)", fontFamily: f.mono ? "var(--mono)" : "inherit" }}>{f.v}</span>
                </div>
              ))}
            </div>
            <WBtn variant="danger" size="md" icon="trash" disabled={busy} onClick={() => { onDelete(kb); onBack(); }}>
              Удалить базу знаний
            </WBtn>
          </div>
        </div>
      )}
    </>
  );
}
