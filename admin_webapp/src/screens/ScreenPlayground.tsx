import React, { useState } from "react";
import { PageHeader } from "../components/layout";
import { WBtn } from "../components/primitives";
import { KnowledgeBase } from "../types";

export function ScreenPlayground({ kbs }: { kbs: KnowledgeBase[] }) {
  const [kbId, setKbId] = useState<number | "">(kbs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!kbId || !query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("admin_token") ?? "";
      const res = await fetch(`/api/v1/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: query, knowledge_base_id: kbId }),
      });
      const data = await res.json();
      setResult(data.answer ?? JSON.stringify(data));
    } catch (e) {
      setResult(`Ошибка: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Playground" subtitle="Тестируйте запросы к базам знаний напрямую"/>
      <div style={{ padding: "24px 28px", maxWidth: 760 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <select value={kbId} onChange={e => setKbId(Number(e.target.value))} style={{
            height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--bg)", color: "var(--fg)", fontSize: 13, fontFamily: "inherit", outline: "none",
          }}>
            {kbs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Введите вопрос к базе знаний…"
            rows={4}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk(); }}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 7,
              border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)",
              fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none",
              boxSizing: "border-box", lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <WBtn variant="primary" size="md" onClick={handleAsk} disabled={loading || !kbId || !query.trim()}>
            {loading ? "Запрос…" : "Спросить ⌘↵"}
          </WBtn>
          <WBtn variant="secondary" size="md" onClick={() => { setQuery(""); setResult(null); }}>
            Очистить
          </WBtn>
        </div>

        {result !== null && (
          <div style={{ padding: "14px 16px", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--surface)", fontSize: 13, color: "var(--fg)", lineHeight: 1.6,
            whiteSpace: "pre-wrap" }}>
            {result}
          </div>
        )}
      </div>
    </>
  );
}
