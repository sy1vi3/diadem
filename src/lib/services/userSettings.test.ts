import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
	vi.stubGlobal("$state", (value: unknown) => value);
	return {
		config: {
			general: {},
			uiconSets: [{ id: "test", url: "/icons" }],
			defaultFilters: {
				pokemon: { enabled: true, filters: [{ title: "Hundo", iv: { min: 100, max: 100 } }] }
			}
		},
		storage: new Map<string, string>(),
		fetch: vi.fn()
	};
});
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("@/lib/services/config/config", () => ({ getConfig: () => state.config }));
vi.mock("@/lib/services/themeMode", () => ({
	getDefaultMapStyle: () => ({ id: "test", url: "/style" })
}));
vi.mock("@/lib/services/user/userDetails.svelte.js", () => ({
	getUserDetails: () => ({ details: { id: "user" } })
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));
vi.mock("@/lib/features/filters/icons", () => ({
	IconCategory: { POKEMON: "pokemon", RAID: "raid" }
}));
vi.mock("@/lib/utils/gymUtils", () => ({
	getDefaultGymFilter: () => ({ category: "gym", enabled: true, filters: [] })
}));
vi.mock("@/lib/utils/pokestopUtils", () => ({
	getDefaultPokestopFilter: () => ({ category: "pokestop", enabled: false, filters: [] })
}));
vi.mock("@/lib/utils/stationUtils", () => ({
	getDefaultStationFilter: () => ({ category: "station", enabled: false, filters: [] })
}));
import { decode } from "@msgpack/msgpack";
import {
	getDefaultUserSettings,
	getUserSettings,
	setUserSettings,
	syncUserSettings,
	updateUserSettings
} from "./userSettings.svelte";

beforeEach(() => {
	state.storage.clear();
	vi.stubGlobal("window", { localStorage: {} });
	vi.stubGlobal("localStorage", {
		setItem: (key: string, value: string) => state.storage.set(key, value)
	});
	vi.stubGlobal("fetch", state.fetch.mockReset().mockResolvedValue(new Response("{}")));
});
afterAll(() => vi.unstubAllGlobals());

describe("site defaults and saved user settings", () => {
	it("uses site defaults for new or reset settings", () => {
		setUserSettings({});
		expect(getUserSettings().filters.pokemon).toMatchObject({
			enabled: true,
			filters: [{ title: { message: "Hundo" } }]
		});
	});

	it("preserves saved disabled layers and empty preset arrays", () => {
		const saved = getDefaultUserSettings();
		saved.filters.pokemon = { category: "pokemon", enabled: false, filters: [] };
		setUserSettings(saved);
		expect(getUserSettings().filters.pokemon).toEqual(saved.filters.pokemon);
	});

	it("editing a preset cannot mutate site defaults", () => {
		setUserSettings({});
		getUserSettings().filters.pokemon.filters[0].iv!.min = 50;
		expect(state.config.defaultFilters.pokemon.filters[0].iv.min).toBe(100);
		expect(getDefaultUserSettings().filters.pokemon.filters[0].iv!.min).toBe(100);
	});

	it("keeps full settings in local storage and the current server sync payload", async () => {
		setUserSettings({});
		updateUserSettings();
		await syncUserSettings();
		const saved = JSON.parse(state.storage.get("userSettings")!);
		expect(saved.filters.pokemon.enabled).toBe(true);
		expect(saved.filters.pokemon.filters).toHaveLength(1);
		const [url, options] = state.fetch.mock.calls[0];
		expect(url).toBe("/api/user/settings");
		expect(decode(options.body)).toEqual(saved);
	});
});
