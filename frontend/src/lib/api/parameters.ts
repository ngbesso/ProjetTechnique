import { http } from "./client";
import type { ParameterValue } from "../../types";

export function fetchParameters(category: string): Promise<ParameterValue[]> {
    return http.get<ParameterValue[]>(`/parameters/${category}`);
}

export function createParameterValue(category: string, label: string, position = 0): Promise<ParameterValue> {
    return http.post<ParameterValue>(`/parameters/${category}`, { label, position });
}

export function updateParameterValue(id: number, data: { label?: string; position?: number }): Promise<ParameterValue> {
    return http.patch<ParameterValue>(`/parameters/${id}`, data);
}

export function deleteParameterValue(id: number): Promise<void> {
    return http.del(`/parameters/${id}`);
}
