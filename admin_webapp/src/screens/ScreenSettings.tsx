import React from "react";
import { AuthResponse } from "../types";
import { PageHeader } from "../components/layout";
import { WBtn } from "../components/primitives";

export function ScreenSettings({ auth }: { auth: AuthResponse }) {
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
