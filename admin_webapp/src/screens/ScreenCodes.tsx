import React, { useCallback, useState } from "react";
import { InviteCode, KnowledgeBase } from "../types";
import { PageHeader, Toolbar, WTable, Modal } from "../components/layout";
import { WBtn, WChip, WKbTile, WSearch, fmt, kbColor } from "../components/primitives";
import { WIcon } from "../components/icons";

// ─── Code preview generator ───────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randSeg(len: number) {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}
function genCode(prefix: string) {
  const p = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const seg1 = randSeg(4);
  const seg2 = randSeg(4);
  return p ? `${p}-${seg1}-${seg2}` : `${randSeg(3)}-${seg1}-${seg2}`;
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ kbs, busy, onCreate, onClose }: {
  kbs: KnowledgeBase[]; busy: boolean;
  onCreate: (maxUses: number | undefined, kbId: number | undefined, code: string) => void;
  onClose: () => void;
}) {
  const [prefix,      setPrefix]      = useState("");
  const [limitOn,     setLimitOn]     = useState(true);
  const [maxUses,     setMaxUses]     = useState("10");
  const [expiresAt,   setExpiresAt]   = useState("");
  const [selectedKbs, setSelectedKbs] = useState<Set<number>>(new Set());
  const [preview,     setPreview]     = useState(() => genCode(""));

  const refreshCode = useCallback(() => setPreview(genCode(prefix)), [prefix]);

  const toggleKb = (id: number) =>
    setSelectedKbs(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const handleCreate = () => {
    const mu = limitOn && maxUses ? Number(maxUses) : undefined;
    const kbArr = Array.from(selectedKbs);
    if (kbArr.length === 0) {
      onCreate(mu, undefined, preview);
    } else {
      // Первый KB — с превью-кодом, остальные — бэкенд сгенерирует сам
      kbArr.forEach((kbId, i) => onCreate(mu, kbId, i === 0 ? preview : genCode(prefix)));
    }
    onClose();
  };

  return (
    <Modal
      title="Сгенерировать код доступа"
      subtitle="Настройте параметры кода перед созданием"
      onClose={onClose}
      footer={<>
        <WBtn variant="ghost" onClick={onClose}>Отмена</WBtn>
        <WBtn variant="primary" disabled={busy} onClick={handleCreate}>Сгенерировать</WBtn>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Code preview */}
        <div style={{
          background: "var(--surface)", borderRadius: 8, padding: "14px 16px",
          border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 8, fontWeight: 500 }}>Предпросмотр кода</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              flex: 1, fontFamily: "var(--mono)", fontSize: 17, fontWeight: 700,
              color: "var(--fg)", letterSpacing: 2,
            }}>{preview}</span>
            <button onClick={() => { navigator.clipboard?.writeText(preview); }} title="Скопировать"
              style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--bg)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <WIcon name="copy" size={13}/>
            </button>
            <button onClick={refreshCode} title="Обновить"
              style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--bg)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <WIcon name="refresh" size={13}/>
            </button>
          </div>
        </div>

        {/* Prefix */}
        <div>
          <label style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500, display: "block", marginBottom: 5 }}>
            Префикс кода
          </label>
          <input
            value={prefix}
            onChange={e => { setPrefix(e.target.value); setPreview(genCode(e.target.value)); }}
            placeholder="Например: ENG, HR, SALES…"
            maxLength={6}
            style={{
              width: "100%", height: 30, padding: "0 10px", borderRadius: 5,
              border: "1px solid var(--border)", background: "var(--bg)",
              color: "var(--fg)", fontSize: 12.5, fontFamily: "var(--mono)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Limit */}
        <div>
          <label style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500, display: "block", marginBottom: 5 }}>
            Лимит использований
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number" min={1}
              value={limitOn ? maxUses : ""}
              disabled={!limitOn}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="10"
              style={{
                width: 80, height: 30, padding: "0 10px", borderRadius: 5,
                border: "1px solid var(--border)", background: limitOn ? "var(--bg)" : "var(--surface)",
                color: "var(--fg)", fontSize: 12.5, fontFamily: "var(--mono)",
                outline: "none", opacity: limitOn ? 1 : 0.5,
              }}
            />
            <button onClick={() => setLimitOn(v => !v)} style={{
              height: 30, padding: "0 10px", borderRadius: 5,
              border: "1px solid var(--border)", background: limitOn ? "var(--bg)" : "var(--accent-soft)",
              color: limitOn ? "var(--muted)" : "var(--accent)", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {limitOn ? "Без ограничений" : "∞ Без ограничений"}
            </button>
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500, display: "block", marginBottom: 5 }}>
            Срок действия
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            style={{
              height: 30, padding: "0 10px", borderRadius: 5,
              border: "1px solid var(--border)", background: "var(--bg)",
              color: expiresAt ? "var(--fg)" : "var(--muted)", fontSize: 12.5,
              fontFamily: "var(--mono)", outline: "none",
            }}
          />
          {!expiresAt && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>Не указан — бессрочный</span>}
        </div>

        {/* KB grid */}
        {kbs.length > 0 && (
          <div>
            <label style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500, display: "block", marginBottom: 8 }}>
              Привязать к базам знаний
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6, fontWeight: 400 }}>
                (необязательно)
              </span>
            </label>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6,
            }}>
              {kbs.map(kb => {
                const checked = selectedKbs.has(kb.id);
                return (
                  <button key={kb.id} onClick={() => toggleKb(kb.id)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 7, border: "1px solid",
                    borderColor: checked ? kbColor(kb.id) : "var(--border)",
                    background: checked ? `${kbColor(kb.id)}18` : "var(--bg)",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}>
                    <WKbTile id={kb.id} name={kb.name} size={20}/>
                    <span style={{ fontSize: 12, color: "var(--fg)", fontWeight: checked ? 600 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {kb.name}
                    </span>
                    {checked && (
                      <svg width={12} height={12} viewBox="0 0 16 16" style={{ color: kbColor(kb.id), marginLeft: "auto", flexShrink: 0 }}>
                        <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function ScreenCodes({ invites, kbs, busy, onCreate, onCopy }: {
  invites: InviteCode[]; kbs: KnowledgeBase[]; busy: boolean;
  onCreate: (maxUses: number | undefined, kbId: number | undefined, code: string) => void;
  onCopy: (code: string) => void;
}) {
  const [q, setQ]           = useState("");
  const [filter, setFilter] = useState<"all"|"active"|"used">("all");
  const [showModal, setShowModal] = useState(false);

  const kbMap = new Map(kbs.map(k => [k.id, k]));

  const filtered = invites.filter(i => {
    if (filter === "active" && i.is_used) return false;
    if (filter === "used" && !i.is_used) return false;
    if (q && !i.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { l: "Активных",       v: invites.filter(i => !i.is_used).length,              sub: "из " + invites.length },
    { l: "Использованных", v: invites.filter(i => i.is_used).length,               sub: "кодов" },
    { l: "Всего выдано",   v: invites.reduce((s, i) => s + i.used_count, 0),        sub: "активаций" },
  ];

  return (
    <>
      <PageHeader
        title="Коды доступа"
        subtitle="Многоразовые коды для приглашения пользователей"
        action={<WBtn variant="primary" size="md" icon="plus" onClick={() => setShowModal(true)}>
          Сгенерировать
        </WBtn>}
      />

      {showModal && (
        <CreateModal
          kbs={kbs} busy={busy}
          onCreate={onCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1,
        background: "var(--border)", borderBottom: "1px solid var(--border)" }}>
        {stats.map(s => (
          <div key={s.l} style={{ background: "var(--bg)", padding: "14px 20px" }}>
            <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase",
              letterSpacing: 0.5, fontWeight: 500 }}>{s.l}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: -0.4 }}>{s.v}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <Toolbar>
        <WSearch placeholder="Поиск кода…" value={q} onChange={setQ} width={220}/>
        {(["all","active","used"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            height: 26, padding: "0 10px", borderRadius: 5, border: 0,
            background: filter === f ? "var(--surface-2)" : "transparent",
            color: filter === f ? "var(--fg)" : "var(--muted)",
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            {f === "all" ? "Все" : f === "active" ? "Активные" : "Использованные"}
          </button>
        ))}
      </Toolbar>

      <WTable<InviteCode>
        columns={[
          { label: "Код", cell: c => (
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
              {c.code}
            </span>
          )},
          { label: "База знаний", w: 160, cell: c => {
            if (!c.knowledge_base_id) return <span style={{ color: "var(--muted)" }}>—</span>;
            const kb = kbMap.get(c.knowledge_base_id);
            return kb ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <WKbTile id={kb.id} name={kb.name} size={16}/>
                <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{kb.name}</span>
              </div>
            ) : <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 12 }}>#{c.knowledge_base_id}</span>;
          }},
          { label: "Использования", w: 180, cell: c => {
            const pct = c.max_uses ? c.used_count / c.max_uses : 0;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-2)", minWidth: 48 }}>
                  {c.used_count}{c.max_uses ? `/${c.max_uses}` : "/∞"}
                </span>
                {c.max_uses && (
                  <div style={{ flex: 1, height: 4, background: "var(--surface-2)",
                    borderRadius: 999, overflow: "hidden", minWidth: 60 }}>
                    <div style={{ width: `${pct * 100}%`, height: "100%",
                      background: pct >= 1 ? "var(--muted)" : "var(--accent)" }}/>
                  </div>
                )}
              </div>
            );
          }},
          { label: "Статус", w: 110, cell: c => (
            c.is_used
              ? <WChip tone="muted">✓ Использован</WChip>
              : <WChip tone="success">● Активен</WChip>
          )},
          { label: "Действителен до", w: 130, cell: c => (
            <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
              {c.expires_at ? fmt(c.expires_at) : "Бессрочный"}
            </span>
          )},
          { label: "", w: 60, cell: c => (
            <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
              <WBtn variant="ghost" icon="copy" onClick={() => onCopy(c.code)}/>
            </div>
          )},
        ]}
        rows={filtered}
        empty="Нет инвайт-кодов"
      />
    </>
  );
}
