import { readSmtpConfiguration } from "../smtpConfig";

describe("readSmtpConfiguration", () => {
  test("leaves email delivery unconfigured when SMTP host and sender are absent", () => {
    expect(readSmtpConfiguration({})).toBeUndefined();
  });

  test("uses authenticated STARTTLS with standard submission defaults", () => {
    expect(readSmtpConfiguration({
      SMTP_HOST: " smtp.example.test ",
      SMTP_FROM: "EVP First <codes@example.test>",
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "secret",
    })).toEqual({
      host: "smtp.example.test",
      from: "EVP First <codes@example.test>",
      port: 587,
      secure: false,
      user: "mailer",
      password: "secret",
    });
  });

  test("defaults port 465 to implicit TLS", () => {
    expect(readSmtpConfiguration({
      SMTP_HOST: "smtp.example.test",
      SMTP_FROM: "codes@example.test",
      SMTP_PORT: "465",
    })?.secure).toBe(true);
  });

  test("rejects incomplete SMTP endpoint configuration", () => {
    expect(() => readSmtpConfiguration({ SMTP_HOST: "smtp.example.test" }))
      .toThrow("Configure SMTP_HOST and SMTP_FROM together");
  });

  test("rejects unpaired SMTP credentials", () => {
    expect(() => readSmtpConfiguration({
      SMTP_HOST: "smtp.example.test",
      SMTP_FROM: "codes@example.test",
      SMTP_USER: "mailer",
    })).toThrow("Configure SMTP_USER and SMTP_PASSWORD together");
  });

  test("rejects invalid port and TLS values", () => {
    expect(() => readSmtpConfiguration({
      SMTP_HOST: "smtp.example.test",
      SMTP_FROM: "codes@example.test",
      SMTP_PORT: "70000",
    })).toThrow("SMTP_PORT must be an integer between 1 and 65535");

    expect(() => readSmtpConfiguration({
      SMTP_HOST: "smtp.example.test",
      SMTP_FROM: "codes@example.test",
      SMTP_SECURE: "yes",
    })).toThrow("SMTP_SECURE must be either true or false");
  });
});
