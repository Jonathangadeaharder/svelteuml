export interface Entity10 {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService10 {
	protected items: Map<string, Entity10> = new Map();

	abstract create(data: Omit<Entity10, "id" | "createdAt" | "updatedAt">): Entity10;

	findById(id: string): Entity10 | undefined {
		return this.items.get(id);
	}

	findAll(): Entity10[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService10 extends BaseService10 {
	create(data: Omit<Entity10, "id" | "createdAt" | "updatedAt">): Entity10 {
		const now = new Date();
		const entity: Entity10 = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity10, "id" | "createdAt" | "updatedAt">>): Entity10[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService10 extends BaseService10 {
	private cache = new Map<string, { data: Entity10; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity10, "id" | "createdAt" | "updatedAt">): Entity10 {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity10 | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
