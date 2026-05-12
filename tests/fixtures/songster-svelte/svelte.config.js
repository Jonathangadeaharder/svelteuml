import adapter from "@sveltejs/kit/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
	},
};

export default config;
