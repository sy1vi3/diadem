import type { ClientConfig } from "@/lib/services/config/configTypes";

let config: ClientConfig;
let serverResolver: (() => ClientConfig) | undefined;

export function setServerConfigResolver(resolver: () => ClientConfig) {
	serverResolver = resolver;
}

export function setConfig(newConfig: ClientConfig) {
	config = newConfig;
}

export function getConfig() {
	return serverResolver ? serverResolver() : config;
}
