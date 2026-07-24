"use client";

import React, { useEffect, useState } from "react";
import { 
  Trophy, 
  Flame, 
  Medal, 
  Zap, 
  TrendingUp, 
  Crown, 
  Dumbbell, 
  Mountain, 
  Globe, 
  Timer,
  Play
} from "lucide-react";
import { toast } from "sonner";

import type {
  AchievementsResponse,
  LockedAchievement,
  UnlockedAchievement,
} from "@/lib/achievements/types";

const IconMap: Record<string, React.ReactNode> = {
  Play: <Play className="w-8 h-8" />,
  Flame: <Flame className="w-8 h-8" />,
  Medal: <Medal className="w-8 h-8" />,
  Trophy: <Trophy className="w-8 h-8" />,
  TrendingUp: <TrendingUp className="w-8 h-8" />,
  Zap: <Zap className="w-8 h-8" />,
  Crown: <Crown className="w-8 h-8" />,
  Dumbbell: <Dumbbell className="w-8 h-8" />,
  Mountain: <Mountain className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
  Timer: <Timer className="w-8 h-8" />
};

const TierColors = {
  bronze: "from-amber-600 to-amber-800 text-amber-50 border-amber-600/50",
  silver: "from-slate-400 to-slate-500 text-slate-50 border-slate-400/50",
  gold: "from-yellow-400 to-yellow-600 text-yellow-50 border-yellow-500/50",
  platinum: "from-cyan-300 to-blue-500 text-cyan-50 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)]",
};

const TierShadows = {
  bronze: "shadow-amber-900/20",
  silver: "shadow-slate-900/20",
  gold: "shadow-yellow-900/20",
  platinum: "shadow-cyan-900/30",
}

const TierIconColors = {
  bronze: "text-amber-300",
  silver: "text-slate-100",
  gold: "text-yellow-100",
  platinum: "text-white",
}



export default function AchievementsPage() {
  const [data, setData] =
  useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch("/api/achievements");
        const json = await res.json();
        
        if (json.unlocked) {
          const unlockedIds = json.unlocked.map((a: UnlockedAchievement) => a.id);
          const storedKey = "athlete_unlocked_achievements";
          
          const storedData = localStorage.getItem(storedKey);
          
          if (storedData) {
            const previouslyUnlocked = JSON.parse(storedData);
            const newlyUnlocked = json.unlocked.filter((a: UnlockedAchievement) => !previouslyUnlocked.includes(a.id));
            
            if (newlyUnlocked.length > 0) {
              newlyUnlocked.forEach((ach: UnlockedAchievement) => {
                toast.success(`Achievement Unlocked: ${ach.title}! 🏆`, {
                  description: ach.description,
                  duration: 5000,
                });
              });
              localStorage.setItem(storedKey, JSON.stringify(unlockedIds));
            }
          } else {
            // First time loading the achievements, just store them
            localStorage.setItem(storedKey, JSON.stringify(unlockedIds));
          }
        }

        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

const unlocked: UnlockedAchievement[] = data?.unlocked ?? [];
const locked: LockedAchievement[] = data?.locked ?? [];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
          Your Achievements
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Track your progress, build consistency, and unlock rewards for your dedication.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Trophy className="text-yellow-500 w-6 h-6" /> 
          Unlocked ({unlocked.length})
        </h2>
        {unlocked.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
            <p className="text-gray-400">You haven&apos;t unlocked any achievements yet. Keep training!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unlocked.map((ach: UnlockedAchievement)=> (
              <div 
                key={ach.id} 
                className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br ${TierColors[ach.tier as keyof typeof TierColors]} border shadow-xl ${TierShadows[ach.tier as keyof typeof TierShadows]} transform transition-all duration-300 hover:scale-[1.02]`}
              >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`p-3 rounded-full bg-black/20 ${TierIconColors[ach.tier as keyof typeof TierIconColors]}`}>
                    {IconMap[ach.icon] || <Trophy className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1">{ach.title}</h3>
                    <p className="text-sm opacity-90 leading-relaxed mb-3">
                      {ach.description}
                    </p>
                    <div className="text-xs font-semibold px-2 py-1 bg-black/20 rounded-full inline-block backdrop-blur-sm uppercase tracking-wider">
                      {ach.tier}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-300">
          <Zap className="text-gray-500 w-6 h-6" /> 
          In Progress ({locked.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locked.map((ach: LockedAchievement) => (
            <div 
              key={ach.id} 
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                  {IconMap[ach.icon] || <Trophy className="w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-200">{ach.title}</h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-800 text-gray-400 rounded-full uppercase tracking-wider border border-gray-700">
                      {ach.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    {ach.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400 font-medium">
                      <span>{Math.floor(ach.currentValue)} {ach.unit}</span>
                      <span>{ach.target} {ach.unit}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${Math.max(2, ach.progressPercentage)}%` }}
                      >
                         <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
