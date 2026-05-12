import dotenv from "dotenv";
dotenv.config();
import express from "express"
import { config } from "./config/app-config"
import { connectToDatabase } from "./database/connectionToDatabase"
import router from "./routes"
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import "./config/passport"; // 
import passport from "passport";
import cookieParser from "cookie-parser";



const app = express()

app.use(passport.initialize());

app.use(cookieParser());

app.use(express.json())
app.use(
    cors(
        {
            origin: config.APP_ORIGIN,
            methods: ["GET", "POST", "DELETE", "PUT"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        }
    )
);
app.use(morgan("dev"));

app.use(
    session({
        secret: "secret123",
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session()); // لو هتستخدم sessions

app.use(config.BASE_PATH, router)

connectToDatabase()

if (process.env.NODE_ENV !== 'production') {
    app.listen(config.PORT, () => {
        console.log(`Server is running on port ${config.PORT}`);
    });
}

export default app;