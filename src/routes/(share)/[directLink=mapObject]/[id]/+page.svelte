<script lang="ts">
	import { browser } from "$app/environment";
	import type { PageProps } from "./$types";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { m } from "@/lib/paraglide/messages";
	import { useMetadata } from "@/lib/ui/metadata.svelte";

	let { data }: PageProps = $props();
	useMetadata(() =>
		!browser && data && data.title
			? {
					title: data.title,
					image: getConfig().general.url + `/${data.type}/${data.id}/thumbnail.png`
				}
			: {}
	);
</script>

<RedirectFlash goal={data.title ?? m["pogo_" + data.type]()} />
