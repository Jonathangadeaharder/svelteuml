export function normalizeFilePath(filePath: string, targetDir?: string): string {
	if (!targetDir) return filePath;
	const normalizedFilePath = filePath.replace(/\\/g, "/");
	const normalizedTargetDir = targetDir.replace(/\\/g, "/");
	const prefix = normalizedTargetDir.endsWith("/")
		? normalizedTargetDir
		: `${normalizedTargetDir}/`;
	if (normalizedFilePath.startsWith(prefix)) return normalizedFilePath.slice(prefix.length);
	return normalizedFilePath;
}
