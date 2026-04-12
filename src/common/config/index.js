import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), "src/.env");

dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string(),
  DATABASE_URL: z.string({ required_error: "DATABASE_URL is required" }),
  JWT_SECRET: z.string({ required_error: "JWT_SECRET is required" }).min(10),
  JWT_EXPIRES_IN: z.string({ required_error: "JWT_EXPIRES_IN is required" }),
  RABBITMQ_URL: z.string({ required_error: "RABBITMQ_URL is required" }),
  REDIS_URL: z.string({ required_error: "REDIS_URL is required" }),
  DB_POOL_MAX: z.string({ required_error: "DB_POOL_MAX is required" }),
  DB_POOL_MIN: z.string({ required_error: "DB_POOL_MIN is required" }),
  DB_POOL_ACQUIRE: z.string({ required_error: "DB_POOL_ACQUIRE is required" }),
  DB_POOL_IDLE: z.string({ required_error: "DB_POOL_IDLE is required" }),

  MAIL_FROM: z.string({ required_error: "MAIL_FROM is required" }).email(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  const error = parsed.error.issues.map((issue) => issue.path.join("."));
  const errorMessage = `The following environment variables are not set: ${error.join(", ")}`;
  console.error(errorMessage);
  process.exit(1);
}

const env = parsed.data;

const config = {
  app: {
    port: parseInt(env.PORT, 10),
    env: env.NODE_ENV,
    isDev: env.NODE_ENV === "development",
  },
  db: {
    db_pool_min: parseInt(env.DB_POOL_MIN, 10),
    db_pool_max: parseInt(env.DB_POOL_MAX, 10),
    db_pool_acquire: parseInt(env.DB_POOL_ACQUIRE, 10),
    db_pool_idle: parseInt(env.DB_POOL_IDLE, 10),
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  rabbitmq: {
    url: env.RABBITMQ_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  resend: {
    apiKey: env.RESEND_API_KEY,
    mailFrom: env.MAIL_FROM,
  },
};

export default config;
