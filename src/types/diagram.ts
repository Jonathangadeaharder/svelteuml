export type DiagramKind = "class" | "package";

export interface DiagramOptions {
	kind: DiagramKind;
	showMembers: boolean;
	showMethods: boolean;
	showVisibility: boolean;
	showStores: boolean;
	showProps: boolean;
	hideEmptyPackages: boolean;
	title?: string;
}

export const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
	kind: "class",
	showMembers: true,
	showMethods: true,
	showVisibility: true,
	showStores: true,
	showProps: true,
	hideEmptyPackages: false,
};
