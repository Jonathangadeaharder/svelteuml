export interface PipelineError {
	file: string;
	phase: "discovery" | "parsing" | "extraction" | "resolution";
	message: string;
	stack?: string;
}

export class PipelineErrorHandler {
	private errors: PipelineError[] = [];
	private readonly verbose: boolean;

	constructor(verbose = false) {
		this.verbose = verbose;
	}

	addError(error: PipelineError): void {
		this.errors.push(error);
	}

	getErrors(): PipelineError[] {
		return [...this.errors];
	}

	getFailedFiles(): string[] {
		return [...new Set(this.errors.map((e) => e.file))];
	}

	getErrorsForPhase(phase: PipelineError["phase"]): PipelineError[] {
		return this.errors.filter((e) => e.phase === phase);
	}

	getSummary(): string {
		if (this.errors.length === 0) return "";

		const phaseCounts = new Map<string, number>();
		for (const e of this.errors) {
			phaseCounts.set(e.phase, (phaseCounts.get(e.phase) ?? 0) + 1);
		}

		const lines: string[] = [];
		lines.push(`${this.errors.length} error(s) during pipeline:`);

		for (const [phase, count] of phaseCounts) {
			lines.push(`  ${phase}: ${count}`);
		}

		lines.push("");
		for (const e of this.errors) {
			lines.push(`  ${e.file}: ${e.message}`);
			if (this.verbose && e.stack) {
				for (const line of e.stack.split("\n")) {
					lines.push(`    ${line}`);
				}
			}
		}

		return lines.join("\n");
	}
}
