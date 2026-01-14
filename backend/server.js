import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import magicMirrorRouter from "./routes/magicMirror.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 连接 MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB 已连接"))
  .catch((err) => console.error(err));

// 路由
app.use("/api/magic-mirror", magicMirrorRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`后端已运行在端口 ${PORT}`));
