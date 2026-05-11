export interface Entity5 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService5 {
	protected items: Map<string, Entity5> = new Map();

	abstract create(data: Omit<Entity5, "id" | "createdAt" | "updatedAt">): Entity5;

	findById(id: string): Entity5 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity5[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService5 extends BaseService5 {
	create(data: Omit<Entity5, "id" | "createdAt" | "updatedAt">): Entity5 {
		const now = new Date();
		const entity: Entity5 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity5, "id" | "createdAt" | "updatedAt">>): Entity5[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService5 extends BaseService5 {
	private cache = new Map<string, { data: Entity5; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity5, "id" | "createdAt" | "updatedAt">): Entity5 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity5 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
