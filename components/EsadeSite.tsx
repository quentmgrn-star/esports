"use client";

import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { convex } from "./ConvexClientProvider";
import { SITE_MARKUP } from "./legacy/markup";
import { initSite, type SiteAdmin } from "./legacy/site";
import { initI18n } from "./legacy/i18n";

let started = false; // the prototype script binds global listeners: run it once per page load
let site: ReturnType<typeof initSite> | null = null;
let admin: SiteAdmin = undefined; // latest login state, kept until the site script has started
function pushAdmin(a: SiteAdmin) {
  admin = a;
  site?.setAdmin(a);
}

// Tells the site script whether an admin is signed in (same check as /admin: email on ADMIN_EMAILS in Convex).
function AdminBridge() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.admin.me, isAuthenticated ? {} : "skip") as
    | { email: string; name: string; isAdmin: boolean }
    | null
    | undefined;
  const value: SiteAdmin =
    isLoading || (isAuthenticated && me === undefined) ? undefined : me?.isAdmin ? { email: me.email, name: me.name } : null;
  useEffect(() => pushAdmin(value), [value === undefined ? "?" : value ? value.email : ""]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function EsadeSite() {
  useEffect(() => {
    if (started) return;
    started = true;
    const client = convex;
    const backend = client && {
      signOut: () => authClient.signOut(),
      submitTeamApplication: (a: Record<string, unknown>) => client.mutation(api.forms.submitTeamApplication, a as never),
      submitPartnerInquiry: (a: Record<string, unknown>) =>
        client.mutation(api.forms.submitPartnerInquiry, a as never).catch(console.error),
      // Errors are passed back so the form can show them (e.g. rate limit).
      submitContactMessage: (a: Record<string, unknown>) => client.mutation(api.forms.submitContactMessage, a as never),
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
    site = initSite(backend);
    site.setAdmin(client ? admin : null);
    initI18n();
  }, []);

  return (
    <>
      {convex && <AdminBridge />}
      <div id="site-root" dangerouslySetInnerHTML={{ __html: SITE_MARKUP }} />
    </>
  );
}
