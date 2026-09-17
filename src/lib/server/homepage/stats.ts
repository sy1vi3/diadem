import { getServerConfig } from "@/lib/services/config/config.server";
import { query } from "@/lib/server/db/external/internalQuery";
import { emptyHomepageStats, type HomepageStats } from "@/lib/homepage/types";
import { regionalCountQuery, countRegionalRows } from "./counts";
import { regionAreas } from "./regions";
import { CountCache } from "./cache";
import { getMultiplePokemon } from "@/lib/server/api/golbat/http";
const cache = new CountCache();
export async function homepageStats(id: string): Promise<HomepageStats> {
	const region = getServerConfig().homepage?.regions.find((r) => r.id === id);
	if (!region) return emptyHomepageStats();
	const result = emptyHomepageStats();
	await Promise.all(
		(
			[
				["pokemon", "pokemon"],
				["pokestops", "pokestop"],
				["gyms", "gym"]
			] as const
		).map(async ([key, table]) => {
			const ttl =
				(key === "pokemon" ? region.pokemonRefreshSeconds : region.fortRefreshSeconds) * 1000;
			result[key] = await cache.get(
				key === "pokemon" ? "pokemon" : `${id}:${key}`,
				ttl,
				region.maxStaleSeconds * 1000,
				async () => {
					if (key === "pokemon") {
						const response = await getMultiplePokemon({
							min: { latitude: 0, longitude: 0 },
							max: { latitude: 0, longitude: 0 },
							limit: 1,
							filters: [{ pokemon: [] }]
						});
						if (!response || !Number.isFinite(response.total))
							throw new Error("Live Pokémon count unavailable");
						return response.total;
					}
					const areas = await regionAreas(region.areaIds);
					const statement = regionalCountQuery(table, areas);
					const rows = await query<{ lat: number; lon: number }[]>(statement.sql, statement.values);
					return countRegionalRows(rows, areas);
				}
			);
		})
	);
	return result;
}
