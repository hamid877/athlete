import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NutritionClient from "./NutritionClient";

export const metadata = {
  title: "Nutrition | Repwise",
  description: "Track your daily nutrition and macros.",
};

export default async function NutritionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <NutritionClient />;
}
