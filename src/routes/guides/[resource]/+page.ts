import type { Component } from 'svelte';
import type { PageLoad } from './$types';

// Everything data-shaped comes from +page.server.ts. This thin universal load
// exists only for the mdsvex guide body: a Svelte component cannot cross the
// server→client serialisation boundary, so it has to be resolved here.
// Component modules are code, not fetched data, so they create no replay blob.
export const load: PageLoad = async ({ data, params }) => {
	// Dynamically import the matching long-form guide if one has been
	// written; most resources only get the structured recommendations
	// below, and get `guide: null` here.
	const guides = import.meta.glob('/src/content/guides/*.svx');
	const key = `/src/content/guides/${params.resource}.svx`;
	const guide = key in guides ? ((await guides[key]()) as { default: Component }).default : null;

	return { ...data, guide };
};
