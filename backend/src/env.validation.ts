import { z } from "zod";


const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://", "DATABASE_URL must be a PostgreSQL connection string"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^(\d+)(s|m|h|d)$/, "JWT_EXPIRES_IN must be like 30m, 24h, 7d"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().regex(/^(\d+)(s|m|h|d)$/, "REFRESH_TOKEN_EXPIRES_IN must be like 7d, 30d").default("7d"),
  CORS_ORIGIN: z.url('CORS_ORIGIN must be a valid URL').min(1, 'CORS_ORIGIN cannot be empty').default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  UPLOAD_DEST: z.string().min(1, "UPLOAD_DEST is required"),
  MAX_FILE_SIZE: z.coerce.number().int().positive().max(50 * 1024 * 1024, "MAX_FILE_SIZE too large (max 50MB)"),
  
  // Appwrite Configuration
  APPWRITE_API_KEY: z.string().min(20, "APPWRITE_API_KEY is required"),
  APPWRITE_PROJECT_ID: z.string().min(5, "APPWRITE_PROJECT_ID is required"),
  APPWRITE_BUCKET_ID: z.string().min(5, "APPWRITE_BUCKET_ID is required"),
  APPWRITE_ENDPOINT: z.url("APPWRITE_ENDPOINT must be a valid URL"),

  // Firebase Configuration (for push notifications)
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z.string().min(100, "FIREBASE_PRIVATE_KEY is required (from service account JSON)"),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    console.error("\n❌ \x1b[31mEnvironment validation failed\x1b[0m\n");

    parsed.error.issues.forEach((issue) => {
      console.error(
        `❌ \x1b[31m${issue.path.join(".")}: ${issue.message}\x1b[0m`
      );
    });

    console.error(
      "\n☠️  \x1b[31mProcess terminated due to invalid environment variables\x1b[0m\n"
    );

    process.exit(1); // 🔥 hard kill
  }

  return parsed.data;
}

export const env = validateEnv(process.env);

export type Env = z.infer<typeof envSchema>;