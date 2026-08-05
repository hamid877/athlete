"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy, Zap, Target } from "lucide-react";

interface Achievement {
  category: string;
  title: string;
  description: string;
}

export function AchievementsSection() {
  const [achievements, setAchievements] = useState<{ unlocked: Achievement[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch("/api/achievements");
        if (res.ok) {
          const data = await res.json();
          setAchievements(data);
        }
      } catch (e) {
        console.error("Failed to fetch achievements", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <Card className="border-muted/50 mb-8 animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Award className="mr-2 h-5 w-5 text-muted-foreground" /> 
            <span className="bg-muted/50 h-6 w-32 rounded"></span>
          </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="h-16 bg-muted/20 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!achievements || !achievements.unlocked || achievements.unlocked.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
        <Award className="mr-2 h-5 w-5 text-purple-500" /> Achievements
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.unlocked.slice(0, 3).map((ach: Achievement, i: number) => (
          <Card key={i} className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20 shadow-sm">
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 flex-shrink-0">
                {ach.category === "streak" ? <Zap className="h-5 w-5" /> :
                 ach.category === "volume" ? <Trophy className="h-5 w-5" /> :
                 <Target className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{ach.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{ach.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
