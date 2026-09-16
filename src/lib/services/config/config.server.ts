import { AsyncLocalStorage } from "node:async_hooks";
import { createSiteConfigs } from "./sites";
import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { parse } from "toml";

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8");
const config: Config = parse(configFile);

const siteConfigs = createSiteConfigs(config.client, config.sites);
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

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	return siteConfigs.get(requestOrigin.getStore() ?? "") ?? config.client;
}
