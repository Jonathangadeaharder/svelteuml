export interface Entity9 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService9 {
	protected items: Map<string, Entity9> = new Map();

	abstract create(data: Omit<Entity9, "id" | "createdAt" | "updatedAt">): Entity9;

	findById(id: string): Entity9 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity9[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService9 extends BaseService9 {
	create(data: Omit<Entity9, "id" | "createdAt" | "updatedAt">): Entity9 {
		const now = new Date();
		const entity: Entity9 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity9, "id" | "createdAt" | "updatedAt">>): Entity9[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService9 extends BaseService9 {
	private cache = new Map<string, { data: Entity9; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity9, "id" | "createdAt" | "updatedAt">): Entity9 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity9 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
