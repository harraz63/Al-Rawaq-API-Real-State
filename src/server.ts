import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import passport from "passport";

import { config } from "./config/app-config";
import { connectToDatabase } from "./database/connectionToDatabase";
import router from "./routes";

// IMPORTANT:
// Comment passport config temporarily
// import "./config/passport";

dotenv.config();

const app = express();

// Connect DB
connectToDatabase();

// Middlewares
app.use(express.json());

app.use(cookieParser());

app.use(
  cors({
    origin: config.APP_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(morgan("dev"));

app.use(passport.initialize());

// Routes
app.use(config.BASE_PATH, router);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
  });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// IMPORTANT:
// DO NOT use app.listen() on Vercel

export default app;