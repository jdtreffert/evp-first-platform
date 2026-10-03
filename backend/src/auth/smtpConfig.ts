export interface SmtpConfiguration {
  host: string;
  from: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

export function readSmtpConfiguration(env: NodeJS.ProcessEnv): SmtpConfiguration | undefined {
  const host = env.SMTP_HOST?.trim() || "";
  const from = env.SMTP_FROM?.trim() || "";
  const user = env.SMTP_USER?.trim() || "";
  const password = env.SMTP_PASSWORD || "";

  if (Boolean(host) !== Boolean(from)) {
    throw new Error("Configure SMTP_HOST and SMTP_FROM together");
  }
  if (Boolean(user) !== Boolean(password)) {
    throw new Error("Configure SMTP_USER and SMTP_PASSWORD together");
  }
  if ((user || password) && !host) {
    throw new Error("SMTP credentials require SMTP_HOST and SMTP_FROM");
  }

  const rawPort = env.SMTP_PORT?.trim();
  const port = rawPort ? Number(rawPort) : 587;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");
  }

  const rawSecure = env.SMTP_SECURE?.trim().toLowerCase();
  if (rawSecure !== undefined && rawSecure !== "" && rawSecure !== "true" && rawSecure !== "false") {
    throw new Error("SMTP_SECURE must be either true or false");
  }

  if (!host) return undefined;

  const configuration: SmtpConfiguration = {
    host,
    from,
    port,
    secure: rawSecure ? rawSecure === "true" : port === 465,
  };
  if (user) configuration.user = user;
  if (password) configuration.password = password;
  return configuration;
}
