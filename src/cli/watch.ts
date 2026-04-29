import type { CliOptions } from "./args.js";

export async function startWatcher(
	_cliOpts: CliOptions,
	_fileConfig: Record<string, unknown>,
): Promise<void> {
	throw new Error("Watch mode is not yet implemented");
}
