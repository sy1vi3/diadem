import {
	mergeHomepage,
	homepageServerSchema,
	validateHomepageRegions
} from "../../homepage/config";
import { AsyncLocalStorage } from "node:async_hooks";
import { createSiteConfigs } from "./sites";
import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { parse } from "toml";

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8");
const config: Config = parse(configFile);

config.client.homepage = mergeHomepage(config.client.homepage);
const homepageServer = config.server.homepage
	? homepageServerSchema.parse(config.server.homepage)
	: undefined;
config.server.homepage = homepageServer;

const siteConfigs = createSiteConfigs(config.client, config.sites);
validateHomepageRegions(
	[config.client.homepage, ...[...siteConfigs.values()].map((site) => site.homepage)],
	homepageServer
);
const requestOrigin = new AsyncLocalStorage<string>();

export function withSiteConfig<T>(origin: string, callback: () => T): T {
	return requestOrigin.run(origin, callback);
}

export function getSiteOrigins() {
	return [...siteConfigs.keys()];
}

export function getSiteOrigin() {
	const origin = requestOrigin.getStore();
	return origin && siteConfigs.has(origin) ? origin : undefined;
}

export function getServerConfig(): Omit<Config["server"], "homepage"> & {
	homepage: typeof homepageServer;
} {
	return { ...config.server, homepage: homepageServer };
}

export function getClientConfig() {
	return siteConfigs.get(requestOrigin.getStore() ?? "") ?? config.client;
}
