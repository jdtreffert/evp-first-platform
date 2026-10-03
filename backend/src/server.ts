import dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config();

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`Server running EVP Backend on port ${PORT}`);
});
