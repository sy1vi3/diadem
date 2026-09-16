import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/filters/icons", () => ({
	IconCategory: { POKEMON: "pokemon", RAID: "raid", ITEM: "item" }
}));
import { IconCategory } from "@/lib/features/filters/icons";
import { applyDefaultFilters, type DefaultFilters } from "./defaultFilters";

const base = {
	pokemon: { category: "pokemon", enabled: false, filters: [] },
	gym: {
		category: "gym",
		enabled: true,
		filters: [],
		gymPlain: { category: "gymPlain", enabled: true, filters: [] },
		raid: { category: "raid", enabled: true, filters: [] }
	},
	s2cell: { category: "s2cell", enabled: false, level: 14, wayfarerMode: false }
};

afterEach(() => vi.restoreAllMocks());

describe("configured starting filters", () => {
	it("leaves built-in defaults unchanged when omitted", () => {
		expect(applyDefaultFilters(base, undefined)).toEqual(base);
	});

	it("merges nested enabled flags without changing sibling layers", () => {
		expect(applyDefaultFilters(base, { gym: { gymPlain: { enabled: false } } })).toEqual({
			...base,
			gym: { ...base.gym, gymPlain: { ...base.gym.gymPlain, enabled: false } }
		});
	});

	it("normalizes minimal presets with stable ids and leaves input untouched", () => {
		const config = {
			pokemon: {
				enabled: true,
				filters: [{ title: "Hundo", emoji: "💯", iv: { min: 100, max: 100 } }]
			},
			gym: {
				raid: {
					filters: [
						{
							title: "Legendary",
							uicon: { category: IconCategory.RAID, params: { level: 5 } },
							levels: [5]
						}
					]
				}
			}
		} satisfies DefaultFilters;
		const before = structuredClone(config);
		const result = applyDefaultFilters(base, config);
		expect(result.pokemon.filters).toEqual([
			{
				id: "default-pokemon-0",
				title: { message: "Hundo" },
				enabled: true,
				icon: { isUserSelected: false, emoji: "💯" },
				iv: { min: 100, max: 100 }
			}
		]);
		expect(result.gym.raid.filters).toMatchObject([{ id: "default-raid-0", levels: [5] }]);
		expect(applyDefaultFilters(base, config)).toEqual(result);
		expect(config).toEqual(before);
		expect(base.pokemon.filters).toEqual([]);
	});

	it("preserves explicit preset ids, disabled presets, and partial icon metadata", () => {
		const result = applyDefaultFilters(base, {
			pokemon: { filters: [{ id: "custom", enabled: false, icon: { emoji: "x" } }] }
		});
		expect(result.pokemon.filters).toMatchObject([
			{ id: "custom", enabled: false, icon: { isUserSelected: false, emoji: "x" } }
		]);
	});

	it("skips malformed presets but retains valid neighbors", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = applyDefaultFilters(base, {
			pokemon: { filters: [null, { iv: "bad" }, { title: "Valid" }] }
		});
		expect(result.pokemon.filters).toMatchObject([
			{ id: "default-pokemon-2", title: { message: "Valid" } }
		]);
	});

	it("ignores invalid scalar types, unknown layers, and category overrides", () => {
		expect(
			applyDefaultFilters(base, {
				unknown: {},
				pokemon: { enabled: "false", category: "gym", filters: "bad" },
				s2cell: { level: 31 }
			})
		).toEqual(base);
	});

	it("applies valid S2 options", () => {
		expect(
			applyDefaultFilters(base, { s2cell: { enabled: true, level: 17, wayfarerMode: true } }).s2cell
		).toEqual({ category: "s2cell", enabled: true, level: 17, wayfarerMode: true });
	});

	it("replaces preset arrays including an explicitly empty list", () => {
		const configured = applyDefaultFilters(base, { pokemon: { filters: [{ title: "Default" }] } });
		expect(applyDefaultFilters(configured, { pokemon: { filters: [] } }).pokemon.filters).toEqual(
			[]
		);
	});
});
