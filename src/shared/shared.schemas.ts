import { z } from 'zod';

// === События чата ===
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.number(),
  badges: z.array(z.string()).optional(),
  color: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// === События алертов ===
export const AlertSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['follow', 'sub', 'donation', 'raid']),
  username: z.string(),
  message: z.string().optional(),
  amount: z.number().optional(),
  timestamp: z.number(),
});

export type Alert = z.infer<typeof AlertSchema>;

// === События музыки ===
export const NowPlayingSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  coverUrl: z.string().url().optional(),
  progress: z.number().min(0).max(100),
  duration: z.number(),
});

export type NowPlaying = z.infer<typeof NowPlayingSchema>;

// === Типы для WebSocket ===
export const WSEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chat:message'), payload: ChatMessageSchema }),
  z.object({ type: z.literal('alert:trigger'), payload: AlertSchema }),
  z.object({ type: z.literal('music:update'), payload: NowPlayingSchema }),
]);

export type WSEvent = z.infer<typeof WSEventSchema>;