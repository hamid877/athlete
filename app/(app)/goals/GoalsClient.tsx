"use client";

import { useState, useEffect } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalDocument } from "@/types";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { toast } from "sonner";

export default function GoalsClient() {
  const [goals, setGoals] = useState<GoalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "achieved" | "archived">("active");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalDocument | undefined>(undefined);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      const data = await res.json();
      setGoals(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load goals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGoals();
  }, []);

  const handleSaveGoal = async (data: Record<string, unknown>) => {
    try {
      if (selectedGoal) {
        const res = await fetch(`/api/goals/${selectedGoal._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update goal");
        toast.success("Goal updated successfully");
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to create goal");
        }
        toast.success("Goal created successfully");
      }
      fetchGoals();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
      throw error; // Let modal stay open on error
    }
  };

  const handleCreateNew = () => {
    setSelectedGoal(undefined);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: GoalDocument) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const filteredGoals = goals.filter(g => g.status === activeTab);

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Goals</h1>
          <Button onClick={handleCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Goal
          </Button>
        </div>
        
        <div className="flex bg-[var(--bg-muted)] p-1 rounded-lg">
          {(["active", "achieved", "archived"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : filteredGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map(goal => (
              <GoalCard 
                key={goal._id.toString()} 
                goal={goal} 
                onClick={() => handleEditGoal(goal)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh] border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-muted)]">
            <div className="h-12 w-12 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
              No {activeTab} goals
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-[250px]">
              {activeTab === "active" 
                ? "Set a new target and start tracking your progress."
                : `You don't have any ${activeTab} goals yet.`}
            </p>
            {activeTab === "active" && (
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first goal
              </Button>
            )}
          </div>
        )}
      </main>

      <GoalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goal={selectedGoal}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
