#!/usr/bin/env node
import { parseArgs } from "./cli/args.js";
import { loadConfigFile, searchConfigFile } from "./cli/config-loader.js";
import { runPipeline } from "./cli/runner.js";

async function main(): Promise<void> {
	const cliOpts = parseArgs(process.argv);

	const configFile = await searchConfigFile(cliOpts.targetDir);
	const fileConfig = configFile ? await loadConfigFile(configFile.path) : {};

	const result = await runPipeline(cliOpts, fileConfig);

	if (!result.success) {
		process.exitCode = 1;
		if (result.error) {
		}
		return;
	}

	if (cliOpts.watch) {
		const { startWatcher } = await import("./cli/watch.js");
		await startWatcher(cliOpts, fileConfig);
	}
}

main().catch((_err: unknown) => {
	process.exitCode = 2;
});
