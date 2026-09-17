import { describe, expect, it } from "vitest";
import {
	homepageSchema,
	homepageServerSchema,
	mergeHomepage,
	validateHomepageRegions
} from "./config";

describe("homepage configuration", () => {
	it("inherits theme fields, replaces tier arrays, and strips unknown public fields", () => {
		const base = {
			theme: { background: "#111111", button: "#aabbcc" },
			tiers: [{ id: "base", label: "Base" }]
		};
		const result = mergeHomepage(base, {
			theme: { background: "#222222" },
			tiers: [],
			webhookToken: "private"
		} as never)!;
		expect(result.theme).toMatchObject({ background: "#222222", button: "#aabbcc" });
		expect(result.tiers).toEqual([]);
		expect(result).not.toHaveProperty("webhookToken");
		expect(base.theme.background).toBe("#111111");
	});
	it("requires safe configuration values", () => {
		expect(() =>
			homepageSchema.parse({ background: { imageUrl: "javascript:alert(1)" } })
		).toThrow();
		expect(
			homepageSchema.parse({ background: { imageUrl: "/homepage/phoenix.webp" } }).background
				.imageUrl
		).toBe("/homepage/phoenix.webp");
		expect(() => homepageSchema.parse({ theme: { background: "red;display:none" } })).toThrow();
		expect(() =>
			homepageSchema.parse({ tiers: [{ id: "x", label: "X", purchaseUrl: "javascript:alert(1)" }] })
		).toThrow();
		expect(() =>
			homepageSchema.parse({
				tiers: [
					{ id: "x", label: "X" },
					{ id: "x", label: "Y" }
				]
			})
		).toThrow();
	});
	it("validates region references and publishes only public coverage IDs", () => {
		const server = homepageServerSchema.parse({
			webhookToken: "w".repeat(24),
			regions: [{ id: "phoenix", areaIds: [12, 34] }]
		});
		const first = homepageSchema.parse({ regionId: "phoenix" });
		const alias = homepageSchema.parse({ regionId: "phoenix", title: "Beta" });
		validateHomepageRegions([first, alias], server);
		expect(first.coverageAreaIds).toEqual([12, 34]);
		expect(alias.coverageAreaIds).toEqual(first.coverageAreaIds);
		expect(JSON.stringify(first)).not.toContain("private");
		expect(() => validateHomepageRegions([{ regionId: "missing" }], server)).toThrow(
			"Unknown homepage region"
		);
	});
});
