export interface Entity6 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService6 {
	protected items: Map<string, Entity6> = new Map();

	abstract create(data: Omit<Entity6, "id" | "createdAt" | "updatedAt">): Entity6;

	findById(id: string): Entity6 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity6[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService6 extends BaseService6 {
	create(data: Omit<Entity6, "id" | "createdAt" | "updatedAt">): Entity6 {
		const now = new Date();
		const entity: Entity6 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity6, "id" | "createdAt" | "updatedAt">>): Entity6[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService6 extends BaseService6 {
	private cache = new Map<string, { data: Entity6; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity6, "id" | "createdAt" | "updatedAt">): Entity6 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity6 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
