import "dotenv/config";
export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || "gmail",
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "",
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Quality for Outcomes",
};
