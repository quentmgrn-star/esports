export type SiteAdmin = { email: string; name?: string; captain?: boolean; label?: string } | null | undefined;
export function initSite(backend: Record<string, (...args: any[]) => unknown> | null): { setAdmin: (a: SiteAdmin) => void };
