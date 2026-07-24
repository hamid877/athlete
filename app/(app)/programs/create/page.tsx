"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProgramTemplate {
  _id: string;
  name: string;
  description?: string;
  difficulty: string;
  goal: string;
  daysPerWeek: number;
  estimatedSessionMinutes: number;
}


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
  const [creationMode, setCreationMode] = useState<"scratch" | "template">("scratch");
  const [splitType, setSplitType] = useState<string>("push_pull_legs");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (creationMode !== "template" || templates.length > 0) {
    return;
  }

  async function loadTemplates() {
    try {
      setIsLoadingTemplates(true);

      const res = await fetch("/api/templates/programs");

      if (!res.ok) {
        throw new Error("Failed to load templates");
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  void loadTemplates();
}, [creationMode, templates.length]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = creationMode === "template"
        ? { name, templateId: selectedTemplateId }
        : { name, splitType };

      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const isSubmitDisabled = isSubmitting || (creationMode === "template" && !selectedTemplateId);

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

      <div className="space-y-3">
        <Label>Creation Method</Label>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${creationMode === "scratch" ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"}`}
            onClick={() => setCreationMode("scratch")}
          >
            <CardHeader className="p-4 text-center">
              <CardTitle className="text-base">Start from Scratch</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${creationMode === "template" ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"}`}
            onClick={() => setCreationMode("template")}
          >
            <CardHeader className="p-4 text-center">
              <CardTitle className="text-base">Use a Template</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {creationMode === "scratch" ? (
        <SplitSelector selectedSplit={splitType} onSelect={setSplitType} />
      ) : (
        <div className="space-y-3">
          <Label>Select Template</Label>
          {isLoadingTemplates ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map(t => (
                <Card
                  key={t._id}
                  className={`cursor-pointer transition-all flex flex-col justify-between ${selectedTemplateId === t._id ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:border-muted-foreground/50"}`}
                  onClick={() => setSelectedTemplateId(t._id)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.description && <CardDescription className="text-xs line-clamp-2 mt-1">{t.description}</CardDescription>}
                    <div className="mt-3 text-xs text-muted-foreground flex gap-2 font-medium">
                      <span>{t.daysPerWeek} days/week</span>
                      <span>•</span>
                      <span className="capitalize">{t.difficulty}</span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
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
