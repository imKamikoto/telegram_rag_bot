import React from "react";
import { WIcon } from "./icons";

export const KB_COLORS = ["#7C5CFF","#FF7A59","#16A34A","#0EA5E9","#D946EF","#F59E0B","#475569","#EF4444"];
export const KB_EMOJI  = ["⚙","◆","◐","◇","◼","◉","▲","●"];
export const kbColor = (id: number) => KB_COLORS[(id - 1) % KB_COLORS.length];
export const kbEmoji = (id: number) => KB_EMOJI[(id - 1) % KB_EMOJI.length];

export const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const fmt = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function WBtn({
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

export function WChip({ children, tone = "neutral" }: {
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

export function WAvatar({ name, size = 22 }: { name: string; size?: number }) {
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

export function WKbTile({ id, name, size = 22 }: { id: number; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.max(4, size * 0.22),
      background: kbColor(id), color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.55, fontWeight: 700,
    }}>{kbEmoji(id)}</div>
  );
}

export function WDocBadge({ type }: { type: string }) {
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

export function WSearch({
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
