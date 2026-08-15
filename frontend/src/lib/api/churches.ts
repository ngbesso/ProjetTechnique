// churches.ts
import { http } from "./client";
import type { Church, ChurchInput, ChurchUpdateInput, District } from "../../types";

export function fetchChurches(opts?: { district?: District; activeOnly?: boolean }): Promise<Church[]> {
    const params = new URLSearchParams();
    if (opts?.district) params.set("district", opts.district);
    if (opts?.activeOnly) params.set("active", "true");
    const qs = params.toString();
    return http.get<Church[]>(`/churches${qs ? `?${qs}` : ""}`);
}

export function createChurch(data: ChurchInput): Promise<Church> {
    return http.post<Church>("/churches", data);
}

export function updateChurch(id: number, data: ChurchUpdateInput): Promise<Church> {
    return http.patch<Church>(`/churches/${id}`, data);
}

export function deleteChurch(id: number): Promise<void> {
    return http.del(`/churches/${id}`);
}