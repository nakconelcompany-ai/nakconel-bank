import { createFileRoute } from "@tanstack/react-router";
import { ensureDbReady } from "@/lib/db";
import { auth } from "@/lib/auth/server";

async function handle(request: Request) {
  try {
    await ensureDbReady();
    return await auth.handler(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-up failed";
    console.error("[auth]", message);
    return Response.json({ message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
