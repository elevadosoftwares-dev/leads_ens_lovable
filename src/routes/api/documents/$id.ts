import { createFileRoute } from "@tanstack/react-router";

const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
]);

// Streams a certification's uploaded certificate/document to a signed-in user.
export const Route = createFileRoute("/api/documents/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getSessionUser } = await import("@/server/auth.server");
        if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });

        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Not found", { status: 404 });

        const { request, sql } = await import("@/server/db.server");
        const req = await request();
        const { recordset } = await req.input("id", sql.UniqueIdentifier, params.id).query<{
          doc_file_name: string | null;
          doc_content_type: string | null;
          doc_data: Buffer | null;
        }>(`SELECT doc_file_name, doc_content_type, doc_data FROM dbo.certifications WHERE id = @id`);
        const doc = recordset[0];
        if (!doc?.doc_data) return new Response("Not found", { status: 404 });

        // Only open known-safe types in the browser; anything else (HTML, SVG, ...) could run
        // script on this origin, so it is sent as a plain download.
        const type = (doc.doc_content_type ?? "").toLowerCase();
        const inline = INLINE_TYPES.has(type);
        const fileName = doc.doc_file_name || "document";
        return new Response(new Uint8Array(doc.doc_data), {
          headers: {
            "content-type": inline ? type : "application/octet-stream",
            "content-length": String(doc.doc_data.length),
            "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "x-content-type-options": "nosniff",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
