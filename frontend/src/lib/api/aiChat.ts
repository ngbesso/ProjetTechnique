const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

export interface ChatSource {
  title: string;
  type: "post" | "sermon";
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export async function askAssistant(question: string): Promise<ChatResponse> {
  const res = await fetch(`${AI_SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    throw new Error("Le service IA n'a pas pu répondre pour le moment.");
  }
  return res.json() as Promise<ChatResponse>;
}
