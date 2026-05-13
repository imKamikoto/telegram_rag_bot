import React, { useEffect, useState } from "react";
import { fetchStats } from "../api";
import { StatsActivityItem, KnowledgeBase, User } from "../types";
import { PageHeader } from "../components/layout";
import { WAvatar } from "../components/primitives";

const EVENT_LABELS: Record<string, string> = {
  kb_created:        "База знаний создана",
  document_uploaded: "Документ загружен",
  user_registered:   "Новый пользователь",
  kb_access_granted: "Доступ выдан",
  kb_access_revoked: "Доступ отозван",
  role_changed:      "Роль изменена",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function ScreenJournal({ users, kbs }: { users: User[]; kbs: KnowledgeBase[] }) {
  const [activity, setActivity] = useState<StatsActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(s => setActivity(s.activity)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const userMap = new Map(users.map(u => [u.id, u]));
  const kbMap = new Map(kbs.map(k => [k.id, k]));

  return (
    <>
      <PageHeader title="Журнал" subtitle="Полная история событий в системе"/>
      <div style={{ padding: "0 28px" }}>
        {loading && <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0" }}>Загрузка…</div>}
        {!loading && activity.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0" }}>Нет событий</div>
        )}
        {activity.map((item, i) => {
          const meta = item.meta as Record<string, string>;
          const actor = item.actor_id ? userMap.get(item.actor_id) : null;
          const target = item.target_user_id ? userMap.get(item.target_user_id) : null;
          const kb = item.knowledge_base_id ? kbMap.get(item.knowledge_base_id) : null;
          const name = actor?.telegram_name ?? target?.telegram_name ?? meta.telegram_name ?? null;
          const detail = meta.file_name ?? meta.new_role ?? kb?.name ?? null;

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              {name
                ? <WAvatar name={name} size={28}/>
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>◦</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500 }}>
                  {EVENT_LABELS[item.event] ?? item.event}
                </span>
                {detail && <span style={{ fontSize: 12.5, color: "var(--muted)" }}> · {detail}</span>}
                {name && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{name}</div>}
              </div>
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)",
                whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(item.created_at)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
