export type UserRole = "user" | "admin";

export type User = {
  id: number;
  telegram_name: string;
  telegram_id: number;
  role: UserRole;
};

export type Document = {
  id: number;
  file_name: string;
  source: string;
  active: boolean;
  created_at: string;
};

export type InviteCode = {
  id: number;
  code: string;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};

export type AuthResponse = {
  user: User;
  is_admin: boolean;
};

export type IngestResponse = {
  document_id: number;
  chunks_indexed: number;
};

export type DocumentListResponse = {
  documents: Document[];
};

export type UserListResponse = {
  users: User[];
};

export type InviteCodeListResponse = {
  invite_codes: InviteCode[];
};
