<script module lang="ts">
	export type PopupActivity = {
		kind: "raid" | "quest" | "invasion" | "kecleon";
		icon: string;
		title: string;
		subtitle?: string;
		expires?: number;
		timerLabel?: string;
		description?: string;
	};
</script>

<script lang="ts">
	import ImagePopup from "./ImagePopup.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	let { activities }: { activities: PopupActivity[] } = $props();
	let single = $derived(activities.length === 1);
</script>

{#if activities.length}
	<div
		class="grid gap-2"
		style:grid-template-columns="repeat({Math.min(activities.length, 3)}, minmax(0, 1fr))"
	>
		{#each activities as activity}
			<div
				class="min-w-0 rounded-lg border border-border border-t-2 bg-accent/60 px-2 py-2.5"
				class:border-t-sky-400={activity.kind === "raid"}
				class:border-t-amber-400={activity.kind === "quest"}
				class:border-t-rose-400={activity.kind === "invasion"}
				class:border-t-emerald-400={activity.kind === "kecleon"}
				class:flex={single}
				class:items-center={single}
				class:gap-3={single}
				class:text-center={!single}
				title={activity.description}
			>
				<div
					class="shrink-0"
					class:size-16={single}
					class:size-12={!single}
					class:mx-auto={!single}
				>
					<ImagePopup src={activity.icon} alt="" class="size-full" />
				</div>
				<div class="min-w-0" class:mt-1={!single}>
					<p
						class="font-semibold leading-snug [overflow-wrap:anywhere]"
						class:text-sm={single}
						class:text-xs={!single}
					>
						{activity.title}
					</p>
					{#if activity.subtitle}<p class="mt-0.5 text-[11px] leading-snug text-muted-foreground">
							{activity.subtitle}
						</p>{/if}
					{#if activity.expires}
						<p
							class="mt-1 flex flex-wrap items-baseline gap-x-1 text-[11px] tabular-nums"
							class:justify-center={!single}
						>
							<span class="text-muted-foreground">{activity.timerLabel}</span>
							<Countdown expireTime={activity.expires} />
						</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
