import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GrowthClient from "./GrowthClient";

export const metadata = {
  title: "Growth Intelligence | Athlete",
  description: "Advanced AI analysis of your training trajectory and growth potential.",
};

export default async function GrowthIntelligencePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <GrowthClient />
  );
}
