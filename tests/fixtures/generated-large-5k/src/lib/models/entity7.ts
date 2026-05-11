export interface Entity7 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService7 {
	protected items: Map<string, Entity7> = new Map();

	abstract create(data: Omit<Entity7, "id" | "createdAt" | "updatedAt">): Entity7;

	findById(id: string): Entity7 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity7[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService7 extends BaseService7 {
	create(data: Omit<Entity7, "id" | "createdAt" | "updatedAt">): Entity7 {
		const now = new Date();
		const entity: Entity7 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity7, "id" | "createdAt" | "updatedAt">>): Entity7[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService7 extends BaseService7 {
	private cache = new Map<string, { data: Entity7; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity7, "id" | "createdAt" | "updatedAt">): Entity7 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity7 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
