import { useEffect, useMemo, useState } from "react";
import Snowfall from "react-snowfall";

import {
  createInviteCode,
  deleteDocument,
  deleteUser,
  fetchAuth,
  fetchDocuments,
  fetchInviteCodes,
  fetchUsers,
  toggleDocumentActive,
  updateUserRole,
  uploadPdf,
} from "./api";
import { getInitData, syncTelegramChrome } from "./telegram";
import { AuthResponse, Document, InviteCode, User, UserRole } from "./types";

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function App() {
  const [initData, setInitData] = useState<string>("");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);

  useEffect(() => {
    syncTelegramChrome();
    const data = getInitData();
    setInitData(data);
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!initData) {
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const authResponse = await fetchAuth(initData);
        setAuth(authResponse);

        if (authResponse.is_admin) {
          const [docs, userList, inviteList] = await Promise.all([
            fetchDocuments(initData),
            fetchUsers(initData),
            fetchInviteCodes(initData),
          ]);
          setDocuments(docs.documents);
          setUsers(userList.users);
          setInvites(inviteList.invite_codes);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [initData]);

  const isAdmin = auth?.is_admin ?? false;

  const documentStats = useMemo(() => {
    const active = documents.filter((d) => d.active).length;
    return { total: documents.length, active };
  }, [documents]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !initData) return;
    const file = files[0];
    setUploading(true);
    setError(null);
    try {
      await uploadPdf(initData, file);
      setStatus(`Файл "${file.name}" загружен и проиндексирован.`);
      const docs = await fetchDocuments(initData);
      setDocuments(docs.documents);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleDocument = async (doc: Document) => {
    if (!initData) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await toggleDocumentActive(initData, doc.id, !doc.active);
      setDocuments((prev) => prev.map((item) => (item.id === doc.id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!initData) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocument(initData, doc.id);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (user: User, role: UserRole) => {
    if (!initData) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateUserRole(initData, user.id, role);
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!initData) return;
    setBusy(true);
    setError(null);
    try {
      await deleteUser(initData, user.telegram_id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!initData) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createInviteCode(initData, maxUses);
      setStatus(`Инвайт создан: ${created.code}`);
      const updated = await fetchInviteCodes(initData);
      setInvites(updated.invite_codes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!initData || !isAdmin) return;
    setBusy(true);
    setError(null);
    try {
      const [docs, userList, inviteList] = await Promise.all([
        fetchDocuments(initData),
        fetchUsers(initData),
        fetchInviteCodes(initData),
      ]);
      setDocuments(docs.documents);
      setUsers(userList.users);
      setInvites(inviteList.invite_codes);
      setStatus("Данные обновлены");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!initData && !loading) {
    return (
      <div className="app">
        <div className="hero">
          <h1>RAG Admin</h1>
          <div className="muted">
            Откройте мини‑приложение из Telegram, чтобы мы смогли подтвердить вашу сессию.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Загружаем данные из Telegram...</div>
      </div>
    );
  }

  if (auth && !auth.is_admin) {
    return (
      <div className="app">
        <div className="hero">
          <h1>Нет доступа</h1>
          <div className="muted">
            Мини‑приложение доступно только администраторам. Обратитесь к владельцу бота для
            выдачи прав.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Snowfall style={{ position: "fixed", inset: 0, pointerEvents: "none" }} snowflakeCount={75}/>
      <div className="hero">
        <div>
          <h1>RAG Admin</h1>
          <div className="meta">
            <span className="pill">TG: @{auth?.user.telegram_name || "?"}</span>
            <span className="pill">ID: {auth?.user.telegram_id}</span>
            <span className="pill tag-success">Роль: {auth?.user.role}</span>
          </div>
        </div>
        <div className="panel-actions">
          <button className="ghost compact" onClick={handleRefresh} disabled={busy}>
            Обновить
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {status && <div className="pill">{status}</div>}

      <div className="grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Документы</h3>
              <div className="muted">
                Активно {documentStats.active} / всего {documentStats.total}
              </div>
            </div>
            <div className="panel-actions">
              <label className="ghost compact" style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={uploading || busy}
                  hidden
                />
                {uploading ? "Загрузка..." : "Загрузить PDF"}
              </label>
            </div>
          </div>

          <div className="list">
            {documents.length === 0 && <div className="empty">Документы пока не загружены.</div>}
            {documents.map((doc) => (
              <div className="card" key={doc.id}>
                <div className="row">
                  <div className="title">{doc.file_name}</div>
                  <div className="tags">
                    <span className={`chip ${doc.active ? "tag-success" : "tag-warning"}`}>
                      {doc.active ? "В выдаче" : "Отключен"}
                    </span>
                    <span className="chip">#{doc.id}</span>
                  </div>
                </div>
                <div className="muted">Источник: {doc.source}</div>
                <div className="muted">Добавлен: {formatDate(doc.created_at)}</div>
                <div className="panel-actions">
                  <button
                    className="ghost compact"
                    onClick={() => handleToggleDocument(doc)}
                    disabled={busy}
                  >
                    {doc.active ? "Скрыть из поиска" : "Включить"}
                  </button>
                  <button
                    className="danger compact"
                    onClick={() => handleDeleteDocument(doc)}
                    disabled={busy}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Пользователи</h3>
              <div className="muted">Управление ролями и чистка доступа</div>
            </div>
          </div>
          <div className="list">
            {users.length === 0 && <div className="empty">Пользователи еще не подключались.</div>}
            {users.map((user) => (
              <div className="card" key={user.id}>
                <div className="row">
                  <div className="title">{user.telegram_name}</div>
                  <div className="tags">
                    <span className="chip">#{user.telegram_id}</span>
                    <span className={`chip ${user.role === "admin" ? "tag-success" : ""}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="panel-actions">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                    disabled={busy}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="danger compact" onClick={() => handleDeleteUser(user)} disabled={busy}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Инвайт-коды</h3>
              <div className="muted">Создавайте приглашения для новых участников бота</div>
            </div>
          </div>
          <div className="field-group">
            <input
              type="number"
              placeholder="Лимит использований (опционально)"
              value={maxUses ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setMaxUses(value ? Number(value) : undefined);
              }}
              className="compact"
            />
            <button className="primary" onClick={handleCreateInvite} disabled={busy}>
              Новый код
            </button>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {invites.length === 0 && <div className="empty">Пока нет активных кодов.</div>}
            {invites.map((invite) => (
              <div className="card" key={invite.id}>
                <div className="row">
                  <div className="title">{invite.code}</div>
                  <div className="tags">
                    <span className="chip">#{invite.id}</span>
                    <span className="chip">
                      Использовано: {invite.used_count}
                      {invite.max_uses ? ` / ${invite.max_uses}` : " / ∞"}
                    </span>
                  </div>
                </div>
                <div className="muted">Создан: {formatDate(invite.created_at)}</div>
                <div className="panel-actions">
                  <button
                    className="ghost compact"
                    onClick={() => navigator.clipboard?.writeText(invite.code)}
                  >
                    Скопировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
