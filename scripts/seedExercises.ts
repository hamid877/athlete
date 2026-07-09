import "./loadEnv";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import Exercise from "../models/exercise.model";
import { connectDB } from "../lib/db";

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("Connected to MongoDB.");

    const jsonPath = path.resolve(process.cwd(), "data/exercises.json");
    if (!fs.existsSync(jsonPath)) {
      console.log(`No exercises file found at ${jsonPath}. Exiting.`);
      process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    if (!Array.isArray(data)) {
      console.error("Exercises data must be an array");
      process.exit(1);
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of data) {
      if (!item.slug) {
        console.warn(`Skipping item without slug: ${item.name || "Unknown"}`);
        skippedCount++;
        continue;
      }

      // Check if duplicate
      const existing = await Exercise.findOne({ slug: item.slug });
      if (existing) {
        skippedCount++;
        continue;
      }

      await Exercise.create(item);
      insertedCount++;
    }

    console.log(`Seeding complete.`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped (duplicates/invalid): ${skippedCount}`);
    
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding exercises:", error);
    process.exit(1);
  }
}

seed();
