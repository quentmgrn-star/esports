export type SiteAdmin = { email: string; name?: string; captain?: boolean;
  label?: string;
  scope?: { exec: boolean; heads: string[]; assoc: { department: string; teams: string[] }[]; teams: string[]; viewer: boolean };
} | null | undefined;
export function initSite(backend: Record<string, (...args: any[]) => unknown> | null, tools?: Record<string, (...args: any[]) => unknown>): { setAdmin: (a: SiteAdmin) => void };
