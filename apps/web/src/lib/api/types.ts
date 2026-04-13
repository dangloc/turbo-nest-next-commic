export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionUser {
  id: number;
  email: string;
  nickname?: string | null;
  role: "USER" | "AUTHOR" | "ADMIN";
}

export interface SessionPayload {
  user: SessionUser;
}

export interface EmptyObject {
  [key: string]: never;
}
