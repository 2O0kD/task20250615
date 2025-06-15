import { z } from 'zod';

export const UserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const BoardSchema = z.object({
  boardId: z.string(),
  name: z.string(),
  createdBy: z.string(),
});

export type Board = z.infer<typeof BoardSchema>;

export const MessageSchema = z.object({
  messageId: z.string(),
  boardId: z.string(),
  userId: z.string(),
  content: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export interface MessageWithWebSocketUrl extends Message {
  webSocketUrl: string;
}
