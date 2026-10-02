import express from "express";
import router from "./routes";

const app = express();
app.use(express.json());
app.use("/api", router);

app.listen(3001, () => {
  console.log("Backend running on port 3001");
});
