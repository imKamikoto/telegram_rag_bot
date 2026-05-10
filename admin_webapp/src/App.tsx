import { useEffect, useMemo, useState } from "react";
import {
  addKBMember,
  createInviteCode,
  createKnowledgeBase,
  deleteDocument,
  deleteKnowledgeBase,
  deleteUser,
  fetchAuth,
  fetchDocuments,
  fetchInviteCodes,
  fetchKBMembers,
  fetchKnowledgeBases,
  fetchUsers,
  removeKBMember,
  toggleDocumentActive,
  updateUserRole,
  uploadFile,
} from "./api";
import { getInitData, syncTelegramChrome } from "./telegram";
import {
  AuthResponse,
  Document,
  InviteCode,
  KBMember,
  KnowledgeBase,
  User,
  UserRole,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: string): string => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// ─── Primitives ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--accent-soft)", color: "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "accent" | "neutral" | "muted" | "success" | "warn" }) {
  const colors: Record<string, string> = {
    accent: "var(--accent-soft)",
    neutral: "var(--surface-2)",
    muted: "var(--border)",
    success: "#dcfce7",
    warn: "#fef9c3",
  };
  const textColors: Record<string, string> = {
    accent: "var(--accent)",
    neutral: "var(--muted)",
    muted: "var(--muted)",
    success: "#15803d",
    warn: "#854d0e",
  };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: colors[tone], color: textColors[tone], whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ margin: "16px 0 0" }}>
      <div style={{ padding: "0 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "12px 14px", marginBottom: 8,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
      {text}
    </div>
  );
}

function Btn({
  children, onClick, variant = "ghost", disabled, full, small,
}: {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  full?: boolean;
  small?: boolean;
}) {
  const bg: Record<string, string> = { primary: "var(--accent)", ghost: "var(--surface-2)", danger: "#fef2f2" };
  const color: Record<string, string> = { primary: "#fff", ghost: "var(--fg)", danger: "#dc2626" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "5px 10px" : "8px 14px",
        borderRadius: 10, border: variant === "danger" ? "1px solid #fecaca" : "none",
        background: disabled ? "var(--border)" : bg[variant],
        color: disabled ? "var(--muted)" : color[variant],
        fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", width: full ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

type Screen = "dashboard" | "kb" | "users" | "codes" | "settings";

const NAV_ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: "dashboard", label: "Главная", icon: "⊞" },
  { id: "kb", label: "Базы", icon: "🗂" },
  { id: "users", label: "Люди", icon: "👥" },
  { id: "codes", label: "Инвайты", icon: "🔑" },
  { id: "settings", label: "Настройки", icon: "⚙" },
];

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--surface)", borderTop: "1px solid var(--border)",
      display: "flex", zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          style={{
            flex: 1, padding: "8px 0 10px", border: 0, background: "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: active === item.id ? "var(--accent)" : "var(--muted)" }}>
            {item.label}
          </span>
          {active === item.id && (
            <div style={{
              position: "absolute", bottom: 0, width: 24, height: 2,
              background: "var(--accent)", borderRadius: 2,
            }} />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── Screen: Dashboard ────────────────────────────────────────────────────────

function ScreenDashboard({
  auth, kbs, documents, users, onNavigate,
}: {
  auth: AuthResponse;
  kbs: KnowledgeBase[];
  documents: Document[];
  users: User[];
  onNavigate: (s: Screen) => void;
}) {
  const kpis = [
    { label: "Баз знаний", value: kbs.length, icon: "🗂", tone: "accent" as const },
    { label: "Документов", value: documents.length, icon: "📄", tone: "neutral" as const },
    { label: "Пользователей", value: users.length, icon: "👥", tone: "neutral" as const },
    { label: "Активных документов", value: documents.filter((d) => d.active).length, icon: "✅", tone: "neutral" as const },
  ];
  const actions = [
    { label: "Новая база", icon: "➕", screen: "kb" as Screen },
    { label: "Загрузить", icon: "📤", screen: "kb" as Screen },
    { label: "Пользователи", icon: "👥", screen: "users" as Screen },
    { label: "Инвайт", icon: "🔑", screen: "codes" as Screen },
  ];

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Добро пожаловать,</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: -0.4 }}>
          @{auth.user.telegram_name}
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            padding: "12px 14px", borderRadius: 14,
            background: k.tone === "accent" ? "var(--accent-soft)" : "var(--surface)",
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 22 }}>{k.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", letterSpacing: -0.5 }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <Section title="Быстрые действия">
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {actions.map((a) => (
            <button key={a.label} onClick={() => onNavigate(a.screen)} style={{
              border: "1px solid var(--border)", background: "var(--surface)",
              borderRadius: 12, padding: "12px 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 10.5, color: "var(--fg)", fontWeight: 500, textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Последние базы знаний">
        <div style={{ margin: "0 16px" }}>
          {kbs.slice(0, 3).length === 0
            ? <EmptyState text="Базы знаний не созданы" />
            : kbs.slice(0, 3).map((kb) => (
              <Card key={kb.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{kb.name}</div>
                    {kb.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{kb.description}</div>}
                  </div>
                  <Chip tone="neutral">#{kb.id}</Chip>
                </div>
              </Card>
            ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Screen: Knowledge Bases ──────────────────────────────────────────────────

function ScreenKBList({
  initData, kbs, busy,
  onCreate, onDelete,
}: {
  initData: string;
  kbs: KnowledgeBase[];
  busy: boolean;
  onCreate: (name: string, desc: string) => void;
  onDelete: (kb: KnowledgeBase) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [expandKbId, setExpandKbId] = useState<number | null>(null);
  const [members, setMembers] = useState<KBMember[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [tab, setTab] = useState<"docs" | "members">("docs");

  const loadKBDetail = async (kb: KnowledgeBase) => {
    if (expandKbId === kb.id) { setExpandKbId(null); return; }
    setExpandKbId(kb.id);
    const [mRes, dRes] = await Promise.all([
      fetchKBMembers(initData, kb.id),
      fetchDocuments(initData, kb.id),
    ]);
    setMembers(mRes.members);
    setDocs(dRes.documents);
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>Базы знаний</div>
      </div>

      <Section title="Создать новую">
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            placeholder="Название базы"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 14, color: "var(--fg)" }}
          />
          <input
            placeholder="Описание (опционально)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 14, color: "var(--fg)" }}
          />
          <Btn variant="primary" disabled={busy || !name.trim()} onClick={() => { onCreate(name.trim(), desc.trim()); setName(""); setDesc(""); }}>
            Создать базу
          </Btn>
        </div>
      </Section>

      <Section title={`Всего: ${kbs.length}`}>
        <div style={{ margin: "0 16px" }}>
          {kbs.length === 0 && <EmptyState text="Нет баз знаний" />}
          {kbs.map((kb) => (
            <div key={kb.id}>
              <Card onClick={() => loadKBDetail(kb)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kb.name}</div>
                    {kb.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{kb.description}</div>}
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Создана: {fmt(kb.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8 }}>
                    <Chip tone="neutral">#{kb.id}</Chip>
                    <Btn variant="danger" small disabled={busy} onClick={(e) => { e?.stopPropagation?.(); onDelete(kb); }}>✕</Btn>
                  </div>
                </div>
              </Card>

              {expandKbId === kb.id && (
                <div style={{ margin: "0 0 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {(["docs", "members"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)} style={{
                        padding: "5px 12px", borderRadius: 8, border: 0, fontFamily: "inherit",
                        background: tab === t ? "var(--accent)" : "var(--surface-2)",
                        color: tab === t ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>
                        {t === "docs" ? `Документы (${docs.length})` : `Участники (${members.length})`}
                      </button>
                    ))}
                  </div>

                  {tab === "docs" && (
                    docs.length === 0
                      ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Нет документов</div>
                      : docs.map((d) => (
                        <div key={d.id} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                          <span>{d.file_name}</span>
                          <Chip tone={d.active ? "success" : "warn"}>{d.active ? "активен" : "отключён"}</Chip>
                        </div>
                      ))
                  )}

                  {tab === "members" && (
                    members.length === 0
                      ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Нет участников</div>
                      : members.map((m) => (
                        <div key={m.user_id} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                          User #{m.user_id} — с {fmt(m.created_at)}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Screen: Documents upload (inside KB screen) ──────────────────────────────

function ScreenUploadDocument({
  initData, kbs, busy, onUploaded,
}: {
  initData: string;
  kbs: KnowledgeBase[];
  busy: boolean;
  onUploaded: () => void;
}) {
  const [kbId, setKbId] = useState<number | undefined>(kbs[0]?.id);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const res = await uploadFile(initData, files[0], kbId);
      setMsg(`✅ Загружено: ${res.chunks_indexed} чанков`);
      onUploaded();
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Загрузить документ</div>
      <select
        value={kbId}
        onChange={(e) => setKbId(Number(e.target.value))}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 13, color: "var(--fg)", marginBottom: 10 }}
      >
        <option value={undefined}>— без базы знаний —</option>
        {kbs.map((kb) => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
      </select>
      <label style={{ display: "block", cursor: "pointer" }}>
        <input
          type="file"
          accept=".pdf,.docx,.md,.txt"
          hidden
          disabled={uploading || busy}
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Btn variant="primary" disabled={uploading || busy} full>
          {uploading ? "Загрузка..." : "Выбрать файл (PDF / DOCX / MD)"}
        </Btn>
      </label>
      {msg && <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}

// ─── Screen: Users ────────────────────────────────────────────────────────────

function ScreenUsers({
  users, busy,
  onRoleChange, onDelete,
}: {
  users: User[];
  busy: boolean;
  onRoleChange: (u: User, r: UserRole) => void;
  onDelete: (u: User) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (q && !u.telegram_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Пользователи</div>
      </div>
      <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          placeholder="🔍 Поиск по имени..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 14, color: "var(--fg)" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "admin", "user"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 12px", borderRadius: 99, border: 0, fontFamily: "inherit",
              background: filter === f ? "var(--accent)" : "var(--surface-2)",
              color: filter === f ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              {f === "all" ? "Все" : f === "admin" ? "Админы" : "Пользователи"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 16px" }}>
        {filtered.length === 0 && <EmptyState text="Пользователи не найдены" />}
        {filtered.map((user) => (
          <Card key={user.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={user.telegram_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.telegram_name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>TG: {user.telegram_id}</div>
              </div>
              <Chip tone={user.role === "admin" ? "accent" : "neutral"}>{user.role}</Chip>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <select
                value={user.role}
                onChange={(e) => onRoleChange(user, e.target.value as UserRole)}
                disabled={busy}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 13 }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <Btn variant="danger" small disabled={busy} onClick={() => onDelete(user)}>Удалить</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Invite Codes ─────────────────────────────────────────────────────

function ScreenCodes({
  invites, kbs, busy,
  onCreate, onCopy,
}: {
  invites: InviteCode[];
  kbs: KnowledgeBase[];
  busy: boolean;
  onCreate: (maxUses: number | undefined, kbId: number | undefined) => void;
  onCopy: (code: string) => void;
}) {
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [kbId, setKbId] = useState<number | undefined>();

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Инвайт-коды</div>
      </div>

      <Section title="Создать код">
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <select
            value={kbId ?? ""}
            onChange={(e) => setKbId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 13, color: "var(--fg)" }}
          >
            <option value="">— без привязки к базе —</option>
            {kbs.map((kb) => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Лимит использований (∞)"
            value={maxUses ?? ""}
            min={1}
            onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", fontFamily: "inherit", fontSize: 14, color: "var(--fg)" }}
          />
          <Btn variant="primary" disabled={busy} onClick={() => onCreate(maxUses, kbId)}>
            Создать код
          </Btn>
        </div>
      </Section>

      <Section title={`Активных кодов: ${invites.filter((i) => !i.is_used).length}`}>
        <div style={{ margin: "0 16px" }}>
          {invites.length === 0 && <EmptyState text="Нет инвайт-кодов" />}
          {invites.map((inv) => (
            <Card key={inv.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <code style={{ fontSize: 13, fontFamily: "monospace", wordBreak: "break-all" }}>{inv.code}</code>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Chip tone={inv.is_used ? "warn" : "success"}>{inv.is_used ? "использован" : "активен"}</Chip>
                  <Btn variant="ghost" small onClick={() => onCopy(inv.code)}>📋</Btn>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, display: "flex", gap: 12 }}>
                <span>Использован: {inv.used_count}{inv.max_uses ? ` / ${inv.max_uses}` : " / ∞"}</span>
                {inv.knowledge_base_id && <span>KB: #{inv.knowledge_base_id}</span>}
                {inv.expires_at && <span>До: {fmt(inv.expires_at)}</span>}
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Screen: Settings ─────────────────────────────────────────────────────────

function ScreenSettings({ auth }: { auth: AuthResponse }) {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Настройки</div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={auth.user.telegram_name} size={48} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{auth.user.telegram_name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>ID: {auth.user.telegram_id}</div>
            <Chip tone="accent">{auth.user.role}</Chip>
          </div>
        </div>
      </Card>
      <div style={{ marginTop: 16, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
        RAG Admin Panel · v0.2.0
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const [initData, setInitData] = useState<string>("529936774");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");

  useEffect(() => {
    syncTelegramChrome();
    setInitData(getInitData());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!initData) { setLoading(false); return; }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const authRes = await fetchAuth(initData);
        setAuth(authRes);
        if (authRes.is_admin) {
          const [kbRes, docRes, userRes, invRes] = await Promise.all([
            fetchKnowledgeBases(initData),
            fetchDocuments(initData),
            fetchUsers(initData),
            fetchInviteCodes(initData),
          ]);
          setKbs(kbRes.knowledge_bases);
          setDocuments(docRes.documents);
          setUsers(userRes.users);
          setInvites(invRes.invite_codes);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [initData]);

  const refreshAll = async () => {
    if (!initData || !auth?.is_admin) return;
    setBusy(true);
    try {
      const [kbRes, docRes, userRes, invRes] = await Promise.all([
        fetchKnowledgeBases(initData),
        fetchDocuments(initData),
        fetchUsers(initData),
        fetchInviteCodes(initData),
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
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Загрузка…</div>;
  if (!auth) return <div style={{ padding: 32, textAlign: "center" }}>{error || "Откройте из Telegram"}</div>;
  if (!auth.is_admin) return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Нет доступа</div>
      <div style={{ color: "var(--muted)", marginTop: 8 }}>Панель доступна только администраторам.</div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 70 }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "var(--bg)",
        borderBottom: "1px solid var(--border)", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)" }}>RAG Admin</span>
        <Btn variant="ghost" small disabled={busy} onClick={refreshAll}>↻ Обновить</Btn>
      </div>

      {error && (
        <div style={{ margin: "8px 16px", padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          padding: "8px 18px", borderRadius: 99, background: "var(--fg)", color: "var(--bg)",
          fontSize: 13, fontWeight: 500, zIndex: 200,
        }}>
          {toast}
        </div>
      )}

      {/* Screens */}
      {screen === "dashboard" && (
        <ScreenDashboard
          auth={auth} kbs={kbs} documents={documents} users={users}
          onNavigate={setScreen}
        />
      )}

      {screen === "kb" && (
        <>
          <ScreenKBList
            initData={initData} kbs={kbs} busy={busy}
            onCreate={async (name, desc) => {
              await withBusy(async () => {
                await createKnowledgeBase(initData, name, desc);
                const res = await fetchKnowledgeBases(initData);
                setKbs(res.knowledge_bases);
                setToast(`База «${name}» создана`);
              });
            }}
            onDelete={async (kb) => {
              await withBusy(async () => {
                await deleteKnowledgeBase(initData, kb.id);
                setKbs((prev) => prev.filter((k) => k.id !== kb.id));
                setToast(`База «${kb.name}» удалена`);
              });
            }}
          />
          <div style={{ margin: "8px 16px 0", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <ScreenUploadDocument
              initData={initData} kbs={kbs} busy={busy}
              onUploaded={async () => {
                const res = await fetchDocuments(initData);
                setDocuments(res.documents);
                setToast("Документ загружен");
              }}
            />
          </div>
        </>
      )}

      {screen === "users" && (
        <ScreenUsers
          users={users} busy={busy}
          onRoleChange={async (user, role) => {
            await withBusy(async () => {
              const updated = await updateUserRole(initData, user.id, role);
              setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
            });
          }}
          onDelete={async (user) => {
            await withBusy(async () => {
              await deleteUser(initData, user.telegram_id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              setToast("Пользователь удалён");
            });
          }}
        />
      )}

      {screen === "codes" && (
        <ScreenCodes
          invites={invites} kbs={kbs} busy={busy}
          onCreate={async (maxUses, kbId) => {
            await withBusy(async () => {
              const res = await createInviteCode(initData, maxUses, kbId);
              setToast(`Код создан: ${res.code}`);
              const updated = await fetchInviteCodes(initData);
              setInvites(updated.invite_codes);
            });
          }}
          onCopy={(code) => {
            navigator.clipboard?.writeText(code);
            setToast("Код скопирован");
          }}
        />
      )}

      {screen === "settings" && <ScreenSettings auth={auth} />}

      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}

export default App;
