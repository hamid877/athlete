import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local before any other code executes
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
