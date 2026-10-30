import { createFileRoute } from "@tanstack/react-router";
import { ensureDbReady, getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

async function databaseProblem() {
  try {
    const sql = await getSql();
    const tables = await sql<{ name: string }>`
      select tablename as name from pg_tables where schemaname = 'public' order by tablename
    `;
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values ('signup-probe', 'Probe', 'signup-probe@example.com', false, now(), now())
      `;
      await sql`delete from "user" where "id" = 'signup-probe'`;
      return `Sign-up was rejected after the database check. Tables: ${tables.map((t) => t.name).join(", ") || "none"}.`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "The account could not be saved.";
      return message;
    }
  } catch (err) {
    return err instanceof Error ? err.message : "The database could not be reached.";
  }
}

async function handle(request: Request) {
  try {
    await ensureDbReady();
    const response = await auth.handler(request);
    if (response.status < 500) return response;
    const text = await response.clone().text();
    if (text.trim()) return response;
    return Response.json({ message: await databaseProblem() }, { status: 500 });
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
