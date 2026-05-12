import type { Player, Song, Track } from './types';

export const SONG_DECK: Song[] = [
	{
		id: 's01',
		num: 1,
		title: 'Bohemian Rhapsody',
		artist: 'Queen',
		year: 1975,
	},
	{
		id: 's02',
		num: 2,
		title: 'Thriller',
		artist: 'Michael Jackson',
		year: 1982,
	},
	{ id: 's03', num: 3, title: 'Imagine', artist: 'John Lennon', year: 1971 },
	{
		id: 's04',
		num: 4,
		title: 'Like a Rolling Stone',
		artist: 'Bob Dylan',
		year: 1965,
	},
	{
		id: 's05',
		num: 5,
		title: 'Rolling in the Deep',
		artist: 'Adele',
		year: 2010,
	},
	{ id: 's06', num: 6, title: 'Hey Jude', artist: 'The Beatles', year: 1968 },
	{ id: 's07', num: 7, title: 'Get Lucky', artist: 'Daft Punk', year: 2013 },
	{
		id: 's08',
		num: 8,
		title: 'Billie Jean',
		artist: 'Michael Jackson',
		year: 1982,
	},
	{
		id: 's09',
		num: 9,
		title: 'Smells Like Teen Spirit',
		artist: 'Nirvana',
		year: 1991,
	},
	{ id: 's10', num: 10, title: 'Yesterday', artist: 'The Beatles', year: 1965 },
	{ id: 's11', num: 11, title: 'Wonderwall', artist: 'Oasis', year: 1995 },
	{
		id: 's12',
		num: 12,
		title: 'Respect',
		artist: 'Aretha Franklin',
		year: 1967,
	},
	{
		id: 's13',
		num: 13,
		title: "Sweet Child O' Mine",
		artist: "Guns N' Roses",
		year: 1988,
	},
	{ id: 's14', num: 14, title: 'Purple Rain', artist: 'Prince', year: 1984 },
	{
		id: 's15',
		num: 15,
		title: 'Under Pressure',
		artist: 'Queen & David Bowie',
		year: 1981,
	},
	{
		id: 's16',
		num: 16,
		title: "Don't Stop Believin'",
		artist: 'Journey',
		year: 1981,
	},
	{
		id: 's17',
		num: 17,
		title: 'Hotel California',
		artist: 'Eagles',
		year: 1977,
	},
	{ id: 's18', num: 18, title: 'Let It Be', artist: 'The Beatles', year: 1970 },
	{
		id: 's19',
		num: 19,
		title: 'Stairway to Heaven',
		artist: 'Led Zeppelin',
		year: 1971,
	},
	{
		id: 's20',
		num: 20,
		title: 'Superstition',
		artist: 'Stevie Wonder',
		year: 1972,
	},
	{
		id: 's21',
		num: 21,
		title: "What's Going On",
		artist: 'Marvin Gaye',
		year: 1971,
	},
	{ id: 's22', num: 22, title: 'Dreams', artist: 'Fleetwood Mac', year: 1977 },
	{
		id: 's23',
		num: 23,
		title: 'Redemption Song',
		artist: 'Bob Marley',
		year: 1980,
	},
	{
		id: 's24',
		num: 24,
		title: 'Blinding Lights',
		artist: 'The Weeknd',
		year: 2019,
	},
	{
		id: 's25',
		num: 25,
		title: 'Someone Like You',
		artist: 'Adele',
		year: 2011,
	},
	{ id: 's26', num: 26, title: 'Piano Man', artist: 'Billy Joel', year: 1973 },
	{
		id: 's27',
		num: 27,
		title: 'Good Vibrations',
		artist: 'The Beach Boys',
		year: 1966,
	},
	{ id: 's28', num: 28, title: 'Crazy in Love', artist: 'Beyoncé', year: 2003 },
	{
		id: 's29',
		num: 29,
		title: 'Losing My Religion',
		artist: 'R.E.M.',
		year: 1991,
	},
	{ id: 's30', num: 30, title: 'Take On Me', artist: 'a-ha', year: 1985 },
];

export function shuffled<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function seededPlayers(): Player[] {
	const deck = shuffled(SONG_DECK);
	return [
		{ id: 'p1', name: 'You', avatar: 'Y', timeline: [deck[0]], tokens: 3 },
		{ id: 'p2', name: 'Marlo', avatar: 'M', timeline: [deck[1]], tokens: 3 },
		{ id: 'p3', name: 'June', avatar: 'J', timeline: [deck[2]], tokens: 3 },
		{ id: 'p4', name: 'Kaz', avatar: 'K', timeline: [deck[3]], tokens: 3 },
	];
}

export function buildDrawPile(players: Player[]): Song[] {
	const used = new Set(players.flatMap((p) => p.timeline.map((s) => s.id)));
	return shuffled(SONG_DECK.filter((s) => !used.has(s.id)));
}

export function trackToSong(track: Track): Song {
	return {
		id: track.id,
		num: track.num,
		title: track.title,
		artist: track.artist,
		year: track.year,
	};
}

export function validatePlacement(timeline: Song[], card: Song, slot: number): boolean {
	const afterPrev = slot === 0 || timeline[slot - 1].year <= card.year;
	const beforeNext = slot === timeline.length || card.year <= timeline[slot].year;
	return afterPrev && beforeNext;
}

export function findCorrectSlot(timeline: Song[], card: Song): number {
	let slot = timeline.length;
	for (let i = 0; i <= timeline.length; i++) {
		const afterPrev = i === 0 || timeline[i - 1].year <= card.year;
		const beforeNext = i === timeline.length || card.year <= timeline[i].year;
		if (afterPrev && beforeNext) {
			slot = i;
			break;
		}
	}
	return slot;
}
