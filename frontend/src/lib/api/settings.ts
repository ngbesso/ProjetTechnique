import { http } from "./client";
import type { AppSetting } from "../../types";

export function fetchPublicSettings(): Promise<Record<string, string>> {
    return http.get<Record<string, string>>("/settings/public");
}

export function fetchSettings(): Promise<AppSetting[]> {
    return http.get<AppSetting[]>("/settings");
}

export function updateSetting(key: string, value: string): Promise<AppSetting> {
    return http.put<AppSetting>(`/settings/${key}`, { value });
}
