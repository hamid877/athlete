"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, Trophy, Flame, Target, CheckCircle2 } from "lucide-react";

export type HighlightType = "pr" | "volume" | "streak" | "growth" | "perfect" | "none";

interface CelebrationHeroProps {
  workoutName: string;
  dateStr: string;
  durationStr: string;
  heroTitle: string;
  message: string;
  highlightType: HighlightType;
}

export function CelebrationHero({ 
  workoutName, 
  dateStr, 
  durationStr, 
  heroTitle, 
  message,
  highlightType 
}: CelebrationHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Add a small delay for a smoother entry
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div>
        <div className="flex items-center space-x-3 mb-1">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {heroTitle}
          </h1>
          {highlightType === "pr" && <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />}
          {highlightType === "volume" && <Flame className="h-8 w-8 text-orange-500 animate-pulse" />}
          {highlightType === "growth" && <Target className="h-8 w-8 text-purple-500 animate-pulse" />}
          {highlightType === "perfect" && <CheckCircle2 className="h-8 w-8 text-green-500" />}
        </div>
        
        <h2 className="text-2xl font-bold text-foreground">
          {workoutName}
        </h2>
        
        <p className="text-lg font-medium text-primary/80 mt-1">
          {message}
        </p>
        
        <div className="text-sm text-muted-foreground mt-3 flex items-center">
          <Calendar className="mr-1.5 h-4 w-4" />
          {dateStr}
          <span className="mx-2">•</span>
          <Clock className="mr-1.5 h-4 w-4" />
          {durationStr}
        </div>
      </div>
    </div>
  );
}
