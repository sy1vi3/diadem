import type { BaseFilterset } from "@/lib/features/filters/filtersets";
import type { UserSettings } from "@/lib/services/userSettings.svelte";
import {
	FiltersetGymPlainSchema,
	FiltersetInvasionSchema,
	FiltersetLureSchema,
	FiltersetMaxBattleSchema,
	FiltersetPokemonSchema,
	FiltersetPokestopPlainSchema,
	FiltersetQuestSchema,
	FiltersetRaidSchema,
	FiltersetStationPlainSchema
} from "@/lib/features/filters/filtersetSchemas";
import type { ZodType } from "zod";

type ConfigFilterset<T extends BaseFilterset> = Omit<Partial<T>, "title" | "icon"> & {
	title?: string | T["title"];
	icon?: Partial<T["icon"]>;
	emoji?: string;
	uicon?: T["icon"]["uicon"];
};

type ConfigDefaults<T> = T extends BaseFilterset
	? ConfigFilterset<T>
	: T extends Array<infer U>
		? ConfigDefaults<U>[]
		: T extends object
			? { [K in keyof T as K extends "category" ? never : K]?: ConfigDefaults<T[K]> }
			: T;

export type DefaultFilters = ConfigDefaults<UserSettings["filters"]>;

const schemas: Record<string, ZodType> = {
	pokemon: FiltersetPokemonSchema,
	pokestopPlain: FiltersetPokestopPlainSchema,
	quest: FiltersetQuestSchema,
	invasion: FiltersetInvasionSchema,
	lure: FiltersetLureSchema,
	gymPlain: FiltersetGymPlainSchema,
	raid: FiltersetRaidSchema,
	stationPlain: FiltersetStationPlainSchema,
	maxBattle: FiltersetMaxBattleSchema
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFilterset(category: string, index: number, raw: unknown) {
	if (!isRecord(raw)) return undefined;
	const { title, emoji, uicon, id, icon, enabled, ...rest } = raw;
	const normalized = {
		...rest,
		id: id ?? `default-${category}-${index}`,
		enabled: enabled ?? true,
		title: typeof title === "string" ? { message: title } : (title ?? { message: "" }),
		icon: {
			isUserSelected: false,
			...(isRecord(icon) ? icon : {}),
			...(emoji !== undefined ? { emoji } : {}),
			...(uicon !== undefined ? { uicon } : {})
		}
	};
	if (!schemas[category]?.safeParse(normalized).success) {
		console.warn(`Ignoring invalid default filter in category "${category}" at index ${index}.`);
		return undefined;
	}
	return structuredClone(normalized);
}

/** Apply site defaults only; persisted user settings are merged over these by the caller. */
export function applyDefaultFilters<T extends Record<string, unknown>>(
	defaults: T,
	overrides: unknown
): T {
	if (!isRecord(overrides)) return defaults;
	const result: Record<string, unknown> = { ...defaults };
	for (const [key, value] of Object.entries(defaults)) {
		if (!Object.hasOwn(overrides, key) || key === "category") continue;
		const override = overrides[key];
		if (key === "filters" && Array.isArray(override)) {
			const category = result.category;
			if (typeof category === "string" && Object.hasOwn(schemas, category)) {
				result[key] = override
					.map((entry, index) => normalizeFilterset(category, index, entry))
					.filter((entry) => entry !== undefined);
			}
		} else if (isRecord(value)) {
			result[key] = applyDefaultFilters(value, override);
		} else if (typeof value === "boolean" && typeof override === "boolean") {
			result[key] = override;
		} else if (
			key === "level" &&
			typeof override === "number" &&
			Number.isInteger(override) &&
			override >= 0 &&
			override <= 30
		) {
			result[key] = override;
		}
	}
	return result as T;
}
