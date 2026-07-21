import { getToken } from "./client";

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

export interface AdminChatResponse {
  answer: string;
  used_stats: string[];
}

export async function askAdminAssistant(question: string): Promise<AdminChatResponse> {
  const token = getToken();
  const res = await fetch(`${AI_SERVICE_URL}/admin/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Accès refusé : cette fonctionnalité est réservée aux administrateurs.");
  }
  if (!res.ok) {
    throw new Error("L'assistant IA n'a pas pu répondre pour le moment.");
  }
  return res.json() as Promise<AdminChatResponse>;
}
