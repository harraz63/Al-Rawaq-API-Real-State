import mongoose from "mongoose";
import { config } from "../config/app-config";

export const connectToDatabase = async () => {
    try {
        const connection = await mongoose.connect(config.MONGO_URI);
        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log(`Error connecting to MongoDB: ${error.message}`);
        } else {
            console.log("Unknown error while connecting to MongoDB");
        }
    }
};
