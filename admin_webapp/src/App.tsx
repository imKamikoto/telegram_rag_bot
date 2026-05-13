import React, { useEffect, useState } from "react";
import {
  createInviteCode, createKnowledgeBase,
  deleteKnowledgeBase, deleteUser,
  fetchAuth, fetchDocuments, fetchInviteCodes,
  fetchKnowledgeBases, fetchUsers,
  updateUserRole, uploadFile,
} from "./api";
import { AuthResponse, Document, InviteCode, KnowledgeBase, User, UserRole } from "./types";
import { WTopNav, Screen } from "./components/layout";
import { WIcon } from "./components/icons";
import { ScreenDashboard } from "./screens/ScreenDashboard";
import { ScreenKBList } from "./screens/ScreenKBList";
import { ScreenKBDetail } from "./screens/ScreenKBDetail";
import { ScreenUsers } from "./screens/ScreenUsers";
import { ScreenCodes } from "./screens/ScreenCodes";
import { ScreenSettings } from "./screens/ScreenSettings";
import { ScreenJournal } from "./screens/ScreenJournal";
import { ScreenPlayground } from "./screens/ScreenPlayground";
import { ScreenUpload } from "./screens/ScreenUpload";

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
  const [uploadKbId,   setUploadKbId]   = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      localStorage.setItem("admin_token", t);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (params.get("demo") === "1") {
      setAuth({ user: { id: 1, telegram_id: 0, telegram_name: "Demo Admin", role: "admin" }, is_admin: true, knowledge_bases: [] });
      setKbs([
        { id: 1, name: "Engineering Wiki", description: "Технические гайды, архитектура", created_by: 1, created_at: new Date().toISOString() },
        { id: 2, name: "Product Specs", description: "PRD, спецификации, дизайн", created_by: 1, created_at: new Date().toISOString() },
        { id: 3, name: "Sales Playbook", description: "Скрипты, кейсы, шаблоны", created_by: 1, created_at: new Date().toISOString() },
      ]);
      setDocuments([
        { id: 1, file_name: "Architecture_v3.pdf", source: "minio://arch.pdf", active: true, status: "ready", knowledge_base_id: 1, created_at: new Date().toISOString(), page_count: 42, chunk_count: 128, content_length: 98304 },
        { id: 2, file_name: "API Reference.md", source: "minio://api.md", active: true, status: "ready", knowledge_base_id: 1, created_at: new Date().toISOString(), page_count: null, chunk_count: 56, content_length: 24576 },
        { id: 3, file_name: "Onboarding.docx", source: "minio://onboard.docx", active: false, status: "pending", knowledge_base_id: 2, created_at: new Date().toISOString(), page_count: 8, chunk_count: 0, content_length: 16384 },
      ]);
      setUsers([
        { id: 1, telegram_id: 111, telegram_name: "Anna S.", role: "admin", kb_ids: [1, 2, 3] },
        { id: 2, telegram_id: 222, telegram_name: "Dmitry P.", role: "admin", kb_ids: [1] },
        { id: 3, telegram_id: 333, telegram_name: "Maria I.", role: "user", kb_ids: [2, 3] },
        { id: 4, telegram_id: 444, telegram_name: "Sergey K.", role: "user", kb_ids: [] },
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
      <WTopNav active={screen} onChange={s => { setScreen(s); setSelectedKbId(null); setUploadKbId(null); }} auth={auth} onRefresh={refreshAll} busy={busy}/>

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

        {screen === "kb" && selectedKbId !== null && uploadKbId === null && (() => {
          const kb = kbs.find(k => k.id === selectedKbId);
          if (!kb) return null;
          return (
            <ScreenKBDetail
              kb={kb} allDocuments={documents} users={users} busy={busy}
              onBack={() => setSelectedKbId(null)}
              onDelete={async k => {
                await withBusy(async () => {
                  await deleteKnowledgeBase(k.id);
                  setKbs(prev => prev.filter(x => x.id !== k.id));
                  setToast(`База «${k.name}» удалена`);
                  setSelectedKbId(null);
                });
              }}
              onOpenUpload={kbId => setUploadKbId(kbId)}
            />
          );
        })()}

        {screen === "kb" && selectedKbId !== null && uploadKbId !== null && (() => {
          const kb = kbs.find(k => k.id === uploadKbId);
          if (!kb) return null;
          return (
            <ScreenUpload
              kb={kb}
              onBack={() => setUploadKbId(null)}
              onDone={async () => {
                setUploadKbId(null);
                const docRes = await fetchDocuments();
                setDocuments(docRes.documents);
                setToast("Документы загружены");
              }}
            />
          );
        })()}

        {screen === "users" && (
          <ScreenUsers users={users} kbs={kbs} busy={busy}
            onRoleChange={async (user: User, role: UserRole) => {
              await withBusy(async () => {
                const updated = await updateUserRole(user.id, role);
                setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
              });
            }}
            onDelete={async (user: User) => {
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
            onCreate={async (maxUses, kbId, code) => {
              await withBusy(async () => {
                const res = await createInviteCode(maxUses, kbId, code);
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

        {screen === "journal"    && <ScreenJournal users={users} kbs={kbs}/>}
        {screen === "playground" && <ScreenPlayground kbs={kbs}/>}
        {screen === "settings"   && <ScreenSettings auth={auth}/>}
      </div>

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
