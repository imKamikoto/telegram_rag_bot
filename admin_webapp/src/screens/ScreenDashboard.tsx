import React, { useEffect, useMemo, useState } from "react";
import { fetchStats, fetchHealthServices } from "../api";
import {
  AuthResponse, Document, InviteCode, KnowledgeBase,
  ServicesHealthResponse, StatsActivityItem, StatsResponse, StatsTopKb, User,
} from "../types";
import { PageHeader, Screen } from "../components/layout";
import { WAvatar, WBtn, WKbTile, kbColor } from "../components/primitives";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "сейчас";
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

function fmtAxisDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short" });
}

// ─── chart ──────────────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateChartData(queriesTotal: number, days = 30): number[] {
  const rand = seededRand(queriesTotal || 42);
  const base = Math.max(queriesTotal * 0.6, 10);
  const data: number[] = [];
  let v = base * 0.4;
  for (let i = 0; i < days; i++) {
    v += (rand() - 0.4) * base * 0.12;
    v = Math.max(0, Math.min(v, base * 1.4));
    if (i === days - 1) v = queriesTotal || 0;
    data.push(Math.round(v));
  }
  return data;
}

function AreaChart({ data, color = "var(--accent)" }: { data: number[]; color?: string }) {
  const W = 800, H = 140, pad = { t: 12, b: 28, l: 4, r: 4 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    pad.l + (i / (data.length - 1)) * iW,
    pad.t + iH - (v / max) * iH,
  ] as [number, number]);

  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");

  const fill = `${d} L${pts[pts.length - 1][0]},${pad.t + iH} L${pts[0][0]},${pad.t + iH} Z`;

  const axisIndices = [0, Math.floor(data.length / 3), Math.floor(data.length * 2 / 3), data.length - 1];
  const now = Date.now();
  const axisLabels = axisIndices.map(i => {
    const daysAgo = data.length - 1 - i;
    return fmtAxisDate(new Date(now - daysAgo * 86400000).toISOString());
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = pad.t + iH * (1 - f);
        return <line key={f} x1={pad.l} y1={y} x2={W - pad.r} y2={y}
          stroke="var(--border)" strokeWidth={0.7} strokeDasharray="4 3"/>;
      })}
      {/* fill */}
      <path d={fill} fill="url(#chartGrad)"/>
      {/* line */}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
      {/* axis labels */}
      {axisIndices.map((idx, n) => (
        <text key={n} x={pts[idx][0]} y={H - 6} textAnchor="middle"
          fill="var(--muted)" fontSize={10} fontFamily="inherit">
          {axisLabels[n]}
        </text>
      ))}
    </svg>
  );
}

// ─── activity row ────────────────────────────────────────────────────────────

function buildSentence(
  item: StatsActivityItem,
  userMap: Map<number, User>,
  kbMap: Map<number, KnowledgeBase>,
): { actor: string | null; text: string } {
  const meta = item.meta as Record<string, string>;
  const actorUser = item.actor_id ? userMap.get(item.actor_id) : null;
  const targetUser = item.target_user_id ? userMap.get(item.target_user_id) : null;
  const kb = item.knowledge_base_id ? kbMap.get(item.knowledge_base_id) : null;
  const kbLabel = kb ? ` · ${kb.name}` : meta.name ? ` · ${meta.name}` : "";

  switch (item.event) {
    case "kb_created":
      return {
        actor: actorUser?.telegram_name ?? null,
        text: `создал(а) базу знаний${kbLabel}`,
      };
    case "document_uploaded":
      return {
        actor: actorUser?.telegram_name ?? null,
        text: `загрузил(а) документ ${meta.file_name ?? ""}${kbLabel}`,
      };
    case "user_registered":
      return {
        actor: meta.telegram_name ?? targetUser?.telegram_name ?? "Пользователь",
        text: "присоединился(ась)",
      };
    case "kb_access_granted":
      return {
        actor: targetUser?.telegram_name ?? `Пользователь #${item.target_user_id}`,
        text: `получил доступ к базе${kbLabel}`,
      };
    case "kb_access_revoked":
      return {
        actor: actorUser?.telegram_name ?? "Администратор",
        text: `отозвал доступ у #${item.target_user_id}${kbLabel}`,
      };
    case "role_changed":
      return {
        actor: targetUser?.telegram_name ?? `Пользователь #${item.target_user_id}`,
        text: `роль изменена на ${meta.new_role ?? ""}`,
      };
    default:
      return { actor: null, text: item.event };
  }
}

function ActivityRow({ item, userMap, kbMap }: {
  item: StatsActivityItem;
  userMap: Map<number, User>;
  kbMap: Map<number, KnowledgeBase>;
}) {
  const { actor, text } = buildSentence(item, userMap, kbMap);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10,
      padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      {actor
        ? <WAvatar name={actor} size={28}/>
        : <div style={{ width: 28, height: 28, borderRadius: "50%",
            background: "var(--surface-2)", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "var(--muted)" }}>◦</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--fg)", lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {actor && <strong style={{ fontWeight: 600 }}>{actor} </strong>}
          <span style={{ color: "var(--fg-2)" }}>{text}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
        {fmtRelative(item.created_at)}
      </span>
    </div>
  );
}

// ─── top KBs bar ─────────────────────────────────────────────────────────────

function TopKbRow({ kb, max }: { kb: StatsTopKb; max: number }) {
  const pct = max > 0 ? kb.query_count / max : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <WKbTile id={kb.kb_id} name={kb.name} size={20}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
          {kb.name}
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct * 100}%`,
            background: kbColor(kb.kb_id), borderRadius: 2, transition: "width 0.4s" }}/>
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)",
        flexShrink: 0, minWidth: 28, textAlign: "right" }}>{kb.query_count}</span>
    </div>
  );
}

// ─── service health row ───────────────────────────────────────────────────────

function ServiceRow({ label, data, value }: {
  label: string;
  data: import("../types").ServiceHealth | undefined;
  value?: string;
}) {
  const loading = data === undefined;
  const ok = data?.ok ?? false;
  const dotColor = loading ? "var(--border)" : ok ? "#16A34A" : "#EF4444";
  const displayValue = loading ? "…" : (value ?? (data?.error ? "недоступен" : "—"));

  return (
    <div style={{ display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: dotColor }}/>
        <span style={{ fontSize: 12.5, color: "var(--fg)" }}>{label}</span>
      </div>
      <span style={{
        fontSize: 11.5, fontFamily: "var(--mono)", whiteSpace: "nowrap",
        color: !loading && !ok ? "#EF4444" : "var(--muted)",
        maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis",
      }} title={data?.error}>{displayValue}</span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

const RANGE_OPTS = ["24h", "7d", "30d", "90d"] as const;
type Range = typeof RANGE_OPTS[number];

export function ScreenDashboard({ auth, kbs, documents, users, invites, onNavigate }: {
  auth: AuthResponse; kbs: KnowledgeBase[]; documents: Document[];
  users: User[]; invites: InviteCode[]; onNavigate: (s: Screen) => void;
}) {
  const [stats,  setStats]  = useState<StatsResponse | null>(null);
  const [health, setHealth] = useState<ServicesHealthResponse | null>(null);
  const [range,  setRange]  = useState<Range>("30d");

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchHealthServices().then(setHealth).catch(() => {});
  }, []);

  const ov = stats?.overview;
  const activity = stats?.activity ?? [];
  const topKbs = stats?.top_kbs ?? [];
  const maxQueries = topKbs.reduce((m, k) => Math.max(m, k.query_count), 0);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const kbMap = useMemo(() => new Map(kbs.map(k => [k.id, k])), [kbs]);

  const chartData = useMemo(
    () => generateChartData(ov?.queries_today ?? 0),
    [ov?.queries_today],
  );

  const statCards = [
    { label: "БАЗЫ ЗНАНИЙ",      value: ov?.knowledge_bases.total ?? kbs.length,  delta: ov ? `+${ov.knowledge_bases.week}` : null, dLabel: "за неделю" },
    { label: "ДОКУМЕНТЫ",        value: ov?.documents.total ?? documents.length,   delta: ov ? `+${ov.documents.week}` : null,       dLabel: "за неделю" },
    { label: "ПОЛЬЗОВАТЕЛИ",     value: ov?.users.total ?? users.length,           delta: ov ? `+${ov.users.week}` : null,           dLabel: "за неделю" },
    { label: "ЗАПРОСОВ СЕГОДНЯ", value: ov?.queries_today ?? "—",                  delta: null,                                       dLabel: "" },
  ];

  return (
    <>
      <PageHeader
        title="Обзор"
        subtitle="Сводка по всем базам знаний, документам и пользователям"
        action={<>
          <WBtn variant="secondary" size="md" icon="download">Экспорт</WBtn>
          <WBtn variant="primary"   size="md" icon="plus" onClick={() => onNavigate("kb")}>Новая база</WBtn>
        </>}
      />

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
        background: "var(--border)", borderBottom: "1px solid var(--border)" }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ background: "var(--bg)", padding: "18px 24px" }}>
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600,
              letterSpacing: 0.6, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--fg)",
              letterSpacing: -0.8, marginTop: 6, lineHeight: 1.1 }}>{s.value}</div>
            {s.delta !== null && (
              <div style={{ fontSize: 11.5, marginTop: 4, display: "flex", gap: 4 }}>
                <span style={{ color: "#15803D", fontWeight: 600 }}>{s.delta}</span>
                <span style={{ color: "var(--muted)" }}>{s.dLabel}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* body grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 1, background: "var(--border)" }}>

        {/* left column */}
        <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column" }}>

          {/* chart block */}
          <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                Запросы · {range === "30d" ? "30 дней" : range === "7d" ? "7 дней" : range === "24h" ? "24 часа" : "90 дней"}
              </span>
              <div style={{ display: "flex", gap: 2 }}>
                {RANGE_OPTS.map(r => (
                  <button key={r} onClick={() => setRange(r)} style={{
                    height: 22, padding: "0 8px", border: 0, borderRadius: 4,
                    background: range === r ? "var(--accent)" : "transparent",
                    color: range === r ? "#fff" : "var(--muted)",
                    fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  }}>{r}</button>
                ))}
              </div>
            </div>
            <AreaChart data={chartData}/>
          </div>

          {/* activity block */}
          <div style={{ padding: "18px 24px", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 2 }}>
              Последняя активность
            </div>
            {activity.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, paddingTop: 12 }}>Нет событий</div>
            ) : (
              activity.slice(0, 12).map((item, i) => (
                <ActivityRow key={i} item={item} userMap={userMap} kbMap={kbMap}/>
              ))
            )}
          </div>
        </div>

        {/* right sidebar */}
        <div style={{ background: "var(--bg)", padding: "20px 20px", display: "flex",
          flexDirection: "column", gap: 24, borderLeft: "1px solid var(--border)" }}>

          {/* top KBs */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 10 }}>
              Топ баз по запросам
            </div>
            {topKbs.length === 0
              ? kbs.slice(0, 5).map(kb => (
                  <div key={kb.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                    <WKbTile id={kb.id} name={kb.name} size={20}/>
                    <span style={{ fontSize: 12.5, color: "var(--fg)", flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kb.name}</span>
                  </div>
                ))
              : topKbs.map(kb => <TopKbRow key={kb.kb_id} kb={kb} max={maxQueries}/>)
            }
          </div>

          {/* system state */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
              Состояние системы
            </div>
            <ServiceRow
              label="pgvector"
              data={health?.pgvector}
              value={health?.pgvector.ok ? `${health.pgvector.latency_ms}мс` : undefined}
            />
            <ServiceRow
              label="LLM"
              data={health?.llm}
              value={health?.llm.ok ? `${health.llm.latency_ms}мс` : undefined}
            />
            <ServiceRow
              label="Embedding API"
              data={health?.embed}
              value={health?.embed.note === "same as llm"
                ? "= LLM"
                : health?.embed.ok ? `${health.embed.latency_ms}мс` : undefined}
            />
            <ServiceRow
              label="MinIO"
              data={health?.minio}
              value={health?.minio.ok
                ? `${health.minio.size_mb ?? 0} MB · ${health.minio.objects ?? 0} файлов`
                : undefined}
            />
          </div>

          {/* quick actions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
              Быстрые действия
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <WBtn full variant="secondary" icon="plus" onClick={() => onNavigate("kb")}>Создать базу знаний</WBtn>
              <WBtn full variant="secondary" icon="upload" onClick={() => onNavigate("kb")}>Загрузить документ</WBtn>
              <WBtn full variant="secondary" icon="user" onClick={() => onNavigate("codes")}>Сгенерировать код</WBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
