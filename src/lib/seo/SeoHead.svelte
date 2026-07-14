<script lang="ts">
	import { buildMeta, type MetaInput } from './meta';
	import { SITE_NAME } from './config';

	let {
		title,
		description,
		path,
		image,
		type,
		jsonLd,
	}: MetaInput & { jsonLd?: object | object[] } = $props();

	let meta = $derived(buildMeta({ title, description, path, image, type }));
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={meta.canonical} />

	<meta property="og:type" content={meta.type} />
	<meta property="og:url" content={meta.canonical} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content={meta.image} />
	<meta property="og:site_name" content={SITE_NAME} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={meta.image} />

	{#if jsonLd}
		{@html '<script type="application/ld+json">' +
			JSON.stringify(jsonLd).replace(/</g, '\\u003c') +
			'<\/script>'}
	{/if}
</svelte:head>
