import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { calculateProgress } from "./okr-utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: any;
}

export function HistoryDialog({ open, onOpenChange, kr }: HistoryDialogProps) {
  if (!kr) return null;

  const baseline = Number(kr.baseline_value ?? 0);
  const target = Number(kr.target_value);
  const measurements: any[] = (kr.okr_measurements ?? [])
    .sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());

  const chartData = measurements.map(m => ({
    date: format(new Date(m.measured_at), "dd/MM", { locale: ptBR }),
    value: Number(m.value),
    fullDate: m.measured_at,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {kr.title}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Baseline: {baseline.toLocaleString("pt-BR")} · Meta: {target.toLocaleString("pt-BR")}
          </p>
        </DialogHeader>

        {chartData.length > 1 && (
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <ReferenceLine y={target} stroke="hsl(var(--primary))" strokeDasharray="6 4" label={{ value: "Meta", fontSize: 10, fill: "hsl(var(--primary))" }} />
                <ReferenceLine y={baseline} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: "Baseline", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs text-center">Progresso</TableHead>
                <TableHead className="text-xs">Fonte</TableHead>
                <TableHead className="text-xs">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma medição registrada.
                  </TableCell>
                </TableRow>
              )}
              {measurements.map((m: any) => {
                const progress = calculateProgress(baseline, target, Number(m.value));
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm font-mono">
                      {format(new Date(m.measured_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono font-medium">
                      {Number(m.value).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">{progress}%</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.source === "automatic" ? "🤖 Auto" : "✋ Manual"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {m.notes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
