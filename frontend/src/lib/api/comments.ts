import { http } from "./client";
import type { Comment, CommentInput } from "../../types";

export function fetchComments(postId: number): Promise<Comment[]> {
  return http.get<Comment[]>(`/posts/${postId}/comments`);
}

export function createComment(postId: number, data: CommentInput): Promise<Comment> {
  return http.post<Comment>(`/posts/${postId}/comments`, data);
}

export function deleteComment(postId: number, commentId: number): Promise<void> {
  return http.del(`/posts/${postId}/comments/${commentId}`);
}
