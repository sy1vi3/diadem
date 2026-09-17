import { error } from "@sveltejs/kit";
import { getClientConfig, getSiteOrigin } from "@/lib/services/config/config.server";
import { subscribeSightings } from "@/lib/server/homepage/live";
export async function GET({ url, request }) {
	const client = getClientConfig();
	const region = client.homepage?.regionId;
	if (
		(!getSiteOrigin() && client.general.url !== url.origin) ||
		!region ||
		!client.homepage?.liveSightings
	)
		error(404);
	const origin = request.headers.get("origin");
	if (origin && origin !== url.origin) error(403);
	const encoder = new TextEncoder();
	let cleanup = () => {};
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			let closed = false;
			let unsubscribe: (() => void) | undefined;
			let heartbeat: ReturnType<typeof setInterval> | undefined;
			cleanup = () => {
				if (closed) return;
				closed = true;
				unsubscribe?.();
				clearInterval(heartbeat);
				request.signal.removeEventListener("abort", cleanup);
				try {
					controller.close();
				} catch {
					/* Already cancelled. */
				}
			};
			request.signal.addEventListener("abort", cleanup, { once: true });
			if (request.signal.aborted) {
				cleanup();
				return;
			}
			const send = (text: string) => {
				if (closed) return;
				if ((controller.desiredSize ?? 0) < 0) {
					cleanup();
					return;
				}
				controller.enqueue(encoder.encode(text));
			};
			try {
				unsubscribe = await subscribeSightings(
					region,
					client.general.defaultLocale || "en",
					(event) => send(`data: ${JSON.stringify(event)}\n\n`)
				);
				if (closed) {
					unsubscribe();
					return;
				}
				send(": connected\n\n");
				heartbeat = setInterval(() => send(": heartbeat\n\n"), 15000);
			} catch {
				cleanup();
			}
		},
		cancel() {
			cleanup();
		}
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-store",
			"X-Accel-Buffering": "no"
		}
	});
}
