import { getEnv } from "../utils/get-env";

const appConfig = () => ({
    NODE_ENV: getEnv("NODE_ENV", "development"),
    APP_ORIGIN: getEnv("APP_ORIGIN"),
    PORT: getEnv("PORT", "5000"),
    BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
    MONGO_URI: getEnv ("MONGO_URI" , process.env.MONGO_URI),
    SMTP_USER: getEnv ("SMTP_USER" , process.env.SMTP_USER),
    SMTP_PASS: getEnv ("SMTP_PASS" , process.env.SMTP_PASS),
    SMTP_HOST: getEnv ("SMTP_HOST" , process.env.SMTP_HOST),
    SMTP_PORT: getEnv ("SMTP_PORT" , process.env.SMTP_PORT),
    FROM_EMAIL: getEnv ("FROM_EMAIL" , process.env.FROM_EMAIL),
    SEND_GRID_API: getEnv ("SEND_GRID_API" , process.env.SEND_GRID_API),
    ARCJET_KEY: getEnv ("ARCJET_KEY" , process.env.ARCJET_KEY),
    ARCJET_ENV: getEnv ("ARCJET_ENV" , process.env.ARCJET_ENV),
    JWT: {
        SECRET: getEnv("JWT_SECRET"),
        EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
        REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
        REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
    },
    // MAILER_SENDER: getEnv("MAILER_SENDER"),
    // RESEND_API_KEY: getEnv("RESEND_API_KEY"),
});

export const config = appConfig(); 