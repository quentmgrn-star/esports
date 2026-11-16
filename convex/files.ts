import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// Several attachments on one item (expense request, task update, application).
export const fileV = v.object({ id: v.id("_storage"), name: v.string(), type: v.optional(v.string()) });
export const filesV = v.array(fileV);
export const MAX_FILES = 10;

type F = { id: Id<"_storage">; name: string; type?: string };

// Trim names and keep at most MAX_FILES.
export function cleanFiles(files: F[] | undefined): F[] | undefined {
  if (!files?.length) return undefined;
  return files.slice(0, MAX_FILES).map((f) => ({ id: f.id, name: f.name.trim().slice(0, 120) || "File", type: f.type?.slice(0, 60) }));
}

// Download links for every attachment, including the single file older rows have.
export async function fileLinks(
  ctx: QueryCtx,
  row: { fileId?: Id<"_storage">; fileName?: string; fileType?: string; files?: F[] },
): Promise<{ url: string; name: string; type: string }[]> {
  const all: F[] = [...(row.fileId ? [{ id: row.fileId, name: row.fileName || "File", type: row.fileType }] : []), ...(row.files ?? [])];
  const out = [];
  for (const f of all) {
    const url = await ctx.storage.getUrl(f.id);
    if (url) out.push({ url, name: f.name, type: f.type ?? "" });
  }
  return out;
}
