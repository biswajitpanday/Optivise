export interface SecretProvider {
  get(name: string): string | undefined | Promise<string | undefined>;
}

class EnvSecretProvider implements SecretProvider {
  get(name: string): string | undefined {
    return process.env[name];
  }
}

export class SecretStore {
  private providers: SecretProvider[] = [];

  constructor() {
    // Default to env provider
    this.providers.push(new EnvSecretProvider());
  }

  addProvider(provider: SecretProvider): void {
    this.providers.unshift(provider);
  }

  async get(name: string): Promise<string | undefined> {
    for (const p of this.providers) {
      const value = await p.get(name);
      if (value) return value;
    }
    return undefined;
  }
}

export const secretStore = new SecretStore();


