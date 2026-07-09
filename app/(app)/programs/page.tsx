"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Activity } from "lucide-react";

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
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
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
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-lg bg-muted/20">
          <h2 className="text-xl font-semibold mb-2">No programs yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first training program to get started.
          </p>
          <Button asChild variant="outline">
            <Link href="/programs/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Program
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program._id} className="relative overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2 gap-4">
                  <CardTitle className="text-xl line-clamp-1">{program.name}</CardTitle>
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
          ))}
        </div>
      )}
    </div>
  );
}
