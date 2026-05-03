export function normalizeFilePath(filePath: string, targetDir?: string): string {
	const normalizedFilePath = filePath.replace(/\\/g, "/");
	if (!targetDir) return normalizedFilePath;
	const normalizedTargetDir = targetDir.replace(/\\/g, "/");
	const prefix = normalizedTargetDir.endsWith("/")
		? normalizedTargetDir
		: `${normalizedTargetDir}/`;
	if (normalizedFilePath.startsWith(prefix)) return normalizedFilePath.slice(prefix.length);
	return normalizedFilePath;
}
