import { Checkbox } from "@/components/ui/checkbox";
import type { AnalysisSection } from "@/lib/analysisSections";

interface SectionCardProps {
  section: AnalysisSection;
  checked: boolean;
  onToggle: (key: string) => void;
}

export default function SectionCard({ section, checked, onToggle }: SectionCardProps) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition-all ${
        checked
          ? "border-l-4 border-l-primary border-primary/30 bg-primary/5"
          : "border-border hover:bg-accent/50 border-l-4 border-l-transparent"
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(section.key)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{section.label}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {section.description}
        </p>
      </div>
    </label>
  );
}
