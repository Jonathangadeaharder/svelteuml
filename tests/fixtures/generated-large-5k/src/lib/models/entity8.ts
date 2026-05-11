export interface Entity8 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService8 {
	protected items: Map<string, Entity8> = new Map();

	abstract create(data: Omit<Entity8, "id" | "createdAt" | "updatedAt">): Entity8;

	findById(id: string): Entity8 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity8[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService8 extends BaseService8 {
	create(data: Omit<Entity8, "id" | "createdAt" | "updatedAt">): Entity8 {
		const now = new Date();
		const entity: Entity8 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity8, "id" | "createdAt" | "updatedAt">>): Entity8[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService8 extends BaseService8 {
	private cache = new Map<string, { data: Entity8; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity8, "id" | "createdAt" | "updatedAt">): Entity8 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity8 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
