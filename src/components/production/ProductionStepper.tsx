import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "titles", label: "Títulos" },
  { key: "briefings", label: "Briefings" },
  { key: "creatives", label: "Criativos" },
] as const;

export type ProductionStep = (typeof STEPS)[number]["key"];

interface Props {
  currentStep: ProductionStep;
  completedSteps: ProductionStep[];
  onStepClick?: (step: ProductionStep) => void;
}

export default function ProductionStepper({ currentStep, completedSteps, onStepClick }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-0 w-full max-w-xl mx-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isClickable = isCompleted || isCurrent;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step.key)}
              className={cn(
                "flex items-center gap-2 group transition-colors",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  isCurrent && "bg-primary text-primary-foreground shadow-md",
                  isCompleted && !isCurrent && "bg-primary/20 text-primary",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap hidden sm:inline",
                  isCurrent && "text-foreground",
                  isCompleted && !isCurrent && "text-primary",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>

            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2",
                  idx < currentIdx ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Map a planning_calendar status to the current production step */
export function statusToStep(status: string | null): ProductionStep {
  switch (status) {
    case "briefings_review":
      return "briefings";
    case "approved":
    case "active":
      return "creatives";
    default:
      return "titles";
  }
}

/** Get all completed steps given the current step */
export function getCompletedSteps(current: ProductionStep): ProductionStep[] {
  const order: ProductionStep[] = ["titles", "briefings", "creatives"];
  const idx = order.indexOf(current);
  return order.slice(0, idx);
}
