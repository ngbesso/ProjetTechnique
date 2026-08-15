import { http, setToken } from "./client";
import type { UserInfo, Token, UserCreate } from "../../types";

export async function login(email: string, password: string): Promise<UserInfo> {
  const { access_token } = await http.postForm<Token>("/auth/login", {
    username: email,
    password,
  });
  setToken(access_token);
  return http.get<UserInfo>("/auth/me");
}

export async function fetchMe(): Promise<UserInfo> {
  return http.get<UserInfo>("/auth/me");
}

export async function register(data: UserCreate): Promise<UserInfo> {
  return http.post<UserInfo>("/auth/register", data);
}

export function logout(): void {
  setToken(null);
}
export function setPassword(token: string, password: string): Promise<Token> {
  return http.post<Token>("/auth/set-password", { token, password });
}

export function forgotPassword(email: string): Promise<void> {
  return http.post<void>("/auth/forgot-password", { email });
}

export function resetPassword(token: string, password: string): Promise<Token> {
  return http.post<Token>("/auth/reset-password", { token, password });
}
