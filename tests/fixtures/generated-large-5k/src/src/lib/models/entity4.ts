export interface Entity4 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService4 {
	protected items: Map<string, Entity4> = new Map();

	abstract create(data: Omit<Entity4, "id" | "createdAt" | "updatedAt">): Entity4;

	findById(id: string): Entity4 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity4[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService4 extends BaseService4 {
	create(data: Omit<Entity4, "id" | "createdAt" | "updatedAt">): Entity4 {
		const now = new Date();
		const entity: Entity4 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity4, "id" | "createdAt" | "updatedAt">>): Entity4[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService4 extends BaseService4 {
	private cache = new Map<string, { data: Entity4; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity4, "id" | "createdAt" | "updatedAt">): Entity4 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity4 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
