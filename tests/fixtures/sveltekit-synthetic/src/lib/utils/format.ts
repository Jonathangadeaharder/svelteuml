export function formatDate(date: Date): string {
	return date.toISOString().split("T")[0] ?? "";
}

export function slugify(text: string): string {
	return text.toLowerCase().replace(/\s+/g, "-");
}

export function truncate(text: string, length: number): string {
	if (text.length <= length) return text;
	return `${text.slice(0, length)}...`;
}
