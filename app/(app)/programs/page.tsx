"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Activity, AlertCircle } from "lucide-react";

interface Program {
  _id: string;
  name: string;
  splitType: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrograms() {
      try {
        const res = await fetch("/api/programs");
        if (!res.ok) {
          throw new Error("Failed to fetch programs");
        }
        const data = await res.json();
        setPrograms(data);
      } catch (err) {
        console.error("Failed to load programs", err);
        setError("Failed to load programs. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPrograms();
  }, []);

  const formatSplitType = (type: string) => {
    const splits: Record<string, string> = {
      push_pull_legs: "Push Pull Legs",
      bro_split: "Bro Split",
      upper_lower: "Upper Lower",
      full_body: "Full Body",
      arnold: "Arnold Split",
      custom: "Custom Split",
    };
    return splits[type] || type;
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your training programs
          </p>
        </div>
        <Button asChild>
          <Link href="/programs/create">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Create Program</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6 text-destructive" />}
          title="Error"
          description={error}
        />
      ) : programs.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No programs yet"
          description="Create your first training program to get started."
          actionLabel="Create Program"
          actionHref="/programs/create"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
  <Link
    key={program._id}
    href={`/programs/${program._id}`}
    className="block"
  >
    <Card className="relative overflow-hidden flex flex-col cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2 gap-4">
          <CardTitle className="text-xl line-clamp-1">
            {program.name}
          </CardTitle>

          {program.isActive ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400 shrink-0">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground shrink-0">
              Archived
            </span>
          )}
        </div>

        <CardDescription className="flex items-center text-sm">
          <Activity className="mr-1.5 h-3.5 w-3.5" />
          {formatSplitType(program.splitType)}
        </CardDescription>
      </CardHeader>
    </Card>
  </Link>
))}
        </div>
      )}
    </div>
  );
}
