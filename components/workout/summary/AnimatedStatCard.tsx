"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AnimatedStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number; // The numeric value to animate to
  prefix?: string;
  suffix?: string;
  unit?: string;
}

export function AnimatedStatCard({ icon, title, value, prefix, suffix, unit }: AnimatedStatCardProps) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || value === 0) {
      const id = window.requestAnimationFrame(() => setCurrentValue(value));
      return () => window.cancelAnimationFrame(id);
    }

    let startTimestamp: number | null = null;
    const duration = 500; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setCurrentValue(easeProgress * value);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrentValue(value);
      }
    };

    const animationId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationId);
  }, [value]);

  const display = `${prefix || ""}${Math.round(currentValue).toLocaleString()}${suffix || ""}`;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-muted">
      <CardContent className="p-5 flex flex-col h-full justify-center">
        <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
          {icon}
          <span className="text-xs uppercase font-semibold tracking-wider">{title}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold">{display}</span>
            {unit && <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
