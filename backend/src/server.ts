import dotenv from "dotenv";
import path from "path";
import { createApp } from "./app";
import { FileEventRepository } from "./persistence/fileEventRepository";
import { FileAuthRepository } from "./auth/fileAuthRepository";
import { AuthService } from "./auth/authService";
import { SmtpEmailProvider } from "./auth/smtpEmailProvider";
import { UnconfiguredEmailProvider } from "./auth/emailProvider";
import { readSmtpConfiguration } from "./auth/smtpConfig";
import { FileDocumentStore } from "./documents/fileDocumentStore";

dotenv.config();

const PORT = process.env.PORT || 3000;
const dataFile = path.resolve(process.env.EVP_DATA_FILE || "data/events.json");
const documentDirectory = path.resolve(process.env.EVP_DOCUMENT_DIR || "data/documents");
const authFile = path.resolve(process.env.EVP_AUTH_FILE || "data/auth.json");
const sessionSecret = process.env.AUTH_SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("AUTH_SESSION_SECRET is required; configure a random secret of at least 32 characters");
}

const smtpConfiguration = readSmtpConfiguration(process.env);
const emailProvider = smtpConfiguration
  ? new SmtpEmailProvider(smtpConfiguration.from, smtpConfiguration)
  : new UnconfiguredEmailProvider();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const auth = new AuthService({
  repository: new FileAuthRepository(authFile),
  emailProvider,
  sessionSecret,
  bootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
  secureCookies: process.env.NODE_ENV === "production",
});

createApp({ repository: new FileEventRepository(dataFile), auth, documents: new FileDocumentStore(documentDirectory), frontendOrigin }).listen(PORT, () => {
  console.log(`Server running EVP Backend on port ${PORT} (event store: ${dataFile})`);
});
