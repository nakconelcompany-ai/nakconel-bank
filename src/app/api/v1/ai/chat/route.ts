import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { writeAudit } from '@/lib/audit';
import { answerFinancialChat } from '@/domains/ai/chat';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Enter a message of up to 1,000 characters.' }, { status: 400 });
  }

  try {
    const result = await answerFinancialChat(userId, parsed.data.message);
    await writeAudit({
      userId,
      action: 'AI_CHAT_MESSAGE',
      resource: 'aiChat',
      ip: req.headers.get('x-forwarded-for') ?? undefined,
      meta: { messageLength: parsed.data.message.length, mode: result.mode },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nakconel AI could not answer right now.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
