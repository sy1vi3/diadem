import cluster from "node:cluster";
import { getServerConfig } from "@/lib/services/config/config.server";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import type { HomepageSighting } from "@/lib/homepage/types";
import { SightingFeed, sightingSchema } from "./sightings";
import { regionAreas } from "./regions";
import type { Area } from "./counts";

const feeds = new Map<
	string,
	{ feed: SightingFeed; areas: Area[]; listeners: Set<(event: HomepageSighting) => void> }
>();
let receiving = 0;
let initialized = false;
export function initHomepageFeed() {
	if (initialized || !getServerConfig().homepage) return;
	initialized = true;
	for (const region of getServerConfig().homepage!.regions) {
		const state = {
			areas: [] as Area[],
			listeners: new Set<(event: HomepageSighting) => void>(),
			feed: undefined as unknown as SightingFeed
		};
		state.feed = new SightingFeed(
			region.sightings,
			() => state.areas,
			(id) => `#${id}`,
			(id) => `https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon/${id}.png`
		);
		feeds.set(region.id, state);
	}
	const timer = setInterval(() => {
		for (const state of feeds.values()) {
			if (!state.listeners.size) continue;
			const event = state.feed.take();
			if (event) for (const listener of state.listeners) listener(event);
		}
	}, 1000);
	timer.unref();
	if (cluster.isWorker)
		process.on("message", (message) => {
			const data = message as { type?: string; events?: unknown[] };
			if (data?.type === "homepage:sightings" && Array.isArray(data.events))
				void receiveSightings(data.events).catch(() =>
					console.warn("Homepage: sighting region lookup failed")
				);
		});
}
async function receiveSightings(events: unknown[]) {
	if (receiving >= 4) return;
	receiving++;
	try {
		await Promise.all(
			(getServerConfig().homepage?.regions ?? []).map(async (region) => {
				const state = feeds.get(region.id)!;
				state.areas = await regionAreas(region.areaIds, true);
				for (const event of events) state.feed.ingest(event);
			})
		);
	} finally {
		receiving--;
	}
}
export async function ingestSightings(events: unknown[]) {
	initHomepageFeed();
	// Only validated Pokémon fields travel between workers, never raw scanner payloads.
	const pokemon = events.flatMap((event) => {
		const envelope = event as { type?: string; message?: unknown } | null;
		if (envelope?.type !== "pokemon") return [];
		const result = sightingSchema.safeParse(envelope.message);
		return result.success ? [result.data] : [];
	});
	if (!pokemon.length) return;
	await receiveSightings(pokemon);
	if (cluster.isWorker && process.connected)
		process.send?.({ type: "homepage:sightings", events: pokemon });
}
export async function subscribeSightings(
	region: string,
	locale: string,
	listener: (event: HomepageSighting) => void
) {
	initHomepageFeed();
	const state = feeds.get(region);
	if (!state || state.listeners.size >= 2000) throw new Error("Feed unavailable");
	const names = await remoteLocaleProvider.getSingle(
		locale as Parameters<typeof remoteLocaleProvider.getSingle>[0]
	);
	const localize = (event: HomepageSighting) =>
		listener({ ...event, name: names?.[`poke_${event.pokemonId}`] ?? event.name });
	state.listeners.add(localize);
	return () => {
		state.listeners.delete(localize);
	};
}
