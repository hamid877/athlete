"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dumbbell, 
  User, 
  Award, 
  Heart, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { aboutMyselfSchema, type AboutMyselfInput } from "@/validators/auth.schema";
import { completeAboutMyself } from "@/actions/onboarding.actions";

export default function AboutMyselfPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [isPending, startTransition] = React.useTransition();
  const totalSteps = 3;

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<AboutMyselfInput>({
    resolver: zodResolver(aboutMyselfSchema),
    defaultValues: {
      age: undefined,
      gender: "prefer-not-to-say",
      heightCm: undefined,
      weightKg: undefined,
      fitnessGoal: "",
      yearsOfLifting: 0,
      workoutDaysPerWeek: 3,
      workoutLocation: "gym",
      injuries: "",
      medicalConditions: "",
    },
  });

  const selectedGoal = watch("fitnessGoal");
  const selectedLocation = watch("workoutLocation");
  const selectedGender = watch("gender");

  // Step navigation validation
  const handleNext = async () => {
    let fieldsToValidate: Array<keyof AboutMyselfInput> = [];
    if (step === 1) {
      fieldsToValidate = ["age", "gender", "heightCm", "weightKg"];
    } else if (step === 2) {
      fieldsToValidate = ["fitnessGoal", "yearsOfLifting", "workoutDaysPerWeek", "workoutLocation"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    } else {
      toast.error("Please fill in all required fields correctly.");
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: AboutMyselfInput) => {
    startTransition(async () => {
      try {
        const result = await completeAboutMyself(data);
        if (result.success) {
          toast.success("Profile completed! Welcome to Gym Tracker.");
          router.push("/dashboard");
        } else {
          toast.error(result.error || "Something went wrong.");
        }
      } catch (err: unknown) {
        // NextJS redirect throws an error, which is caught here. We only want to toast actual errors.
        const message = err instanceof Error ? err.message : "";
        if (message.includes("NEXT_REDIRECT")) {
          return;
        }
        toast.error("An unexpected error occurred during submission.");
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col justify-center space-y-6 px-4 py-8">
      <div className="flex flex-col space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] shadow-sm">
          <Dumbbell className="h-6 w-6 animate-pulse" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Complete Your Profile
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Help us customize your gym schedules, calculations, and tracking for optimal results.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className="font-semibold text-[var(--primary)]">
            Step {step} of {totalSteps}
          </span>
          <span className="text-[var(--text-secondary)] font-medium">
            {step === 1 && "Physical Details"}
            {step === 2 && "Training Profile"}
            {step === 3 && "Health & Safety"}
          </span>
        </div>
        
        <Progress value={(step / totalSteps) * 100} className="h-2 bg-[var(--background-subtle)]" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-[var(--shadow-md)] transition-all duration-300">
            {/* STEP 1: PHYSICAL DETAILS */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Physical Details</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    These metrics are used to calculate calorie burn, volume recommendations, and relative strength.
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Age Input */}
                  <div className="grid gap-2">
                    <Label htmlFor="age" className="text-sm font-semibold text-[var(--text-primary)]">
                      How old are you?
                    </Label>
                    <div className="relative">
                      <Input
                        id="age"
                        type="number"
                        placeholder="Age (years)"
                        className={`pl-3 pr-10 py-5 bg-[var(--background)] border ${errors.age ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : 'border-[var(--border)] focus-visible:ring-[var(--primary)]'}`}
                        {...register("age", { valueAsNumber: true })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                        years
                      </span>
                    </div>
                    {errors.age && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.age.message}</p>
                    )}
                  </div>

                  {/* Height & Weight Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Height */}
                    <div className="grid gap-2">
                      <Label htmlFor="heightCm" className="text-sm font-semibold text-[var(--text-primary)]">
                        Height
                      </Label>
                      <div className="relative">
                        <Input
                          id="heightCm"
                          type="number"
                          step="any"
                          placeholder="Height"
                          className={`pl-3 pr-10 py-5 bg-[var(--background)] border ${errors.heightCm ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : 'border-[var(--border)] focus-visible:ring-[var(--primary)]'}`}
                          {...register("heightCm", { valueAsNumber: true })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                          cm
                        </span>
                      </div>
                      {errors.heightCm && (
                        <p className="text-xs text-[var(--danger)] font-medium">{errors.heightCm.message}</p>
                      )}
                    </div>

                    {/* Weight */}
                    <div className="grid gap-2">
                      <Label htmlFor="weightKg" className="text-sm font-semibold text-[var(--text-primary)]">
                        Current Weight
                      </Label>
                      <div className="relative">
                        <Input
                          id="weightKg"
                          type="number"
                          step="any"
                          placeholder="Weight"
                          className={`pl-3 pr-10 py-5 bg-[var(--background)] border ${errors.weightKg ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : 'border-[var(--border)] focus-visible:ring-[var(--primary)]'}`}
                          {...register("weightKg", { valueAsNumber: true })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                          kg
                        </span>
                      </div>
                      {errors.weightKg && (
                        <p className="text-xs text-[var(--danger)] font-medium">{errors.weightKg.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Gender Select Cards */}
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-[var(--text-primary)]">Gender</Label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-3"
                        >
                          {[
                            { value: "male", label: "Male" },
                            { value: "female", label: "Female" },
                            { value: "other", label: "Other" },
                            { value: "prefer-not-to-say", label: "Prefer not to say" },
                          ].map((genderOption) => (
                            <label
                              key={genderOption.value}
                              className={`flex items-center justify-between cursor-pointer rounded-[var(--radius-md)] border p-4 text-sm font-medium transition-all duration-200 hover:bg-[var(--background-subtle)] ${
                                selectedGender === genderOption.value
                                  ? "border-[var(--primary)] bg-[var(--primary-subtle)]/30 text-[var(--primary)] ring-1 ring-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value={genderOption.value} id={`gender-${genderOption.value}`} className="sr-only" />
                                <span>{genderOption.label}</span>
                              </div>
                              {selectedGender === genderOption.value && (
                                <Check className="h-4 w-4 text-[var(--primary)]" />
                              )}
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    />
                    {errors.gender && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.gender.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TRAINING PROFILE */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Training Profile</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Help us customize your workout routines, volumes, and expectations.
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Fitness Goal Card Options */}
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-[var(--text-primary)]">Primary Fitness Goal</Label>
                    <Controller
                      name="fitnessGoal"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { value: "Build Muscle", desc: "Hypertrophy, size, and strength training" },
                            { value: "Lose Weight", desc: "Fat loss, definitions, and high burn workouts" },
                            { value: "Increase Strength", desc: "Powerlifting, low rep max output, performance" },
                            { value: "Improve Endurance", desc: "Stamina, cardiovascular fitness, muscle endurance" },
                          ].map((goalOption) => (
                            <button
                              key={goalOption.value}
                              type="button"
                              onClick={() => field.onChange(goalOption.value)}
                              className={`flex flex-col text-left cursor-pointer rounded-[var(--radius-md)] border p-4 transition-all duration-200 hover:bg-[var(--background-subtle)] ${
                                selectedGoal === goalOption.value
                                  ? "border-[var(--primary)] bg-[var(--primary-subtle)]/30 ring-1 ring-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--background)]"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-sm font-bold ${selectedGoal === goalOption.value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                  {goalOption.value}
                                </span>
                                {selectedGoal === goalOption.value && (
                                  <Check className="h-4 w-4 text-[var(--primary)]" />
                                )}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)] mt-1 font-normal leading-normal">
                                {goalOption.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    />
                    {errors.fitnessGoal && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.fitnessGoal.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Years of Lifting */}
                    <div className="grid gap-2">
                      <Label htmlFor="yearsOfLifting" className="text-sm font-semibold text-[var(--text-primary)]">
                        Lifting Experience
                      </Label>
                      <div className="relative">
                        <Input
                          id="yearsOfLifting"
                          type="number"
                          placeholder="Years"
                          className={`pl-3 pr-12 py-5 bg-[var(--background)] border ${errors.yearsOfLifting ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : 'border-[var(--border)] focus-visible:ring-[var(--primary)]'}`}
                          {...register("yearsOfLifting", { valueAsNumber: true })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                          years
                        </span>
                      </div>
                      {errors.yearsOfLifting && (
                        <p className="text-xs text-[var(--danger)] font-medium">{errors.yearsOfLifting.message}</p>
                      )}
                    </div>

                    {/* Workout Days Per Week */}
                    <div className="grid gap-2">
                      <Label htmlFor="workoutDaysPerWeek" className="text-sm font-semibold text-[var(--text-primary)]">
                        Target Days / Week
                      </Label>
                      <div className="relative">
                        <Input
                          id="workoutDaysPerWeek"
                          type="number"
                          placeholder="Days"
                          className={`pl-3 pr-12 py-5 bg-[var(--background)] border ${errors.workoutDaysPerWeek ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : 'border-[var(--border)] focus-visible:ring-[var(--primary)]'}`}
                          {...register("workoutDaysPerWeek", { valueAsNumber: true })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium">
                          days
                        </span>
                      </div>
                      {errors.workoutDaysPerWeek && (
                        <p className="text-xs text-[var(--danger)] font-medium">{errors.workoutDaysPerWeek.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Workout Location Options */}
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-[var(--text-primary)]">Where do you train?</Label>
                    <Controller
                      name="workoutLocation"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-3"
                        >
                          {[
                            { value: "gym", label: "Commercial Gym", desc: "Access to barbells, machines, dumbells" },
                            { value: "home", label: "Home / Outdoors", desc: "Bodyweight, resistance bands, basic setup" },
                          ].map((locationOption) => (
                            <label
                              key={locationOption.value}
                              className={`flex flex-col text-left cursor-pointer rounded-[var(--radius-md)] border p-4 transition-all duration-200 hover:bg-[var(--background-subtle)] ${
                                selectedLocation === locationOption.value
                                  ? "border-[var(--primary)] bg-[var(--primary-subtle)]/30 ring-1 ring-[var(--primary)]"
                                  : "border-[var(--border)] bg-[var(--background)]"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-sm font-bold ${selectedLocation === locationOption.value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                  {locationOption.label}
                                </span>
                                {selectedLocation === locationOption.value && (
                                  <Check className="h-4 w-4 text-[var(--primary)]" />
                                )}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)] mt-1 font-normal leading-normal">
                                {locationOption.desc}
                              </span>
                              <RadioGroupItem value={locationOption.value} id={`loc-${locationOption.value}`} className="sr-only" />
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    />
                    {errors.workoutLocation && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.workoutLocation.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: HEALTH & SAFETY */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                <div className="border-b border-[var(--border)] pb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-[var(--primary)]" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Health & Safety</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Your safety is our priority. These details help us flag potentially dangerous movements or volume issues.
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Injuries */}
                  <div className="grid gap-2">
                    <div className="flex items-center gap-1.5 text-[var(--warning)]">
                      <ShieldAlert className="h-4 w-4" />
                      <Label htmlFor="injuries" className="text-sm font-semibold text-[var(--text-primary)]">
                        Injuries (Optional)
                      </Label>
                    </div>
                    <textarea
                      id="injuries"
                      placeholder="e.g. Lower back pain, torn rotator cuff, knee discomfort"
                      rows={3}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("injuries")}
                    />
                    {errors.injuries && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.injuries.message}</p>
                    )}
                  </div>

                  {/* Medical Conditions */}
                  <div className="grid gap-2">
                    <Label htmlFor="medicalConditions" className="text-sm font-semibold text-[var(--text-primary)]">
                      Medical Conditions (Optional)
                    </Label>
                    <textarea
                      id="medicalConditions"
                      placeholder="e.g. Asthma, High blood pressure, Heart condition"
                      rows={3}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("medicalConditions")}
                    />
                    {errors.medicalConditions && (
                      <p className="text-xs text-[var(--danger)] font-medium">{errors.medicalConditions.message}</p>
                    )}
                  </div>

                  {/* Summary/Agreement check */}
                  <div className="rounded-[var(--radius-md)] bg-[var(--background-subtle)] p-4 text-xs text-[var(--text-secondary)] border border-[var(--border)] flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)] mb-0.5">Ready to crush it?</p>
                      By clicking complete, you verify that these details are correct. You can edit these anytime from your Profile settings.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full py-6 flex items-center justify-center gap-2 hover:bg-[var(--background-subtle)]"
              onClick={handleBack}
              disabled={step === 1 || isPending}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                type="button"
                className="w-full py-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"
                onClick={handleNext}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending}
                className="w-full py-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 shadow-md relative"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
