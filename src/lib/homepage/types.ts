export type HomepageMetric = {
	value: number | null;
	updatedAt: string | null;
	stale: boolean;
	validUntil?: number;
};
export type HomepageStats = {
	pokemon: HomepageMetric;
	pokestops: HomepageMetric;
	gyms: HomepageMetric;
};
export type HomepageSighting = {
	id: string;
	pokemonId: number;
	form: number;
	name: string;
	icon: string;
	iv: number | null;
	ivs: [number, number, number] | null;
	gender: number | null;
	mapsUrl: string;
	area: string;
	expiresAt: number;
};
export function emptyHomepageStats(): HomepageStats {
	return {
		pokemon: { value: null, updatedAt: null, stale: false },
		pokestops: { value: null, updatedAt: null, stale: false },
		gyms: { value: null, updatedAt: null, stale: false }
	};
}
