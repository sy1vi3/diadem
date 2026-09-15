import type { ClientConfig, SiteConfig } from "./configTypes";

export function normalizeSiteOrigin(value: string): string {
	const url = new URL(value);
	if (
		!["https:", "http:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.hostname.includes("*") ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	) {
		throw new Error(`Site origin must be an HTTP(S) origin without a path: ${value}`);
	}
	return url.origin;
}

export function createSiteConfigs(base: ClientConfig, sites: SiteConfig[] = []) {
	const result = new Map<string, ClientConfig>();
	for (const site of sites) {
		const origin = normalizeSiteOrigin(site.origin);
		if (result.has(origin)) throw new Error(`Duplicate site origin: ${origin}`);
		result.set(origin, {
			...base,
			general: { ...base.general, url: origin, ...site.client.general },
			discord: { ...base.discord, ...site.client.discord },
			mapPositions: { ...base.mapPositions, ...site.client.mapPositions },
			tools: { ...base.tools, ...site.client.tools },
			defaultFilters: site.client.defaultFilters ?? base.defaultFilters
		});
	}
	return result;
}
