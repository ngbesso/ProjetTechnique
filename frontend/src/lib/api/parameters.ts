import { http } from "./client";
import type { ParameterValue } from "../../types";

export function fetchParameters(category: string): Promise<ParameterValue[]> {
    return http.get<ParameterValue[]>(`/parameters/${category}`);
}

export function createParameterValue(
    category: string,
    label: string,
    position = 0,
    restrictedToSexe?: string | null,
): Promise<ParameterValue> {
    return http.post<ParameterValue>(`/parameters/${category}`, {
        label,
        position,
        restricted_to_sexe: restrictedToSexe,
    });
}

export function updateParameterValue(
    id: number,
    data: { label?: string; position?: number; restricted_to_sexe?: string | null },
): Promise<ParameterValue> {
    return http.patch<ParameterValue>(`/parameters/${id}`, data);
}

export function deleteParameterValue(id: number): Promise<void> {
    return http.del(`/parameters/${id}`);
}
