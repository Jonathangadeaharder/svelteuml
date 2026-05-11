export interface Entity1 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService1 {
	protected items: Map<string, Entity1> = new Map();

	abstract create(data: Omit<Entity1, "id" | "createdAt" | "updatedAt">): Entity1;

	findById(id: string): Entity1 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity1[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService1 extends BaseService1 {
	create(data: Omit<Entity1, "id" | "createdAt" | "updatedAt">): Entity1 {
		const now = new Date();
		const entity: Entity1 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity1, "id" | "createdAt" | "updatedAt">>): Entity1[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService1 extends BaseService1 {
	private cache = new Map<string, { data: Entity1; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity1, "id" | "createdAt" | "updatedAt">): Entity1 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity1 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
