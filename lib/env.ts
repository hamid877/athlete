function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  get MONGODB_URI() {
    return getEnvVar("MONGODB_URI");
  },
  get AUTH_SECRET() {
    return getEnvVar("AUTH_SECRET");
  },
  get NEXTAUTH_URL() {
    return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  },
} as const;
