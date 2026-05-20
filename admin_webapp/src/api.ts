import {
  AuthResponse,
  Document,
  DocumentListResponse,
  IngestResponse,
  InviteCode,
  InviteCodeListResponse,
  KBMember,
  KBMemberListResponse,
  KbQueryListResponse,
  KnowledgeBase,
  KnowledgeBaseListResponse,
  User,
  UserListResponse,
  UserRole,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

const readError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `Request failed with status ${response.status}`;
  try {
    const data = JSON.parse(text);
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  } catch {
    // ignore
  }
  return text;
};

const getToken = (): string => localStorage.getItem("admin_token") ?? "";

const apiRequest = async <T>(path: string, options: RequestInit): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${getToken()}`);

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.method && options.method !== "GET" && options.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const fetchAuth = (): Promise<AuthResponse> =>
  apiRequest<AuthResponse>("/users/me", { method: "GET" });

// ─── Knowledge Bases ─────────────────────────────────────────────────────────

export const fetchKnowledgeBases = (): Promise<KnowledgeBaseListResponse> =>
  apiRequest<KnowledgeBaseListResponse>("/knowledge-bases", { method: "GET" });

export const createKnowledgeBase = (name: string, description?: string): Promise<KnowledgeBase> =>
  apiRequest<KnowledgeBase>(
    "/knowledge-bases",
    { method: "POST", body: JSON.stringify({ name, description: description || null }) },
  );

export const deleteKnowledgeBase = (kbId: number): Promise<KnowledgeBase> =>
  apiRequest<KnowledgeBase>(`/knowledge-bases/${kbId}`, { method: "DELETE" });

export const fetchKBMembers = (kbId: number): Promise<KBMemberListResponse> =>
  apiRequest<KBMemberListResponse>(`/knowledge-bases/${kbId}/members`, { method: "GET" });

export const addKBMember = (kbId: number, userId: number): Promise<KBMember> =>
  apiRequest<KBMember>(
    `/knowledge-bases/${kbId}/members`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) },
  );

export const removeKBMember = (kbId: number, userId: number): Promise<void> =>
  apiRequest<void>(`/knowledge-bases/${kbId}/members/${userId}`, { method: "DELETE" });

export const fetchKbQueries = (kbId: number, limit = 50): Promise<KbQueryListResponse> =>
  apiRequest<KbQueryListResponse>(`/knowledge-bases/${kbId}/queries?limit=${limit}`, { method: "GET" });

// ─── Documents ────────────────────────────────────────────────────────────────

export const fetchDocuments = (kbId?: number): Promise<DocumentListResponse> => {
  const qs = kbId !== undefined ? `?knowledge_base_id=${kbId}` : "";
  return apiRequest<DocumentListResponse>(`/document${qs}`, { method: "GET" });
};

export const uploadFile = (file: File, knowledgeBaseId?: number): Promise<Document> => {
  const form = new FormData();
  form.append("file", file);
  if (knowledgeBaseId !== undefined) {
    form.append("knowledge_base_id", String(knowledgeBaseId));
  }
  return apiRequest<Document>("/document/file", { method: "POST", body: form });
};

export const indexDocument = (documentId: number): Promise<IngestResponse> =>
  apiRequest<IngestResponse>(`/document/${documentId}/index`, { method: "POST" });

export const toggleDocumentActive = (documentId: number, active: boolean): Promise<Document> =>
  apiRequest<Document>(
    `/document/${documentId}/active`,
    { method: "PATCH", body: JSON.stringify({ active }) },
  );

export const deleteDocument = (documentId: number): Promise<Document> =>
  apiRequest<Document>(`/document/${documentId}`, { method: "DELETE" });

// ─── Users ───────────────────────────────────────────────────────────────────

export const fetchUsers = (): Promise<UserListResponse> =>
  apiRequest<UserListResponse>("/users", { method: "GET" });

export const updateUserRole = (userId: number, role: UserRole): Promise<User> =>
  apiRequest<User>(
    `/users/${userId}/role`,
    { method: "PATCH", body: JSON.stringify({ role }) },
  );

export const deleteUser = (telegramId: number): Promise<User> =>
  apiRequest<User>(
    "/users",
    { method: "DELETE", body: JSON.stringify({ telegram_id: telegramId }) },
  );

// ─── Invite Codes ─────────────────────────────────────────────────────────────

export const fetchInviteCodes = (): Promise<InviteCodeListResponse> =>
  apiRequest<InviteCodeListResponse>("/users/invite-codes", { method: "GET" });

export const createInviteCode = (maxUses?: number, knowledgeBaseId?: number, code?: string): Promise<{ code: string }> =>
  apiRequest<{ code: string }>(
    "/users/invite-codes",
    {
      method: "POST",
      body: JSON.stringify({
        ...(typeof maxUses === "number" && maxUses > 0 ? { max_uses: maxUses } : {}),
        ...(knowledgeBaseId !== undefined ? { knowledge_base_id: knowledgeBaseId } : {}),
        ...(code ? { code } : {}),
      }),
    },
  );

// ─── Stats ────────────────────────────────────────────────────────────────────

export const fetchStats = (): Promise<import("./types").StatsResponse> =>
  apiRequest<import("./types").StatsResponse>("/stats", { method: "GET" });

// ─── Health ───────────────────────────────────────────────────────────────────

export const fetchHealthServices = (): Promise<import("./types").ServicesHealthResponse> =>
  apiRequest<import("./types").ServicesHealthResponse>("/health/services", { method: "GET" });
