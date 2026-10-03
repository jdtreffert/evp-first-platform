import nodemailer, { Transporter } from "nodemailer";
import { EmailProvider } from "./emailProvider";

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(
    private readonly from: string,
    options: { host: string; port: number; secure: boolean; user?: string; password?: string },
  ) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user && options.password ? { user: options.user, pass: options.password } : undefined,
      requireTLS: !options.secure,
      tls: { minVersion: "TLSv1.2" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async sendSignInCode(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: "Your EVP First sign-in code",
      text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this message.`,
    });
  }
}
