import React, { useEffect, useRef, useState } from "react";
import {
  addKBMember, createInviteCode, createKnowledgeBase,
  deleteDocument, deleteKnowledgeBase, deleteUser,
  fetchAuth, fetchDocuments, fetchInviteCodes,
  fetchKBMembers, fetchKnowledgeBases, fetchUsers,
  removeKBMember, toggleDocumentActive, updateUserRole, uploadFile,
} from "./api";
import { AuthResponse, Document, InviteCode, KBMember, KnowledgeBase, User, UserRole } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const KB_COLORS = ["#7C5CFF","#FF7A59","#16A34A","#0EA5E9","#D946EF","#F59E0B","#475569","#EF4444"];
const KB_EMOJI  = ["⚙","◆","◐","◇","◼","◉","▲","●"];
const kbColor = (id: number) => KB_COLORS[(id - 1) % KB_COLORS.length];
const kbEmoji = (id: number) => KB_EMOJI[(id - 1) % KB_EMOJI.length];

// ─── Icons ────────────────────────────────────────────────────────────────────

const WI: Record<string, React.ReactNode> = {
  search:   <path d="M14 14l-3-3m1-4a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  plus:     <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  upload:   <path d="M8 11V3M5 6l3-3 3 3M3 11v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  download: <path d="M8 3v8m-3-3l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  filter:   <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  more:     <g fill="currentColor"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></g>,
  chevron:  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  chevronD: <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  refresh:  <path d="M13 8a5 5 0 11-1.5-3.5L13 6V3M3 8a5 5 0 011.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  trash:    <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  copy:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="5" width="8" height="9" rx="1"/><path d="M5 5V3a1 1 0 011-1h7a1 1 0 011 1v8a1 1 0 01-1 1h-2"/></g>,
  check:    <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  user:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></g>,
  spark:    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M4 12l2-2M10 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>,
  lock:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3.5" y="7" width="9" height="6" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></g>,
  bell:     <path d="M3.5 12V7a4.5 4.5 0 019 0v5l1 1h-11l1-1zM6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  close:    <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
};

function WIcon({ name, size = 14, color }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      style={{ color: color || "currentColor", display: "block", flexShrink: 0 }}>
      {WI[name]}
    </svg>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function WBtn({
  children, variant = "secondary", size = "sm", icon, onClick, disabled, full,
}: {
  children?: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger";
  size?: "sm"|"md"; icon?: string; onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean; full?: boolean;
}) {
  const h = size === "md" ? 30 : 26;
  const fs = size === "md" ? 12.5 : 12;
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--accent)", color: "#fff", border: 0 },
    secondary: { background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--border-strong)" },
    ghost:     { background: "transparent", color: "var(--fg-2)", border: "1px solid transparent" },
    danger:    { background: "transparent", color: "#DC2626", border: "1px solid var(--border-strong)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      height: h,
      padding: icon && !children ? 0 : "0 10px",
      width: icon && !children ? h : full ? "100%" : "auto",
      borderRadius: 6, fontSize: fs, fontWeight: 500, fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1, flexShrink: 0,
    }}>
      {icon && <WIcon name={icon} size={13}/>}
      {children}
    </button>
  );
}

function WChip({ children, tone = "neutral" }: {
  children: React.ReactNode;
  tone?: "neutral"|"accent"|"success"|"warn"|"danger"|"muted";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: "var(--surface-2)", fg: "var(--fg-2)" },
    accent:  { bg: "var(--accent-soft)", fg: "var(--accent)" },
    success: { bg: "rgba(22,163,74,0.10)", fg: "#15803D" },
    warn:    { bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
    danger:  { bg: "rgba(220,38,38,0.10)", fg: "#B91C1C" },
    muted:   { bg: "var(--surface-2)", fg: "var(--muted)" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      height: 18, padding: "0 6px", borderRadius: 4,
      background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function WAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#7C5CFF","#FF7A59","#16A34A","#0EA5E9","#D946EF","#F59E0B"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 600,
    }}>{initials}</div>
  );
}

function WKbTile({ id, name, size = 22 }: { id: number; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.max(4, size * 0.22),
      background: kbColor(id), color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.55, fontWeight: 700,
    }}>{kbEmoji(id)}</div>
  );
}

function WDocBadge({ type }: { type: string }) {
  const colors: Record<string, string> = { pdf: "#DC2626", md: "#0EA5E9", docx: "#2563EB", txt: "#71717A" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 18, borderRadius: 3, fontSize: 9, fontWeight: 700,
      background: colors[type] || "#71717A", color: "#fff", fontFamily: "var(--mono)",
      letterSpacing: 0.5, flexShrink: 0,
    }}>{type.toUpperCase()}</span>
  );
}

function WSearch({
  placeholder, value, onChange, width = 220,
}: { placeholder: string; value?: string; onChange?: (v: string) => void; width?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      height: 26, width, padding: "0 8px", borderRadius: 6,
      border: "1px solid var(--border)", background: "var(--bg)", color: "var(--muted)",
      flexShrink: 0,
    }}>
      <WIcon name="search" size={12}/>
      {onChange
        ? <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, border: 0, background: "transparent", color: "var(--fg)",
              fontSize: 12, fontFamily: "inherit", outline: "none" }}/>
        : <span style={{ fontSize: 12 }}>{placeholder}</span>}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

type Screen = "home" | "kb" | "users" | "codes" | "settings";

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: "home",     label: "Обзор" },
  { id: "kb",       label: "Базы знаний" },
  { id: "users",    label: "Пользователи" },
  { id: "codes",    label: "Коды доступа" },
  { id: "settings", label: "Настройки" },
];

function WTopNav({ active, onChange, auth, onRefresh, busy }: {
  active: Screen; onChange: (s: Screen) => void;
  auth: AuthResponse; onRefresh: () => void; busy: boolean;
}) {
  return (
    <div style={{
      height: 44, display: "flex", alignItems: "center",
      padding: "0 20px", gap: 0, flexShrink: 0,
      borderBottom: "1px solid var(--border)", background: "var(--bg)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 24 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: "var(--accent)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
        }}>R</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>RAG Admin</span>
        <span style={{
          fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)",
          padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3,
        }}>v2.0</span>
      </div>

      {/* Nav items */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_ITEMS.map(it => (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            height: 26, padding: "0 10px", border: 0, borderRadius: 5,
            background: active === it.id ? "var(--surface-2)" : "transparent",
            color: active === it.id ? "var(--fg)" : "var(--fg-2)",
            fontSize: 12.5, fontWeight: active === it.id ? 600 : 500,
            fontFamily: "inherit", cursor: "pointer",
          }}>{it.label}</button>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <WBtn variant="ghost" icon="refresh" onClick={onRefresh} disabled={busy}/>
        <div style={{ width: 1, height: 16, background: "var(--border)" }}/>
        <WAvatar name={auth.user.telegram_name} size={22}/>
        <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>
          @{auth.user.telegram_name}
        </span>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action, breadcrumb, onBreadcrumbRoot }: {
  title: React.ReactNode; subtitle?: string;
  action?: React.ReactNode; breadcrumb?: string[];
  onBreadcrumbRoot?: () => void;
}) {
  return (
    <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      {breadcrumb && (
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6,
          display: "flex", alignItems: "center", gap: 6 }}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <WIcon name="chevron" size={10} color="var(--muted)"/>}
              {i === 0 && onBreadcrumbRoot ? (
                <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={onBreadcrumbRoot}>{b}</span>
              ) : (
                <span style={{ color: i === breadcrumb.length - 1 ? "var(--fg-2)" : "var(--muted)" }}>{b}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.3 }}>
            {title}
          </h1>
          {subtitle && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "10px 28px", borderBottom: "1px solid var(--border)", flexShrink: 0,
    }}>{children}</div>
  );
}

type ColDef<T> = { label: string; w?: number; cell: (row: T) => React.ReactNode };

function WTable<T>({ columns, rows, onRow, empty = "Нет данных" }: {
  columns: ColDef<T>[]; rows: T[];
  onRow?: (r: T) => void; empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 28px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        {empty}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((c, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "8px 12px 8px",
                fontSize: 10.5, fontWeight: 500, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: 0.5, width: c.w,
                whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={() => onRow?.(r)} style={{
              borderBottom: "1px solid var(--border)",
              cursor: onRow ? "pointer" : "default",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => { if (onRow) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              {columns.map((c, j) => (
                <td key={j} style={{ padding: "7px 12px", color: "var(--fg)", verticalAlign: "middle" }}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        width: 480, background: "var(--bg)", borderRadius: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden",
        border: "1px solid var(--border)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ width: 24, height: 24, border: 0,
            background: "transparent", color: "var(--muted)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WIcon name="close" size={14}/>
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", gap: 8, padding: "12px 18px",
            borderTop: "1px solid var(--border)", background: "var(--surface)", justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr",
      gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
      <label style={{ fontSize: 12.5, color: "var(--fg-2)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function WInput({ value, onChange, placeholder, type = "text", mono }: {
  value?: string | number; onChange?: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      style={{
        height: 28, padding: "0 10px", borderRadius: 5, outline: "none",
        border: "1px solid var(--border)", background: "var(--bg)",
        color: "var(--fg)", fontFamily: mono ? "var(--mono)" : "inherit",
        fontSize: 12.5, width: "100%",
      }}/>
  );
}

// ─── Screen: Dashboard ────────────────────────────────────────────────────────

function ScreenDashboard({ auth, kbs, documents, users, invites, onNavigate }: {
  auth: AuthResponse; kbs: KnowledgeBase[]; documents: Document[];
  users: User[]; invites: InviteCode[]; onNavigate: (s: Screen) => void;
}) {
  const stats = [
    { label: "Базы знаний",     value: kbs.length,                                 delta: "+0", deltaLabel: "всего" },
    { label: "Документы",       value: documents.length,                            delta: `${documents.filter(d => d.active).length}`, deltaLabel: "активных" },
    { label: "Пользователи",    value: users.length,                               delta: `${users.filter(u => u.role === "admin").length}`, deltaLabel: "администраторов" },
    { label: "Коды доступа",    value: invites.filter(i => !i.is_used).length,     delta: `${invites.length}`, deltaLabel: "всего" },
  ];

  return (
    <>
      <PageHeader
        title={`Здравствуйте, @${auth.user.telegram_name}`}
        subtitle="Сводка по всем базам знаний, документам и пользователям"
        action={<WBtn variant="primary" size="md" icon="plus" onClick={() => onNavigate("kb")}>Новая база</WBtn>}
      />

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
        background: "var(--border)", borderBottom: "1px solid var(--border)" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: "var(--bg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase",
              letterSpacing: 0.6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--fg)",
              letterSpacing: -0.6, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, marginTop: 3, display: "flex", gap: 5 }}>
              <span style={{ color: "#15803D", fontWeight: 600 }}>{s.delta}</span>
              <span style={{ color: "var(--muted)" }}>{s.deltaLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 1, background: "var(--border)" }}>
        {/* Recent KBs */}
        <div style={{ background: "var(--bg)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Последние базы знаний</h3>
            <button onClick={() => onNavigate("kb")} style={{ fontSize: 12, color: "var(--accent)",
              border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
              Все →
            </button>
          </div>
          {kbs.length === 0
            ? <div style={{ color: "var(--muted)", fontSize: 13 }}>Нет баз знаний</div>
            : kbs.slice(0, 6).map(kb => (
              <div key={kb.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                borderBottom: "1px solid var(--border)" }}>
                <WKbTile id={kb.id} name={kb.name} size={22}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kb.name}</div>
                  {kb.description && <div style={{ fontSize: 11.5, color: "var(--muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kb.description}</div>}
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  #{kb.id}
                </span>
              </div>
            ))}
        </div>

        {/* System health */}
        <div style={{ background: "var(--bg)", padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            Состояние системы
          </h3>
          {[
            { label: "Vector DB",      status: "ok",   value: `${documents.length} docs` },
            { label: "Документы",      status: documents.some(d => !d.active) ? "warn" : "ok",
                                       value: `${documents.filter(d => d.active).length} активных` },
            { label: "Пользователи",   status: "ok",   value: `${users.length} total` },
            { label: "Коды доступа",   status: invites.filter(i => !i.is_used).length === 0 ? "warn" : "ok",
                                       value: `${invites.filter(i => !i.is_used).length} активных` },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: r.status === "ok" ? "#16A34A" : "#F59E0B" }}/>
                <span style={{ fontSize: 12.5, color: "var(--fg)" }}>{r.label}</span>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--mono)" }}>{r.value}</span>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
              Быстрые действия
            </h3>
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

// ─── Screen: Knowledge Bases List ────────────────────────────────────────────

function ScreenKBList({ kbs, documents, busy, onCreate, onDelete, onSelectKb }: {
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

// ─── Screen: Knowledge Base Detail ───────────────────────────────────────────

type KbDetailTab = "docs" | "access" | "queries" | "settings";

function ScreenKBDetail({ kb, allDocuments, busy, onBack, onDelete, onUpload }: {
  kb: KnowledgeBase;
  allDocuments: Document[];
  busy: boolean;
  onBack: () => void;
  onDelete: (kb: KnowledgeBase) => void;
  onUpload: (file: File, kbId: number) => Promise<void>;
}) {
  const [tab, setTab]         = useState<KbDetailTab>("docs");
  const [docs, setDocs]       = useState<Document[]>([]);
  const [members, setMembers] = useState<KBMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [docQ, setDocQ]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([fetchDocuments(kb.id), fetchKBMembers(kb.id)])
      .then(([dRes, mRes]) => {
        setDocs(dRes.documents);
        setMembers(mRes.members);
      })
      .finally(() => setLoadingData(false));
  }, [kb.id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      await onUpload(files[0], kb.id);
      const dRes = await fetchDocuments(kb.id);
      setDocs(dRes.documents);
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = docs.filter(d =>
    d.file_name.toLowerCase().includes(docQ.toLowerCase())
  );

  const docStatusTone = (d: Document): "success" | "warn" | "danger" => {
    if (d.status === "indexed" || d.active) return "success";
    if (d.status === "processing") return "warn";
    return "danger";
  };

  const docStatusLabel = (d: Document) => {
    if (d.status === "processing") return "Индексация…";
    if (d.status === "indexed" || d.active) return "Индексирован";
    return "Ошибка";
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
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.md,.txt" hidden disabled={uploading}
              onChange={e => handleUpload(e.target.files)}/>
            <WBtn variant="secondary" size="md" icon="refresh">Переиндексировать</WBtn>
            <WBtn variant="primary" size="md" icon="upload" disabled={uploading}
              onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Загрузка…" : "Добавить документ"}
            </WBtn>
          </div>
        }
      />

      {/* Tab bar */}
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

      {/* Docs tab */}
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
                { label: "Размер", w: 80, cell: () => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>—</span>
                )},
                { label: "Стр.", w: 60, cell: () => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>—</span>
                )},
                { label: "Чанки", w: 80, cell: () => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12 }}>—</span>
                )},
                { label: "Статус", w: 150, cell: d => (
                  <WChip tone={docStatusTone(d)}>{docStatusLabel(d)}</WChip>
                )},
                { label: "Добавлен", w: 110, cell: d => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
                    {fmt(d.created_at)}
                  </span>
                )},
                { label: "", w: 80, cell: d => (
                  <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                    <WBtn variant="ghost" icon="check" onClick={() =>
                      toggleDocumentActive(d.id, !d.active)
                        .then(() => fetchDocuments(kb.id).then(r => setDocs(r.documents)))}/>
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

      {/* Access tab */}
      {tab === "access" && (
        <>
          <Toolbar>
            <WSearch placeholder="Поиск участников…" width={240}/>
            <div style={{ flex: 1 }}/>
          </Toolbar>
          {loadingData ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Загрузка…</div>
          ) : (
            <WTable<KBMember>
              columns={[
                { label: "ID пользователя", cell: m => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--fg)" }}>#{m.user_id}</span>
                )},
                { label: "Добавлен", w: 150, cell: m => (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
                    {fmt(m.created_at)}
                  </span>
                )},
                { label: "", w: 60, cell: m => (
                  <WBtn variant="danger" icon="trash" onClick={() =>
                    removeKBMember(kb.id, m.user_id)
                      .then(() => fetchKBMembers(kb.id).then(r => setMembers(r.members)))}/>
                )},
              ]}
              rows={members}
              empty="Нет участников"
            />
          )}
        </>
      )}

      {/* Queries tab */}
      {tab === "queries" && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          История запросов пока недоступна
        </div>
      )}

      {/* Settings tab */}
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

// ─── Screen: Users ────────────────────────────────────────────────────────────

function ScreenUsers({ users, kbs, busy, onRoleChange, onDelete }: {
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
        {(["all","admin","user"] as const).map((f, i) => (
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
          { label: "Добавлен", w: 140, cell: u => (
            <span style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 11.5 }}>
              {fmt(u.created_at)}
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

// ─── Screen: Codes ────────────────────────────────────────────────────────────

function ScreenCodes({ invites, kbs, busy, onCreate, onCopy }: {
  invites: InviteCode[]; kbs: KnowledgeBase[]; busy: boolean;
  onCreate: (maxUses: number | undefined, kbId: number | undefined) => void;
  onCopy: (code: string) => void;
}) {
  const [q, setQ]           = useState("");
  const [filter, setFilter] = useState<"all"|"active"|"used">("all");
  const [showModal, setShowModal] = useState(false);
  const [maxUses, setMaxUses] = useState<string>("");
  const [kbId, setKbId]     = useState<string>("");

  const filtered = invites.filter(i => {
    if (filter === "active" && i.is_used) return false;
    if (filter === "used" && !i.is_used) return false;
    if (q && !i.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { l: "Активных",      v: invites.filter(i => !i.is_used).length, sub: "из " + invites.length },
    { l: "Использованных", v: invites.filter(i => i.is_used).length,  sub: "кодов" },
    { l: "Всего выдано",   v: invites.reduce((s, i) => s + i.used_count, 0), sub: "активаций" },
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
        <Modal title="Создать код доступа" subtitle="Многоразовый, с лимитом использований"
          onClose={() => setShowModal(false)}
          footer={<>
            <WBtn variant="ghost" onClick={() => setShowModal(false)}>Отмена</WBtn>
            <WBtn variant="primary" disabled={busy} onClick={() => {
              onCreate(maxUses ? Number(maxUses) : undefined, kbId ? Number(kbId) : undefined);
              setMaxUses(""); setKbId(""); setShowModal(false);
            }}>Сгенерировать</WBtn>
          </>}>
          <FieldRow label="Лимит использований">
            <WInput type="number" value={maxUses} onChange={setMaxUses} placeholder="∞ (без ограничений)"/>
          </FieldRow>
          <FieldRow label="База знаний">
            <select value={kbId} onChange={e => setKbId(e.target.value)}
              style={{ height: 28, padding: "0 8px", borderRadius: 5, outline: "none",
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--fg)", fontFamily: "inherit", fontSize: 12.5, width: "100%" }}>
              <option value="">— без привязки —</option>
              {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
            </select>
          </FieldRow>
        </Modal>
      )}

      {/* Stats bar */}
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
          { label: "База знаний", w: 140, cell: c => (
            c.knowledge_base_id
              ? <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>#{c.knowledge_base_id}</span>
              : <span style={{ color: "var(--muted)" }}>—</span>
          )},
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

// ─── Screen: Settings ─────────────────────────────────────────────────────────

function ScreenSettings({ auth }: { auth: AuthResponse }) {
  return (
    <>
      <PageHeader title="Настройки" subtitle="Информация о профиле и системе"
        action={<WBtn variant="primary" size="md">Сохранить</WBtn>}/>
      <div style={{ padding: "20px 28px", maxWidth: 720 }}>
        {[
          { title: "Профиль", fields: [
            { l: "Telegram", v: `@${auth.user.telegram_name}` },
            { l: "ID", v: String(auth.user.telegram_id), mono: true },
            { l: "Роль", v: auth.user.role },
          ]},
          { title: "Система", fields: [
            { l: "Версия", v: "2.0.0", mono: true },
            { l: "API", v: "/api/v1", mono: true },
          ]},
        ].map((s, i) => (
          <div key={s.title} style={{ marginTop: i === 0 ? 0 : 28 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600,
              color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              {s.title}
            </h3>
            <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              {s.fields.map((f, j) => (
                <div key={f.l} style={{
                  display: "grid", gridTemplateColumns: "200px 1fr",
                  padding: "10px 14px", alignItems: "center", gap: 16,
                  borderBottom: j < s.fields.length - 1 ? "1px solid var(--border)" : 0,
                }}>
                  <label style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{f.l}</label>
                  <span style={{ fontSize: 12.5, color: "var(--fg)",
                    fontFamily: f.mono ? "var(--mono)" : "inherit" }}>{f.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const [auth,      setAuth]      = useState<AuthResponse | null>(null);
  const [kbs,       setKbs]       = useState<KnowledgeBase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users,     setUsers]     = useState<User[]>([]);
  const [invites,   setInvites]   = useState<InviteCode[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [toast,     setToast]     = useState<string | null>(null);
  const [screen,    setScreen]    = useState<Screen>("home");
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);

  // Read token from URL ?token=... on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      localStorage.setItem("admin_token", t);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // ?demo=1 — preview mode without backend
    if (params.get("demo") === "1") {
      setAuth({ user: { id: 1, telegram_id: 0, telegram_name: "Demo Admin", role: "admin" }, is_admin: true, knowledge_bases: [] });
      setKbs([
        { id: 1, name: "Engineering Wiki", description: "Технические гайды, архитектура", created_by: 1, created_at: new Date().toISOString() },
        { id: 2, name: "Product Specs", description: "PRD, спецификации, дизайн", created_by: 1, created_at: new Date().toISOString() },
        { id: 3, name: "Sales Playbook", description: "Скрипты, кейсы, шаблоны", created_by: 1, created_at: new Date().toISOString() },
      ]);
      setDocuments([
        { id: 1, file_name: "Architecture_v3.pdf", source: "minio://arch.pdf", active: true, status: "indexed", knowledge_base_id: 1, created_at: new Date().toISOString() },
        { id: 2, file_name: "API Reference.md", source: "minio://api.md", active: true, status: "indexed", knowledge_base_id: 1, created_at: new Date().toISOString() },
        { id: 3, file_name: "Onboarding.docx", source: "minio://onboard.docx", active: false, status: "processing", knowledge_base_id: 2, created_at: new Date().toISOString() },
      ]);
      setUsers([
        { id: 1, telegram_id: 111, telegram_name: "Anna S.", role: "admin" },
        { id: 2, telegram_id: 222, telegram_name: "Dmitry P.", role: "admin" },
        { id: 3, telegram_id: 333, telegram_name: "Maria I.", role: "user" },
        { id: 4, telegram_id: 444, telegram_name: "Sergey K.", role: "user" },
      ]);
      setInvites([
        { id: 1, code: "ENG-X9K2-A4M7", knowledge_base_id: 1, max_uses: 10, used_count: 3, is_used: false, expires_at: null, created_at: new Date().toISOString() },
        { id: 2, code: "HR-Q7P1-N3R8", knowledge_base_id: null, max_uses: 100, used_count: 47, is_used: false, expires_at: null, created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      try {
        const authRes = await fetchAuth();
        setAuth(authRes);
        const [kbRes, docRes, userRes, invRes] = await Promise.all([
          fetchKnowledgeBases(), fetchDocuments(), fetchUsers(), fetchInviteCodes(),
        ]);
        setKbs(kbRes.knowledge_bases);
        setDocuments(docRes.documents);
        setUsers(userRes.users);
        setInvites(invRes.invite_codes);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshAll = async () => {
    setBusy(true);
    try {
      const [kbRes, docRes, userRes, invRes] = await Promise.all([
        fetchKnowledgeBases(), fetchDocuments(), fetchUsers(), fetchInviteCodes(),
      ]);
      setKbs(kbRes.knowledge_bases);
      setDocuments(docRes.documents);
      setUsers(userRes.users);
      setInvites(invRes.invite_codes);
      setToast("Данные обновлены");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 12, color: "var(--muted)" }}>
      <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>R</div>
      <span style={{ fontSize: 13 }}>Загрузка…</span>
    </div>
  );

  if (!auth) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>Нет доступа</div>
      <div style={{ color: "var(--muted)", fontSize: 13 }}>{error || "Откройте через Telegram /admin"}</div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <WTopNav active={screen} onChange={s => { setScreen(s); setSelectedKbId(null); }} auth={auth} onRefresh={refreshAll} busy={busy}/>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {error && (
          <div style={{ margin: "12px 28px", padding: "10px 14px", borderRadius: 6,
            background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12.5,
            border: "1px solid rgba(220,38,38,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            <WIcon name="close" size={13} color="#DC2626"/>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "auto", border: 0,
              background: "transparent", color: "#DC2626", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {screen === "home" && (
          <ScreenDashboard auth={auth} kbs={kbs} documents={documents}
            users={users} invites={invites} onNavigate={setScreen}/>
        )}

        {screen === "kb" && selectedKbId === null && (
          <ScreenKBList
            kbs={kbs} documents={documents} busy={busy}
            onCreate={async (name, desc) => {
              await withBusy(async () => {
                await createKnowledgeBase(name, desc);
                const res = await fetchKnowledgeBases();
                setKbs(res.knowledge_bases);
                setToast(`База «${name}» создана`);
              });
            }}
            onDelete={async kb => {
              await withBusy(async () => {
                await deleteKnowledgeBase(kb.id);
                setKbs(prev => prev.filter(k => k.id !== kb.id));
                setToast(`База «${kb.name}» удалена`);
              });
            }}
            onSelectKb={kb => setSelectedKbId(kb.id)}
          />
        )}

        {screen === "kb" && selectedKbId !== null && (() => {
          const kb = kbs.find(k => k.id === selectedKbId);
          if (!kb) return null;
          return (
            <ScreenKBDetail
              kb={kb}
              allDocuments={documents}
              busy={busy}
              onBack={() => setSelectedKbId(null)}
              onDelete={async k => {
                await withBusy(async () => {
                  await deleteKnowledgeBase(k.id);
                  setKbs(prev => prev.filter(x => x.id !== k.id));
                  setToast(`База «${k.name}» удалена`);
                });
              }}
              onUpload={async (file, kbId) => {
                const res = await uploadFile(file, kbId);
                const docRes = await fetchDocuments();
                setDocuments(docRes.documents);
                setToast(`Загружено: ${res.chunks_indexed} чанков`);
              }}
            />
          );
        })()}

        {screen === "users" && (
          <ScreenUsers users={users} kbs={kbs} busy={busy}
            onRoleChange={async (user, role) => {
              await withBusy(async () => {
                const updated = await updateUserRole(user.id, role);
                setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
              });
            }}
            onDelete={async user => {
              await withBusy(async () => {
                await deleteUser(user.telegram_id);
                setUsers(prev => prev.filter(u => u.id !== user.id));
                setToast("Пользователь удалён");
              });
            }}
          />
        )}

        {screen === "codes" && (
          <ScreenCodes invites={invites} kbs={kbs} busy={busy}
            onCreate={async (maxUses, kbId) => {
              await withBusy(async () => {
                const res = await createInviteCode(maxUses, kbId);
                setToast(`Код: ${res.code}`);
                const updated = await fetchInviteCodes();
                setInvites(updated.invite_codes);
              });
            }}
            onCopy={code => {
              navigator.clipboard?.writeText(code);
              setToast("Код скопирован");
            }}
          />
        )}

        {screen === "settings" && <ScreenSettings auth={auth}/>}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "8px 16px", borderRadius: 6, background: "var(--fg)", color: "var(--bg)",
          fontSize: 12.5, fontWeight: 500, zIndex: 300, whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>{toast}</div>
      )}
    </div>
  );
}

export default App;
