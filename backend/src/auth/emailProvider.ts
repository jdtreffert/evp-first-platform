export interface EmailProvider {
  sendSignInCode(email: string, code: string): Promise<void>;
}

export class UnconfiguredEmailProvider implements EmailProvider {
  async sendSignInCode(_email: string, _code: string): Promise<void> {
    throw new Error("Email delivery is not configured");
  }
}
