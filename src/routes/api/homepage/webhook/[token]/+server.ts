import { timingSafeEqual } from "node:crypto";
import { error } from "@sveltejs/kit";
import { getServerConfig } from "@/lib/services/config/config.server";
import { ingestSightings } from "@/lib/server/homepage/live";
let active = 0;
export async function POST({ params, request }) {
	const secret = getServerConfig().homepage?.webhookToken;
	const token = Buffer.from(params.token);
	if (
		!secret ||
		token.length !== Buffer.byteLength(secret) ||
		!timingSafeEqual(token, Buffer.from(secret))
	)
		error(404);
	if (active >= 4) error(429);
	active++;
	try {
		const reader = request.body?.getReader();
		if (!reader) error(400);
		const chunks: Uint8Array[] = [];
		let size = 0;
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > 16 * 1024 * 1024) {
					await reader.cancel();
					error(413);
				}
				chunks.push(value);
			}
		} finally {
			reader.releaseLock();
		}
		let events: unknown;
		try {
			events = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		} catch {
			error(400);
		}
		if (!Array.isArray(events) || events.length > 10000) error(400);
		await ingestSightings(events);
		return new Response(null, { status: 202 });
	} finally {
		active--;
	}
}
