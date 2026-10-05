import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 2000;

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_MESSAGE_LENGTH),
});

export const advisorRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Please enter a message.")
    .max(MAX_MESSAGE_LENGTH, "Message is too long."),
  // Generous cap here — just enough to reject pathological payloads. The
  // route handler further trims this to the most recent few turns before
  // sending anything to Gemini, to keep context (and cost) small.
  history: z.array(historyMessageSchema).max(50).optional(),
});

export type AdvisorRequestInput = {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
};
