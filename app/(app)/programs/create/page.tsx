"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const SPLIT_OPTIONS = [
  {
    id: "push_pull_legs",
    title: "Push Pull Legs",
    description: "Push, Pull, Legs pattern. 6 days a week.",
  },
  {
    id: "bro_split",
    title: "Bro Split",
    description: "Target one muscle group per day. 5 days a week.",
  },
  {
    id: "upper_lower",
    title: "Upper Lower",
    description: "Alternating upper and lower body. 4 days a week.",
  },
  {
    id: "full_body",
    title: "Full Body",
    description: "Train all muscle groups every session. 3 days a week.",
  },
  {
    id: "arnold",
    title: "Arnold Split",
    description: "Chest/Back, Shoulders/Arms, Legs. 6 days a week.",
  },
  {
    id: "custom",
    title: "Custom Split",
    description: "Build your own schedule from scratch.",
  },
] as const;

interface SplitCardProps {
  id: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

function SplitCard({ id, title, description, selected, onSelect }: SplitCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"
      }`}
      onClick={() => onSelect(id)}
    >
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

interface SplitSelectorProps {
  selectedSplit: string;
  onSelect: (id: string) => void;
}

function SplitSelector({ selectedSplit, onSelect }: SplitSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Training Split</Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SPLIT_OPTIONS.map((option) => (
          <SplitCard
            key={option.id}
            id={option.id}
            title={option.title}
            description={option.description}
            selected={selectedSplit === option.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function CreateProgramForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [splitType, setSplitType] = useState<string>("push_pull_legs");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, splitType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create program");
      }

      router.push("/programs");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          placeholder="e.g. Summer Shredding"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <SplitSelector selectedSplit={splitType} onSelect={setSplitType} />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting || !name}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continue
      </Button>
    </form>
  );
}

export default function CreateProgramPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="-ml-2 mr-2">
          <Link href="/programs">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to programs</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Program</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Set up a new training program. We&apos;ll generate a default schedule based on the split you choose.
      </p>

      <CreateProgramForm />
    </div>
  );
}
