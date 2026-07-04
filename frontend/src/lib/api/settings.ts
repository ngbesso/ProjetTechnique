import { http } from "./client";
import type { AppSetting } from "../../types";

export function fetchSettings(): Promise<AppSetting[]> {
    return http.get<AppSetting[]>("/settings");
}

export function updateSetting(key: string, value: string): Promise<AppSetting> {
    return http.put<AppSetting>(`/settings/${key}`, { value });
}
