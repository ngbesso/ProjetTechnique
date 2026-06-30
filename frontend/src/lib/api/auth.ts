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
