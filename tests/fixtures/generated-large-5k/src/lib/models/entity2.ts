export interface Entity2 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService2 {
	protected items: Map<string, Entity2> = new Map();

	abstract create(data: Omit<Entity2, "id" | "createdAt" | "updatedAt">): Entity2;

	findById(id: string): Entity2 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity2[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService2 extends BaseService2 {
	create(data: Omit<Entity2, "id" | "createdAt" | "updatedAt">): Entity2 {
		const now = new Date();
		const entity: Entity2 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity2, "id" | "createdAt" | "updatedAt">>): Entity2[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService2 extends BaseService2 {
	private cache = new Map<string, { data: Entity2; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity2, "id" | "createdAt" | "updatedAt">): Entity2 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity2 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
