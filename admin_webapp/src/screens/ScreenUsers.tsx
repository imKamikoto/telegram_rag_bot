import React, { useState } from "react";
import { KnowledgeBase, User, UserRole } from "../types";
import { PageHeader, Toolbar, WTable } from "../components/layout";
import { WAvatar, WBtn, WChip, WKbTile, WSearch, fmt } from "../components/primitives";

export function ScreenUsers({ users, kbs, busy, onRoleChange, onDelete }: {
  users: User[]; kbs: KnowledgeBase[]; busy: boolean;
  onRoleChange: (u: User, r: UserRole) => void;
  onDelete: (u: User) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"admin"|"user">("all");

  const filtered = users.filter(u => {
    if (filter !== "all" && u.role !== filter) return false;
    if (q && !u.telegram_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Пользователи"
        subtitle={`${users.length} активных пользователей`}
        action={<WBtn variant="secondary" size="md" icon="download">CSV</WBtn>}
      />
      <Toolbar>
        <WSearch placeholder="Поиск по имени…" value={q} onChange={setQ} width={220}/>
        {(["all","admin","user"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            height: 26, padding: "0 10px", borderRadius: 5, border: 0,
            background: filter === f ? "var(--surface-2)" : "transparent",
            color: filter === f ? "var(--fg)" : "var(--muted)",
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            {f === "all" ? "Все" : f === "admin" ? "Администраторы" : "Пользователи"}
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{filtered.length} результатов</span>
      </Toolbar>
      <WTable<User>
        columns={[
          { label: "Пользователь", cell: u => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <WAvatar name={u.telegram_name} size={26}/>
              <div>
                <div style={{ color: "var(--fg)", fontWeight: 500 }}>{u.telegram_name}</div>
                <div style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11 }}>
                  TG: {u.telegram_id}
                </div>
              </div>
            </div>
          )},
          { label: "Роль", w: 120, cell: u => (
            <WChip tone={u.role === "admin" ? "accent" : "neutral"}>
              {u.role === "admin" ? "Администратор" : "Пользователь"}
            </WChip>
          )},
          { label: "Базы знаний", w: 160, cell: u => {
            const ids = u.kb_ids ?? [];
            const kbMap = new Map(kbs.map(k => [k.id, k]));
            const MAX = 4;
            const shown = ids.slice(0, MAX);
            const rest = ids.length - MAX;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {shown.map(id => {
                  const kb = kbMap.get(id);
                  return kb ? (
                    <div key={id} title={kb.name}>
                      <WKbTile id={id} name={kb.name} size={20}/>
                    </div>
                  ) : null;
                })}
                {rest > 0 && (
                  <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600 }}>+{rest}</span>
                )}
                {ids.length === 0 && <span style={{ color: "var(--muted)", fontSize: 11.5 }}>—</span>}
              </div>
            );
          }},
          { label: "Добавлен", w: 140, cell: u => (
            <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
              {u.created_at ? fmt(u.created_at) : "—"}
            </span>
          )},
          { label: "", w: 160, cell: u => (
            <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
              <select value={u.role} disabled={busy}
                onChange={e => onRoleChange(u, e.target.value as UserRole)}
                style={{ height: 26, padding: "0 8px", borderRadius: 5,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  color: "var(--fg)", fontFamily: "inherit", fontSize: 12 }}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <WBtn variant="danger" icon="trash" disabled={busy} onClick={() => onDelete(u)}/>
            </div>
          )},
        ]}
        rows={filtered}
        empty="Пользователи не найдены"
      />
    </>
  );
}
