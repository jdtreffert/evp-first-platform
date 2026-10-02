// src/server.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
dotenv.config();

import rootRouter from "./routes";

const app = express();


// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health check ---
app.get("/", (req, res) => {
  res.send("EVP First backend running");
});

// --- API routes ---
app.use("/api", rootRouter);
// --- Error handling middleware (must be last) ---
app.use(errorHandler);
// --- Server start ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running EVP Backend on port ${PORT}`);
});
