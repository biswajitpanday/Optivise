export interface AuditEvent {
  tool: string;
  timestamp: string;
  promptLength?: number;
  products?: string[];
  success: boolean;
}

export class AuditTrailService {
  private enabled = process.env.OPTIVISE_AUDIT === 'true';
  private events: AuditEvent[] = [];

  record(event: AuditEvent): void {
    if (!this.enabled) return;
    this.events.push(event);
    if (this.events.length > 1000) this.events.shift();
  }

  getRecent(): AuditEvent[] {
    return [...this.events].slice(-100);
  }
}

export const auditTrail = new AuditTrailService();


