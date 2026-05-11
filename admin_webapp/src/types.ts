export type UserRole = "user" | "admin";

export type User = {
  id: number;
  telegram_name: string;
  telegram_id: number;
  role: UserRole;
  created_at?: string;
};

export type KnowledgeBase = {
  id: number;
  name: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
};

export type KBMember = {
  user_id: number;
  knowledge_base_id: number;
  created_at: string;
};

export type Document = {
  id: number;
  file_name: string;
  source: string;
  active: boolean;
  status: string;
  knowledge_base_id: number | null;
  created_at: string;
};

export type InviteCode = {
  id: number;
  code: string;
  knowledge_base_id: number | null;
  max_uses: number | null;
  used_count: number;
  is_used: boolean;
  expires_at: string | null;
  created_at: string;
};

export type AuthResponse = {
  user: User;
  is_admin: boolean;
  knowledge_bases: KnowledgeBase[];
};

export type IngestResponse = {
  document_id: number;
  chunks_indexed: number;
  knowledge_base_id: number | null;
};

export type KnowledgeBaseListResponse = {
  knowledge_bases: KnowledgeBase[];
};

export type KBMemberListResponse = {
  members: KBMember[];
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
