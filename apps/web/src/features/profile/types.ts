export interface ProfileData {
  id: number;
  email: string;
  role: "USER" | "AUTHOR" | "ADMIN";
  nickname: string | null;
  avatar: string | null;
  updatedAt: string;
}

export interface ProfileSessionInfo {
  tokenSource: "bearer" | "cookie";
}

export interface ProfileResponse {
  profile: ProfileData;
  session: ProfileSessionInfo;
}

export interface UpdateProfileInput {
  email?: string;
  displayName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
