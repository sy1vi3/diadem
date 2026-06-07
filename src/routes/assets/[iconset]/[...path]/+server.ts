import { ALLOWED_FORMATS, ALLOWED_WIDTHS } from "@/lib/services/assets";
import { getClientConfig } from "@/lib/services/config/config.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import sharp from "sharp";

const log = getLogger("uicons");

export async function GET({ params, fetch, url }) {
	const start = performance.now();
	const config = getClientConfig();

	const width = url.searchParams.get("w");
	const trim = url.searchParams.get("trim") === "1";
	const normalize = url.searchParams.get("normalize") === "1";
	const formatParam = url.searchParams.get("format");
	const iconSetId = params.iconset;
	const iconPath = params.path;

	if (width && !ALLOWED_WIDTHS.includes(width)) {
		error(401, "Invalid width");
	}

	let format: (typeof ALLOWED_FORMATS)[number] = "webp";
	if (formatParam && ALLOWED_FORMATS.includes(formatParam as (typeof ALLOWED_FORMATS)[number])) {
		format = formatParam as (typeof ALLOWED_FORMATS)[number];
	}

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	const iconUrl = iconSet.url + "/" + iconPath;

	try {
		const res = await fetch(iconUrl);
		if (!res.ok) {
			error(500, "Fetching image failed");
		}
		const fetchDone = performance.now();

		const inputBuf = Buffer.from(await res.arrayBuffer());
		let outBuf: Buffer;

		if (normalize) {
			const OUT = width ? Number(width) : 64; // square output size
			const STRENGTH = 0.85; // 1 = identical sizes, 0 = no change. High = near-uniform.
			const BASE_FILL = 0.95; // fraction of OUT the content's long side targets at the reference size
			const REF_FILL = 0.8; // assumed content fill of a "typical" source icon (long side / canvas)
			const F_MIN = 0.5;
			const F_MAX = 1.0;

			const meta = await sharp(inputBuf).metadata();
			const originalLongest = Math.max(meta.width ?? OUT, meta.height ?? OUT);

			const trimmed = await sharp(inputBuf)
				.ensureAlpha()
				.trim({ threshold: 10 })
				.toBuffer({ resolveWithObject: true });
			const contentLongest = Math.max(trimmed.info.width, trimmed.info.height) || originalLongest;

			const ratio = contentLongest / (REF_FILL * originalLongest);
			let f = BASE_FILL * Math.pow(ratio, 1 - STRENGTH);
			f = Math.min(F_MAX, Math.max(F_MIN, f));
			const target = Math.max(1, Math.round(OUT * f));

			const content = await sharp(trimmed.data)
				.resize({ width: target, height: target, fit: "inside", withoutEnlargement: false })
				.toBuffer();

			let canvas = sharp({
				create: {
					width: OUT,
					height: OUT,
					channels: 4,
					background: { r: 0, g: 0, b: 0, alpha: 0 }
				}
			}).composite([{ input: content, gravity: "center" }]);
			canvas = format === "png" ? canvas.png() : canvas.webp();
			outBuf = await canvas.toBuffer();
		} else {
			let sharpImage = sharp(inputBuf);
			if (trim) {
				// Crop away the fully-transparent border so the icon's actual content fills the frame.
				sharpImage = sharpImage.ensureAlpha().trim({ threshold: 10 });
			}
			if (width) {
				sharpImage = sharpImage.resize({
					width: Number(width),
					withoutEnlargement: false
				});
			}

			if (format === "webp") {
				sharpImage = sharpImage.webp();
			} else if (format === "png") {
				sharpImage = sharpImage.png();
			}

			outBuf = await sharpImage.toBuffer();
		}

		log.info(
			"[%s] Serving icon %s (width=%s, normalize=%s) / fetch: %fms + optimizing: %fms",
			iconSetId,
			iconPath,
			width ?? "oiginal",
			normalize,
			(fetchDone - start).toFixed(),
			(performance.now() - fetchDone).toFixed(1)
		);

		return new Response(new Uint8Array(outBuf), {
			headers: {
				...cacheHttpHeaders(),
				"Content-Type": "image/" + format
			}
		});
	} catch (err) {
		log.error(
			"[%s] Processing uicon %s (width=%s) failed: %s",
			iconSetId,
			iconPath,
			width ?? "original",
			err
		);
		return new Response("error processing image", { status: 500 });
	}
}
