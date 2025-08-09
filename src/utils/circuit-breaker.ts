export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // consecutive failures to open
  cooldownMs: number;       // how long to stay open before half-open
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private consecutiveFailures = 0;
  private openUntil = 0;

  constructor(cfg?: Partial<CircuitBreakerConfig>) {
    this.failureThreshold = cfg?.failureThreshold ?? 3;
    this.cooldownMs = cfg?.cooldownMs ?? 30_000;
  }

  state(now = Date.now()): CircuitState {
    if (this.openUntil > now) return 'open';
    if (this.openUntil !== 0 && this.openUntil <= now && this.consecutiveFailures >= this.failureThreshold) return 'half-open';
    return 'closed';
  }

  canAttempt(now = Date.now()): boolean {
    const s = this.state(now);
    return s === 'closed' || s === 'half-open';
  }

  onSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  onFailure(now = Date.now()): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openUntil = now + this.cooldownMs;
    }
  }
}


