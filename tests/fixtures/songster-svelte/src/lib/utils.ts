import type { Theme } from './types';

export function colors(theme: Theme) {
	const isDark = theme === 'dark';
	return {
		primary: isDark ? '#f4efe4' : '#0a0a0a',
		paper: isDark ? '#0a0a0a' : '#f4efe4',
		muted: isDark ? 'rgba(244,239,228,0.4)' : 'rgba(10,10,10,0.4)',
	};
}
