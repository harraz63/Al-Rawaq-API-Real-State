import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { config } from "./config/app-config";
import { connectToDatabase } from "./database/connectionToDatabase";
import router from "./routes";
import cors from "cors";
import morgan from "morgan";
import "./config/passport";
import passport from "passport";
import cookieParser from "cookie-parser";
import { errorResponse } from "./utils/api-response";
import { notFoundHandler } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app = express();

let isConnected = false;
const ensureDbConnected = async () => {
  if (!isConnected) {
    await connectToDatabase();
    isConnected = true;
  }
};

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: config.APP_ORIGIN,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(passport.initialize());

app.use(async (req, res, next) => {
  try {
    await ensureDbConnected();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    errorResponse(res, 500, "Database connection failed", null);
  }
});

app.use(config.BASE_PATH, router);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== "production") {
  app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
}

export default app;