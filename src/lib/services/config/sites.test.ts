import { describe, expect, it, vi } from "vitest";
import type { ClientConfig } from "./configTypes";
import { createSiteConfigs, normalizeSiteOrigin } from "./sites";

const base = {
	general: { mapName: "Base", defaultLocale: "en", customHome: false, defaultLat: 1 },
	discord: { serverId: "base", serverLink: "base-link" },
	mapPositions: { styleLat: 10 },
	tools: { scout: true },
	mapStyles: [],
	uiconSets: []
} as unknown as ClientConfig;

it("merges presentation fields without changing base config", () => {
	const before = structuredClone(base);
	const configs = createSiteConfigs(base, [
		{
			origin: "https://north.example/",
			client: {
				general: { mapName: "North", defaultLat: 20 },
				discord: { serverId: "north" }
			}
		}
	]);
	const north = configs.get("https://north.example")!;
	expect(north.general).toMatchObject({
		mapName: "North",
		defaultLocale: "en",
		defaultLat: 20,
		url: "https://north.example"
	});
	expect(north.discord).toEqual({ serverId: "north", serverLink: "base-link" });
	expect(base).toEqual(before);
	expect(configs.get("https://north.example.evil")).toBeUndefined();
});

it.each([
	"https://north.example/path",
	"https://user:pass@north.example",
	"ftp://north.example",
	"https://*.example",
	"https://north.example?x=1",
	"https://north.example#x"
])("rejects non-origin %s", (value) => {
	expect(() => normalizeSiteOrigin(value)).toThrow();
});
it("rejects duplicate normalized origins", () => {
	expect(() =>
		createSiteConfigs(base, [
			{ origin: "https://north.example/", client: {} },
			{ origin: "https://NORTH.example", client: {} }
		])
	).toThrow("Duplicate");
});

vi.mock("node:fs", () => ({
	default: {
		readFileSync: () => `
[server]
[client.general]
mapName = "Base"
[[sites]]
origin = "https://north.example"
[sites.client.general]
mapName = "North"
[[sites]]
origin = "https://south.example"
[sites.client.general]
mapName = "South"
`
	}
}));
import { getClientConfig, getSiteOrigin, withSiteConfig } from "./config.server";

describe("request config isolation", () => {
	it("keeps overlapping requests and background defaults separate", async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const north = withSiteConfig("https://north.example", async () => {
			await gate;
			expect(getSiteOrigin()).toBe("https://north.example");
			return getClientConfig().general.mapName;
		});
		const south = withSiteConfig("https://south.example", async () => {
			await Promise.resolve();
			release();
			return getClientConfig().general.mapName;
		});
		expect(await Promise.all([north, south])).toEqual(["North", "South"]);
		expect(getClientConfig().general.mapName).toBe("Base");
		expect(withSiteConfig("https://unknown.example", () => getClientConfig().general.mapName)).toBe(
			"Base"
		);
	});
});
