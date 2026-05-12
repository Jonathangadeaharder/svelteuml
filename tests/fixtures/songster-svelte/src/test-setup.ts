import '@testing-library/jest-dom/vitest';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { handlers } from './test-mocks/handlers';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
