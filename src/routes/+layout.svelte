<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { checkForUpdate, onUpdateAvailable } from '$lib/sw/update';
	import UpdateToast from '$lib/sw/UpdateToast.svelte';

	let { children } = $props();

	let updateAvailable = $state(false);

	onMount(() => onUpdateAvailable(() => (updateAvailable = true)));

	$effect(() => {
		document.addEventListener('visibilitychange', checkForUpdate);
		const interval = setInterval(checkForUpdate, 1000 * 60 * 60 * 2);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', checkForUpdate);
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

{#if updateAvailable}
	<UpdateToast
		onrefresh={() => location.reload()}
		ondismiss={() => (updateAvailable = false)}
	/>
{/if}
