<script lang="ts">
	import Countdown from "@/components/utils/Countdown.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { Clock } from "@lucide/svelte";

	let {
		expire,
		showSeconds = true,
		showDate = false,
		showIcon = true
	}: {
		expire?: number;
		showSeconds?: boolean;
		showDate?: boolean;
		showIcon?: boolean;
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums">
	{#if showIcon}<Clock class="size-4 text-muted-foreground" />{/if}
	<span class="font-medium"><Countdown expireTime={expire} /></span>
	<span class="text-muted-foreground"
		>{timestampToLocalTime(expire, { showSeconds, showDate, dayLowerCase: false })}</span
	>
</div>
