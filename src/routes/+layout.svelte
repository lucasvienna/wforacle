<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { checkForUpdate, reloadOnUpdate } from '$lib/sw/update';

	let { children } = $props();

	onMount(reloadOnUpdate);

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
