// churches.ts
import { http } from "./client";
import type { Church, ChurchInput, District } from "../../types";

export function fetchChurches(district?: District): Promise<Church[]> {
    const qs = district ? `?district=${encodeURIComponent(district)}` : "";
    return http.get<Church[]>(`/churches${qs}`);
}

export function createChurch(data: ChurchInput): Promise<Church> {
    return http.post<Church>("/churches", data);
}

export function updateChurch(id: number, data: Partial<ChurchInput>): Promise<Church> {
    return http.patch<Church>(`/churches/${id}`, data);
}

export function deleteChurch(id: number): Promise<void> {
    return http.del(`/churches/${id}`);
}