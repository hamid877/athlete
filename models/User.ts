import mongoose, { Schema, type Model } from "mongoose";
import type { UserDocument } from "@/types";

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    image: { type: String },
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      default: null,
    },
    heightCm: { type: Number, default: 0 },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active"],
      default: "moderate",
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    unitPreference: {
      type: String,
      enum: ["metric", "imperial"],
      default: "metric",
    },
    onboardingCompleted: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    age: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    fitnessGoal: { type: String, default: null },
    yearsOfLifting: { type: Number, default: null },
    workoutDaysPerWeek: { type: Number, default: null },
    workoutLocation: { type: String, enum: ["gym", "home"], default: null },
    injuries: { type: String, default: null },
    medicalConditions: { type: String, default: null },
    nutritionTargets: {
      calories: { type: Number, default: null },
      protein: { type: Number, default: null },
      carbs: { type: Number, default: null },
      fat: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

userSchema.index({ email: 1 }, { unique: true });

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);

export default User;
