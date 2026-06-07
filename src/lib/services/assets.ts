export const ALLOWED_WIDTHS = ["64", "128"];
export const ALLOWED_FORMATS: ("webp" | "png")[] = ["webp", "png"];

type ResizeOptions = {
	width?: number;
	trim?: boolean;
	normalize?: boolean;
};

export function resize(url: string, options?: ResizeOptions) {
	const params: string[] = [];
	if (options?.width) params.push(`w=${options.width}`);
	if (options?.trim) params.push("trim=1");
	if (options?.normalize) params.push("normalize=1");

	return params.length ? `${url}?${params.join("&")}` : url;
}
