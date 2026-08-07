import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETENTION_DAYS = 90;
const ORPHAN_RETENTION_DAYS = 30;
const BUCKET = "support-attachments";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const orphanCutoff = new Date(Date.now() - ORPHAN_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: resolvedTickets, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, screenshot_path")
    .eq("status", "resolved")
    .lt("resolved_at", cutoff)
    .not("screenshot_path", "is", null);

  if (ticketError) {
    return new Response(JSON.stringify({ error: ticketError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const paths = (resolvedTickets ?? [])
    .map((t) => t.screenshot_path)
    .filter((p): p is string => Boolean(p));

  let deletedResolved = 0;
  let resolvedDeleteError: string | null = null;

  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      resolvedDeleteError = error.message;
    } else {
      deletedResolved = paths.length;
      await supabase
        .from("support_tickets")
        .update({ screenshot_path: null })
        .in("id", (resolvedTickets ?? []).map((t) => t.id));
    }
  }

  // Only clean old orphaned files in the ticket-attachment bucket.
  // The avatars bucket is never touched by this function.
  const { data: objects, error: objectError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

  let deletedOrphans = 0;
  let orphanDeleteError: string | null = null;

  if (!objectError && objects) {
    const oldObjects = objects.filter((o) => o.created_at && o.created_at < orphanCutoff);
    const objectPaths = oldObjects.map((o) => o.name).filter(Boolean);

    if (objectPaths.length) {
      const { data: ticketRows } = await supabase
        .from("support_tickets")
        .select("id, screenshot_path");
      const referenced = new Set((ticketRows ?? []).map((t) => t.screenshot_path).filter(Boolean));
      const orphanPaths = objectPaths.filter((p) => !referenced.has(p));

      if (orphanPaths.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(orphanPaths);
        if (error) orphanDeleteError = error.message;
        else deletedOrphans = orphanPaths.length;
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    retention_days: RETENTION_DAYS,
    orphan_retention_days: ORPHAN_RETENTION_DAYS,
    deleted_resolved_ticket_screenshots: deletedResolved,
    deleted_orphan_files: deletedOrphans,
    protected_buckets: ["avatars"],
    ticket_records_deleted: 0,
    errors: [resolvedDeleteError, orphanDeleteError].filter(Boolean),
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
