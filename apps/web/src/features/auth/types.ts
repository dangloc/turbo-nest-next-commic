import type { SessionUser } from "../../lib/api/types";

export interface LocalLoginInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LocalRegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LocalAuthSession {
  tokenSource: "cookie" | "bearer";
  rememberMe: boolean;
  maxAge: number;
}

export interface LocalAuthUser extends SessionUser {
  username?: string | null;
  avatar?: string | null;
}

export interface LocalAuthSuccess {
  token: string;
  user: LocalAuthUser;
  session: LocalAuthSession;
}

export interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  form?: string;
}
