export type Theme = 'light' | 'dark';
export type ArtStyle = 'grooves' | 'halftone' | 'solid' | 'inverse';
export type FlipStyle = 'flip' | 'slide' | 'fade' | 'instant';
export type Density = 'compact' | 'regular' | 'comfy';

export interface Song {
	id: string;
	num: number;
	title: string;
	artist: string;
	year: number;
}

export interface Track extends Song {
	deezer_id: number;
	preview_url: string;
	cover_small: string | null;
	cover_medium: string | null;
	duration: number;
}

export interface DeezerTrackData {
	id: number;
	title: string;
	artist?: { name: string };
	album?: { cover_small?: string; cover_medium?: string; title?: string };
	preview?: string;
	duration?: number;
	release_date?: string;
}

export interface MusicProvider {
	search(query: string, limit?: number): Promise<Track[]>;
	getTrack(deezerId: number): Promise<Track | null>;
}

export interface Player {
	id: string;
	name: string;
	avatar: string;
	timeline: Song[];
	tokens: number;
}

export type Phase = 'draw' | 'listen' | 'place' | 'reveal' | 'challenge';
export type Screen = 'lobby' | 'play' | 'win';

export interface GameState {
	screen: Screen;
	round: number;
	players: Player[];
	drawPile: Song[];
	activeCard: Song | null;
	activePlayerId: string;
	phase: Phase;
	hoverSlot: number | null;
	placedSlot: number | null;
	placedResult: boolean | null;
	interceptor: string | null;
	winner: Player | null;
	dragging: boolean;
}

export interface Tweaks {
	theme: Theme;
	artStyle: ArtStyle;
	flipStyle: FlipStyle;
	density: Density;
	animIntensity: number;
	interceptionEnabled: boolean;
}
