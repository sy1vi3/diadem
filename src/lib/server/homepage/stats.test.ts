import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getMultiplePokemon } from "@/lib/server/api/golbat/http";
import { query } from "@/lib/server/db/external/internalQuery";

vi.mock("@/lib/server/api/golbat/http", () => ({ getMultiplePokemon: vi.fn() }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn(async () => []) }));
vi.mock("./regions", () => ({ regionAreas: vi.fn(async () => []) }));
vi.mock("./counts", () => ({
	regionalCountQuery: (table: string) => ({ sql: `SELECT id, lat, lon FROM ${table}`, values: [] }),
	countRegionalRows: async () => 0
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		homepage: {
			regions: ["phoenix", "canada"].map((id) => ({
				id,
				areaIds: [1],
				pokemonRefreshSeconds: 60,
				fortRefreshSeconds: 900,
				maxStaleSeconds: 3600
			}))
		}
	})
}));
beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-09-16T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());
it("shares Golbat's live total across regions without querying Pokémon SQL", async () => {
	vi.mocked(getMultiplePokemon).mockResolvedValue({
		total: 123456,
		pokemon: [],
		examined: 0,
		skipped: 0
	});
	const { homepageStats } = await import("./stats");
	const results = await Promise.all([homepageStats("phoenix"), homepageStats("canada")]);
	expect(results.map((r) => r.pokemon.value)).toEqual([123456, 123456]);
	await homepageStats("phoenix");
	expect(getMultiplePokemon).toHaveBeenCalledTimes(1);
	expect(getMultiplePokemon).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
	expect(vi.mocked(query).mock.calls.every(([sql]) => !sql.includes("pokemon"))).toBe(true);
	vi.mocked(getMultiplePokemon).mockResolvedValue(undefined);
	vi.setSystemTime(Date.now() + 61000);
	expect((await homepageStats("phoenix")).pokemon).toMatchObject({ value: 123456, stale: true });
	expect(getMultiplePokemon).toHaveBeenCalledTimes(2);
});
it("does not turn an unavailable Golbat API into a zero count", async () => {
	vi.mocked(getMultiplePokemon).mockResolvedValue(undefined);
	const { homepageStats } = await import("./stats");
	expect((await homepageStats("phoenix")).pokemon.value).toBeNull();
});
