import dotenv from "dotenv";
import path from "path";
import { createApp } from "./app";
import { FileEventRepository } from "./persistence/fileEventRepository";

dotenv.config();

const PORT = process.env.PORT || 3000;
const dataFile = path.resolve(process.env.EVP_DATA_FILE || "data/events.json");

createApp({ repository: new FileEventRepository(dataFile) }).listen(PORT, () => {
  console.log(`Server running EVP Backend on port ${PORT} (event store: ${dataFile})`);
});
