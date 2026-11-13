"use client";

import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { convex } from "./ConvexClientProvider";
import { SITE_MARKUP } from "./legacy/markup";
import { initSite } from "./legacy/site";
import { initI18n } from "./legacy/i18n";

let started = false; // the prototype script binds global listeners: run it once per page load

export default function EsadeSite() {
  useEffect(() => {
    if (started) return;
    started = true;
    const client = convex;
    const backend = client && {
      submitTeamApplication: (a: Record<string, unknown>) =>
        client.mutation(api.forms.submitTeamApplication, a as never).catch(console.error),
      submitPartnerInquiry: (a: Record<string, unknown>) =>
        client.mutation(api.forms.submitPartnerInquiry, a as never).catch(console.error),
      // Uploads the CV (and optional video) to Convex storage, then stores the application.
      submitAssociationApplication: async (a: Record<string, unknown>, files: { cv: File; video?: File }) => {
        const upload = async (file: File) => {
          const url: string = await client.mutation(api.forms.generateUploadUrl, {});
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!res.ok) throw new Error("Upload failed");
          return ((await res.json()) as { storageId: string }).storageId;
        };
        const cvId = await upload(files.cv);
        const videoId = files.video ? await upload(files.video) : undefined;
        return client.mutation(api.forms.submitAssociationApplication, { ...a, cvId, videoId } as never);
      },
    };
    initSite(backend);
    initI18n();
  }, []);

  return <div id="site-root" dangerouslySetInnerHTML={{ __html: SITE_MARKUP }} />;
}
