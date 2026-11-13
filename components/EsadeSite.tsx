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

// Tells the site script who is signed in: an admin (ADMIN_EMAILS), or a member with their role scope
// (the Hub only offers the views that scope allows; the data itself is checked in Convex).
function AdminBridge() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.admin.me, isAuthenticated ? {} : "skip") as
    | {
        email: string;
        name: string;
        isAdmin: boolean;
        label?: string;
        exec?: boolean;
        heads?: string[];
        assoc?: { department: string; teams: string[] }[];
        teams?: string[];
        viewer?: boolean;
      }
    | null
    | undefined;
  const value: SiteAdmin =
    isLoading || (isAuthenticated && me === undefined) ? undefined : me?.isAdmin
        ? { email: me.email, name: me.name }
        : me?.label
          ? {
              email: me.email,
              name: me.name,
              captain: true, // any signed-in member who is not an admin
              label: me.label,
              scope: { exec: !!me.exec, heads: me.heads ?? [], assoc: me.assoc ?? [], teams: me.teams ?? [], viewer: !!me.viewer },
            }
          : null;
  useEffect(() => pushAdmin(value), [value === undefined ? "?" : value ? value.email + (value.captain ? ":" + value.label : "") : ""]); // eslint-disable-line react-hooks/exhaustive-deps
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
      // Alumni corner: profiles wait for an admin's approval; the public list never includes email or phone.
      requestAccess: (a: Record<string, unknown>) => client.mutation(api.org.requestAccess, a as never),
      submitAlumniProfile: (a: Record<string, unknown>) => client.mutation(api.forms.submitAlumniProfile, a as never),
      listAlumni: () => client.query(api.alumni.listPublic, {}),
      // Team editor: public fields for the team pages; full details only for members who see the team.
      listTeamInfo: () => client.query(api.teamInfo.listPublic, {}),
      getTeamInfo: (teamId: string) => client.query(api.teamInfo.get, { teamId }),
      saveTeamInfo: (a: Record<string, unknown>) => client.mutation(api.teamInfo.save, a as never),
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
