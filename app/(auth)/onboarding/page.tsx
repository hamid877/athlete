"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      toast.success("Profile created successfully!");
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center space-y-6 sm:w-[400px]">
      <div className="flex flex-col space-y-2 text-center">
        <Dumbbell className="mx-auto h-8 w-8 text-[var(--primary)]" strokeWidth={1.75} />
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Let&apos;s get to know you
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Tell us about yourself so we can personalize your experience.
        </p>
      </div>

      <div className="space-y-6">
        <Progress value={(step / totalSteps) * 100} className="h-1.5" />

        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Basic Info</h2>
                <p className="text-sm text-[var(--text-secondary)]">Your physical attributes help us calculate metrics.</p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" placeholder="e.g. 25" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" placeholder="175" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" type="number" placeholder="70" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Experience Level</h2>
                <p className="text-sm text-[var(--text-secondary)]">How long have you been training?</p>
              </div>
              <RadioGroup defaultValue="beginner" className="gap-3">
                {[
                  { value: "beginner", label: "Beginner", desc: "Less than 1 year" },
                  { value: "intermediate", label: "Intermediate", desc: "1-3 years" },
                  { value: "advanced", label: "Advanced", desc: "3+ years" }
                ].map((level) => (
                  <div key={level.value} className="flex items-start space-x-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--background-subtle)] [&:has(:checked)]:border-[var(--primary)] [&:has(:checked)]:bg-[var(--primary-subtle)]/50">
                    <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                    <div className="grid gap-1">
                      <Label htmlFor={level.value} className="font-semibold">{level.label}</Label>
                      <p className="text-xs text-[var(--text-secondary)]">{level.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Primary Goal</h2>
                <p className="text-sm text-[var(--text-secondary)]">What do you want to achieve?</p>
              </div>
              <RadioGroup defaultValue="muscle" className="gap-3">
                {[
                  { value: "muscle", label: "Build Muscle", desc: "Hypertrophy and strength" },
                  { value: "fat-loss", label: "Lose Fat", desc: "Weight loss and definition" },
                  { value: "endurance", label: "Endurance", desc: "Cardio and stamina" },
                  { value: "maintenance", label: "Maintenance", desc: "Stay healthy and fit" }
                ].map((goal) => (
                  <div key={goal.value} className="flex items-start space-x-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--background-subtle)] [&:has(:checked)]:border-[var(--primary)] [&:has(:checked)]:bg-[var(--primary-subtle)]/50">
                    <RadioGroupItem value={goal.value} id={goal.value} className="mt-1" />
                    <div className="grid gap-1">
                      <Label htmlFor={goal.value} className="font-semibold">{goal.label}</Label>
                      <p className="text-xs text-[var(--text-secondary)]">{goal.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            className="w-full"
            onClick={handleNext}
          >
            {step === totalSteps ? "Complete Profile" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
