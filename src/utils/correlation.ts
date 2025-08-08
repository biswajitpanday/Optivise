import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

type CorrelationStore = {
  correlationId: string;
};

const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function runWithCorrelationId<T>(correlationId: string, fn: () => Promise<T> | T): Promise<T> | T {
  return correlationStorage.run({ correlationId }, fn);
}

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

export function generateCorrelationId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}


