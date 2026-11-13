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
    };
    initSite(backend);
    initI18n();
  }, []);

  return <div id="site-root" dangerouslySetInnerHTML={{ __html: SITE_MARKUP }} />;
}
