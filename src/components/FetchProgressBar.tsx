import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

const PROGRESS_STEPS = [
  { label: "Conectando...", target: 15 },
  { label: "Baixando perfil...", target: 35 },
  { label: "Baixando posts...", target: 60 },
  { label: "Processando...", target: 80 },
  { label: "Salvando...", target: 92 },
];

export function FetchProgressBar({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!active) {
      if (progress > 0) {
        setProgress(100);
        const t = setTimeout(() => { setProgress(0); setStep(0); }, 1200);
        return () => clearTimeout(t);
      }
      return;
    }
    setStep(0);
    setProgress(5);
    intervalRef.current = setInterval(() => {
      setStep((prev) => {
        const next = Math.min(prev + 1, PROGRESS_STEPS.length - 1);
        setProgress(PROGRESS_STEPS[next].target);
        return next;
      });
    }, 3500);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  if (progress === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress >= 100 ? "Concluído!" : PROGRESS_STEPS[step]?.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}
