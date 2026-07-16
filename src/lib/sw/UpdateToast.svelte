<script lang="ts">
	let {
		onrefresh,
		ondismiss,
	}: { onrefresh: () => void; ondismiss: () => void } = $props();
</script>

<div
	role="status"
	class="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-wf-edge bg-wf-panel px-4 py-3 shadow-lg"
	data-update-toast
>
	<span class="text-sm text-slate-200">New version available</span>
	<button
		onclick={onrefresh}
		class="rounded-md border border-wf-cyan/40 bg-wf-cyan/10 px-2.5 py-1 text-xs font-medium text-wf-cyan hover:bg-wf-cyan/20"
	>
		Refresh
	</button>
	<button
		onclick={ondismiss}
		aria-label="Dismiss"
		class="text-sm text-wf-muted hover:text-slate-200"
	>
		✕
	</button>
</div>
