export interface Entity3 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService3 {
	protected items: Map<string, Entity3> = new Map();

	abstract create(data: Omit<Entity3, "id" | "createdAt" | "updatedAt">): Entity3;

	findById(id: string): Entity3 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity3[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService3 extends BaseService3 {
	create(data: Omit<Entity3, "id" | "createdAt" | "updatedAt">): Entity3 {
		const now = new Date();
		const entity: Entity3 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity3, "id" | "createdAt" | "updatedAt">>): Entity3[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService3 extends BaseService3 {
	private cache = new Map<string, { data: Entity3; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity3, "id" | "createdAt" | "updatedAt">): Entity3 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity3 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
