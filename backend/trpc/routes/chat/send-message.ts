import { z } from "zod";
import { protectedProcedure } from "../../create-context";

interface Message {
  id: string;
  swapId: string;
  authorId: string;
  body: string;
  createdAt: string;
  isSystem?: boolean;
}

const messagesStore = new Map<string, Message[]>();

export const sendMessageProcedure = protectedProcedure
  .input(
    z.object({
      swapId: z.string(),
      body: z.string(),
      isSystem: z.boolean().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      swapId: input.swapId,
      authorId: ctx.user.id,
      body: input.body,
      createdAt: new Date().toISOString(),
      isSystem: input.isSystem,
    };

    const swapMessages = messagesStore.get(input.swapId) ?? [];
    swapMessages.push(message);
    messagesStore.set(input.swapId, swapMessages);

    console.log("[Chat] Message sent", message);

    return { message, success: true };
  });
