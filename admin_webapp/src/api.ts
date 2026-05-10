import {
  AuthResponse,
  Document,
  DocumentListResponse,
  IngestResponse,
  InviteCode,
  InviteCodeListResponse,
  User,
  UserListResponse,
  UserRole,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(
  /\/$/,
  "",
);

const readError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `Request failed with status ${response.status}`;

  try {
    const data = JSON.parse(text);
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // ignore JSON parse errors
  }

  return text;
};

const apiRequest = async <T>(
  path: string,
  options: RequestInit,
  initData: string,
): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("X-Telegram-Init-Data", initData);

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.method && options.method !== "GET" && options.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
};

export const fetchAuth = (initData: string): Promise<AuthResponse> =>
  apiRequest<AuthResponse>("/users/me", { method: "GET" }, initData);

export const fetchDocuments = (initData: string): Promise<DocumentListResponse> =>
  apiRequest<DocumentListResponse>("/document", { method: "GET" }, initData);

export const uploadPdf = (initData: string, file: File): Promise<IngestResponse> => {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<IngestResponse>(
    "/document/pdf",
    {
      method: "POST",
      body: form,
    },
    initData,
  );
};

export const toggleDocumentActive = (
  initData: string,
  documentId: number,
  active: boolean,
): Promise<Document> =>
  apiRequest<Document>(
    `/document/${documentId}/active`,
    {
      method: "PATCH",
      body: JSON.stringify({ active }),
    },
    initData,
  );

export const deleteDocument = (initData: string, documentId: number): Promise<Document> =>
  apiRequest<Document>(
    `/document/${documentId}`,
    {
      method: "DELETE",
    },
    initData,
  );

export const fetchUsers = (initData: string): Promise<UserListResponse> =>
  apiRequest<UserListResponse>("/users", { method: "GET" }, initData);

export const updateUserRole = (
  initData: string,
  userId: number,
  role: UserRole,
): Promise<User> =>
  apiRequest<User>(
    `/users/${userId}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
    initData,
  );

export const deleteUser = (initData: string, telegramId: number): Promise<User> =>
  apiRequest<User>(
    "/users",
    {
      method: "DELETE",
      body: JSON.stringify({ telegram_id: telegramId }),
    },
    initData,
  );

export const fetchInviteCodes = (initData: string): Promise<InviteCodeListResponse> =>
  apiRequest<InviteCodeListResponse>("/users/invite-codes", { method: "GET" }, initData);

export const createInviteCode = (
  initData: string,
  maxUses?: number,
): Promise<{ code: string }> =>
  apiRequest<{ code: string }>(
    "/users/invite-codes",
    {
      method: "POST",
      body: JSON.stringify(
        typeof maxUses === "number" && maxUses > 0 ? { max_uses: maxUses } : {},
      ),
    },
    initData,
  );
