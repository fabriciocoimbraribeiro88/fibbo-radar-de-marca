import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, ClipboardCopy } from "lucide-react";
import { calculateProgress, computeStatus, getQuarterProgress, STATUS_CONFIG } from "./okr-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportOKRsProps {
  objectives: any[];
  keyResultsByObj: Record<string, any[]>;
  quarter: string;
  year: number;
}

export function ExportOKRs({ objectives, keyResultsByObj, quarter, year }: ExportOKRsProps) {
  const { toast } = useToast();
  const quarterElapsed = getQuarterProgress(quarter, year);

  const generateMarkdown = () => {
    let md = `# OKRs — ${quarter} ${year}\n\n`;

    objectives.forEach((obj, objIdx) => {
      md += `## OBJ ${objIdx + 1}: ${obj.title}\n\n`;
      md += `| Key Result | Baseline | Meta | Atual | Progresso | Responsável |\n`;
      md += `|------------|----------|------|-------|-----------|-------------|\n`;

      const krs = keyResultsByObj[obj.id] ?? [];
      krs.forEach((kr, krIdx) => {
        const baseline = Number(kr.baseline_value ?? 0);
        const target = Number(kr.target_value);
        const current = Number(kr.current_value ?? 0);
        const progress = calculateProgress(baseline, target, current);
        const status = computeStatus(progress, quarterElapsed);
        const emoji = STATUS_CONFIG[status].emoji;
        const unit = kr.unit || "";

        md += `| KR${objIdx + 1}.${krIdx + 1}: ${kr.title} | ${baseline.toLocaleString("pt-BR")}${unit === "%" ? "%" : ""} | ${target.toLocaleString("pt-BR")}${unit === "%" ? "%" : ""} | ${current.toLocaleString("pt-BR")}${unit === "%" ? "%" : ""} | ${progress}% ${emoji} | ${kr.responsible || "—"} |\n`;
      });
      md += "\n---\n\n";
    });

    md += "*OKRs geradas por Fibbo Radar — Inteligência Competitiva com IA*\n";
    return md;
  };

  const copyMarkdown = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    toast({ title: "Markdown copiado!" });
  };

  const exportCSV = () => {
    let csv = "OBJETIVO,KEY RESULT,BASELINE,META,ATUAL,PROGRESSO,RESPONSÁVEL\n";

    objectives.forEach((obj, objIdx) => {
      csv += `"OBJ ${objIdx + 1}: ${obj.title}",,,,,,\n`;
      const krs = keyResultsByObj[obj.id] ?? [];
      krs.forEach((kr, krIdx) => {
        const baseline = Number(kr.baseline_value ?? 0);
        const target = Number(kr.target_value);
        const current = Number(kr.current_value ?? 0);
        const progress = calculateProgress(baseline, target, current);
        csv += `,"KR${objIdx + 1}.${krIdx + 1}: ${kr.title}",${baseline},${target},${current},${progress}%,"${kr.responsible || ""}"\n`;
      });
      csv += "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OKRs_${quarter}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyMarkdown}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Copiar como Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
