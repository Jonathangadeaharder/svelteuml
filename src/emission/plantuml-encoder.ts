import { deflateRawSync, inflateRawSync } from "node:zlib";

const PLANTUML_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function toPlantUmlBase64(data: Buffer): string {
	let result = "";
	for (let i = 0; i < data.length; i += 3) {
		const b1 = data[i] ?? 0;
		const b2 = data[i + 1] ?? 0;
		const b3 = data[i + 2] ?? 0;

		const triple = (b1 << 16) | (b2 << 8) | b3;

		result += PLANTUML_ALPHABET[(triple >> 18) & 0x3f];
		result += PLANTUML_ALPHABET[(triple >> 12) & 0x3f];
		result += PLANTUML_ALPHABET[(triple >> 6) & 0x3f];
		result += PLANTUML_ALPHABET[triple & 0x3f];
	}

	const remainder = data.length % 3;
	if (remainder === 1) {
		result = result.slice(0, -2);
	} else if (remainder === 2) {
		result = result.slice(0, -1);
	}

	return result;
}

export function encodePlantUml(source: string): string {
	const utf8 = Buffer.from(source, "utf-8");
	const deflated = deflateRawSync(utf8);
	return toPlantUmlBase64(deflated);
}

function buildAlphabetLookup(): Record<string, number> {
	const lookup: Record<string, number> = {};
	for (let i = 0; i < PLANTUML_ALPHABET.length; i++) {
		lookup[PLANTUML_ALPHABET[i] as string] = i;
	}
	return lookup;
}

const ALPHABET_LOOKUP = buildAlphabetLookup();

export function decodePlantUml(encoded: string): string {
	const bytes: number[] = [];
	for (let i = 0; i < encoded.length; i += 4) {
		const remaining = encoded.length - i;
		const chunk = encoded.slice(i, i + 4);

		const c1 = ALPHABET_LOOKUP[chunk[0] ?? ""] ?? 0;
		const c2 = ALPHABET_LOOKUP[chunk[1] ?? ""] ?? 0;
		const c3 = ALPHABET_LOOKUP[chunk[2] ?? ""] ?? 0;
		const c4 = ALPHABET_LOOKUP[chunk[3] ?? ""] ?? 0;

		const triple = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;

		bytes.push((triple >> 16) & 0xff);
		if (remaining >= 3) bytes.push((triple >> 8) & 0xff);
		if (remaining >= 4) bytes.push(triple & 0xff);
	}

	const deflated = Buffer.from(bytes);
	return inflateRawSync(deflated).toString("utf-8");
}
