import { cn } from "@/lib/utils";

interface OKRProgressBarProps {
  value: number;
  className?: string;
  size?: "sm" | "md";
}

export function OKRProgressBar({ value, className, size = "md" }: OKRProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const color =
    clampedValue >= 100
      ? "bg-primary"
      : clampedValue >= 60
      ? "bg-green-500"
      : clampedValue >= 30
      ? "bg-amber-500"
      : "bg-destructive";

  return (
    <div className={cn("w-full rounded-full bg-secondary overflow-hidden", size === "sm" ? "h-1.5" : "h-2", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
