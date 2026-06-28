export interface UserInfo {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  roles: string[];
  permissions: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Permission {
  code: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface UserCreate {
  email: string;
  password: string;
}

export type Page = "home" | "login" | "register" | "admin";
