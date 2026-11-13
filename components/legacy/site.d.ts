export type SiteAdmin = { email: string; name?: string } | null | undefined;
export function initSite(backend: Record<string, (...args: any[]) => unknown> | null): { setAdmin: (a: SiteAdmin) => void };
