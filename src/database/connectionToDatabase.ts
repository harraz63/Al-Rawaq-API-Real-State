import mongoose from "mongoose";
import { config } from "../config/app-config";

export const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log("Using existing MongoDB connection");
      return;
    }

    const connection = await mongoose.connect(config.MONGO_URI);

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);

    throw error;
  }
};