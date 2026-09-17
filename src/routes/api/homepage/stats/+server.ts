import { json } from "@sveltejs/kit";
import { getClientConfig, getSiteOrigin } from "@/lib/services/config/config.server";
import { emptyHomepageStats } from "@/lib/homepage/types";
import { homepageStats } from "@/lib/server/homepage/stats";
export async function GET({ url }) {
	const client = getClientConfig();
	const region = client.homepage?.regionId;
	if ((!getSiteOrigin() && client.general.url !== url.origin) || !region)
		return json(emptyHomepageStats(), { headers: { "Cache-Control": "no-store" } });
	return json(await homepageStats(region), { headers: { "Cache-Control": "public, max-age=30" } });
}
