import React, { useEffect, useState } from "react";
import { WIcon } from "./icons";
import { WAvatar, WBtn, WSearch } from "./primitives";
import { AuthResponse } from "../types";

export type Screen = "home" | "kb" | "users" | "codes" | "journal" | "playground" | "settings";

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: "home",       label: "Обзор" },
  { id: "kb",         label: "Базы" },
  { id: "users",      label: "Люди" },
  { id: "codes",      label: "Коды" },
  { id: "journal",    label: "Журнал" },
  { id: "playground", label: "Playground" },
  { id: "settings",   label: "Настройки" },
];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("admin_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("admin_theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

export function WTopNav({ active, onChange, auth, onRefresh, busy }: {
  active: Screen; onChange: (s: Screen) => void;
  auth: AuthResponse; onRefresh: () => void; busy: boolean;
}) {
  const { theme, toggle } = useTheme();

  return (
    <div style={{
      height: 44, display: "flex", alignItems: "center",
      padding: "0 20px", gap: 0, flexShrink: 0,
      borderBottom: "1px solid var(--border)", background: "var(--bg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 20 }}>
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
        }}>v2.4</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <WSearch placeholder="Поиск везде…" width={200}/>
        <button onClick={onRefresh} disabled={busy} title="Обновить данные" style={{
          width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
          background: "var(--bg)", cursor: busy ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: busy ? 0.5 : 1, color: "var(--muted)",
        }}>
          <WIcon name="refresh" size={13}/>
        </button>
        <button onClick={toggle} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"} style={{
          width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
          background: "var(--bg)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--muted)",
        }}>
          <WIcon name={theme === "dark" ? "sun" : "moon"} size={15}/>
        </button>
        <WAvatar name={auth.user.telegram_name} size={26}/>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action, breadcrumb, onBreadcrumbRoot }: {
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

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "10px 28px", borderBottom: "1px solid var(--border)", flexShrink: 0,
    }}>{children}</div>
  );
}

export type ColDef<T> = { label: string; w?: number; cell: (row: T) => React.ReactNode };

export function WTable<T>({ columns, rows, onRow, empty = "Нет данных" }: {
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

export function Modal({ title, subtitle, onClose, children, footer }: {
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

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr",
      gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
      <label style={{ fontSize: 12.5, color: "var(--fg-2)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

export function WInput({ value, onChange, placeholder, type = "text", mono }: {
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
