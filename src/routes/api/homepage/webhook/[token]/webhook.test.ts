import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./+server";
import { ingestSightings } from "@/lib/server/homepage/live";

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ homepage: { webhookToken: "test-webhook-token-long-enough" } })
}));
vi.mock("@/lib/server/homepage/live", () => ({ ingestSightings: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const token = "test-webhook-token-long-enough";
it("accepts Golbat batches larger than 500 events and 1 MiB", async () => {
	const events = Array.from({ length: 1160 }, (_, i) => ({
		type: "pokemon",
		message: { encounter_id: String(i), extra: "x".repeat(1100) }
	}));
	const body = JSON.stringify(events);
	expect(Buffer.byteLength(body)).toBeGreaterThan(1024 * 1024);
	const response = await POST({
		params: { token },
		request: new Request("http://localhost/webhook", { method: "POST", body })
	} as Parameters<typeof POST>[0]);
	expect(response.status).toBe(202);
	expect(ingestSightings).toHaveBeenCalledWith(events);
});
it("still rejects oversized batches without processing them", async () => {
	const request = new Request("http://localhost/webhook", {
		method: "POST",
		body: JSON.stringify(Array(10001).fill(null))
	});
	await expect(
		POST({ params: { token }, request } as Parameters<typeof POST>[0])
	).rejects.toMatchObject({ status: 400 });
	expect(ingestSightings).not.toHaveBeenCalled();
});
it("still enforces the byte limit", async () => {
	const request = new Request("http://localhost/webhook", {
		method: "POST",
		body: "x".repeat(16 * 1024 * 1024 + 1)
	});
	await expect(
		POST({ params: { token }, request } as Parameters<typeof POST>[0])
	).rejects.toMatchObject({ status: 413 });
	expect(ingestSightings).not.toHaveBeenCalled();
});
