import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, SmilePlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const NPS_ASPECTS = [
  { key: "atendimento", label: "Atendimento/Comunicação" },
  { key: "qualidade_entregas", label: "Qualidade de Entregas" },
  { key: "resultados", label: "Resultados Alcançados" },
  { key: "prazos", label: "Cumprimento de Prazos" },
  { key: "proatividade", label: "Proatividade" },
  { key: "custo_beneficio", label: "Relação Custo-Benefício" },
];

function classifyNps(score: number): { classification: string; label: string; color: string } {
  if (score >= 9) return { classification: "promoter", label: "Promotor", color: "text-emerald-600 bg-emerald-100" };
  if (score >= 7) return { classification: "neutral", label: "Neutro", color: "text-amber-600 bg-amber-100" };
  return { classification: "detractor", label: "Detrator", color: "text-red-600 bg-red-100" };
}

function generateActionItems(score: number) {
  if (score <= 6) {
    return [
      { text: "Alerta urgente para GP + Head CS", priority: "critical", status: "pending" },
      { text: "Analisar causa raiz", priority: "high", status: "pending" },
      { text: "Agendar reunião urgente com cliente (24-48h)", priority: "critical", status: "pending" },
      { text: "Elaborar plano de recuperação", priority: "high", status: "pending" },
    ];
  }
  if (score <= 8) {
    return [
      { text: "Analisar feedback detalhadamente", priority: "medium", status: "pending" },
      { text: "Identificar melhorias aplicáveis", priority: "medium", status: "pending" },
      { text: "Comunicar ações ao cliente", priority: "low", status: "pending" },
    ];
  }
  return [
    { text: "Agradecer cliente pessoalmente", priority: "low", status: "pending" },
    { text: "Solicitar depoimento (se autorizou)", priority: "medium", status: "pending" },
    { text: "Registrar como case de sucesso", priority: "low", status: "pending" },
  ];
}

export function NPSPanel({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseDialog, setResponseDialog] = useState<any>(null);

  // Form state for new survey
  const [surveyType, setSurveyType] = useState<"monthly" | "quarterly">("monthly");
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));

  // Response form state
  const [score, setScore] = useState([8]);
  const [feedback, setFeedback] = useState("");
  const [likedMost, setLikedMost] = useState("");
  const [improvement, setImprovement] = useState("");
  const [authTestimonial, setAuthTestimonial] = useState(false);
  const [caseStudy, setCaseStudy] = useState(false);
  const [willRefer, setWillRefer] = useState(false);
  const [aspectScores, setAspectScores] = useState<Record<string, number>>({});

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["nps-surveys", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_surveys")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const answeredSurveys = surveys?.filter(s => s.score != null) ?? [];
  const lastAnswered = answeredSurveys[0];

  const chartData = answeredSurveys
    .slice()
    .reverse()
    .map(s => ({ period: s.period, score: s.score }));

  // Create survey
  const createSurvey = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nps_surveys").insert({
        project_id: projectId,
        survey_type: surveyType,
        period,
        status: "pending",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pesquisa NPS criada!" });
      queryClient.invalidateQueries({ queryKey: ["nps-surveys", projectId] });
      setDialogOpen(false);
    },
  });

  // Save response
  const saveResponse = useMutation({
    mutationFn: async (surveyId: string) => {
      const { classification } = classifyNps(score[0]);
      const actionItems = generateActionItems(score[0]);

      const { error } = await supabase
        .from("nps_surveys")
        .update({
          score: score[0],
          classification,
          feedback,
          liked_most: likedMost,
          improvement,
          authorized_testimonial: authTestimonial,
          interested_case_study: caseStudy,
          willing_to_refer: willRefer,
          aspect_scores: Object.keys(aspectScores).length > 0 ? aspectScores : null,
          action_items: actionItems,
          status: "answered",
          answered_at: new Date().toISOString(),
        })
        .eq("id", surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Resposta NPS registrada!" });
      queryClient.invalidateQueries({ queryKey: ["nps-surveys", projectId] });
      queryClient.invalidateQueries({ queryKey: ["results-timeline", projectId] });
      setResponseDialog(null);
      resetResponseForm();
    },
  });

  const resetResponseForm = () => {
    setScore([8]);
    setFeedback("");
    setLikedMost("");
    setImprovement("");
    setAuthTestimonial(false);
    setCaseStudy(false);
    setWillRefer(false);
    setAspectScores({});
  };

  const scoreColor = score[0] >= 9 ? "text-emerald-600" : score[0] >= 7 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* NPS Hero */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="text-center min-w-[80px]">
            <div className={`text-5xl font-bold ${lastAnswered ? (classifyNps(lastAnswered.score!).color.split(" ")[0]) : "text-muted-foreground"}`}>
              {lastAnswered?.score ?? "—"}
            </div>
            {lastAnswered && (
              <Badge className={`mt-2 text-[10px] ${classifyNps(lastAnswered.score!).color}`}>
                {classifyNps(lastAnswered.score!).label}
              </Badge>
            )}
          </div>
          {chartData.length > 1 && (
            <div className="flex-1 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* Aspect scores from last quarterly */}
      {lastAnswered?.aspect_scores && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Avaliação por Aspecto</h3>
          <div className="space-y-3">
            {NPS_ASPECTS.map(({ key, label }) => {
              const val = (lastAnswered.aspect_scores as Record<string, number>)?.[key];
              if (val == null) return null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs w-40 text-right text-muted-foreground">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${val * 10}%` }} />
                  </div>
                  <span className="text-xs font-mono w-6 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova Pesquisa NPS
        </Button>
      </div>

      {/* History table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Período</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Score</TableHead>
              <TableHead className="text-xs">Classificação</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys?.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{s.period}</TableCell>
                <TableCell className="text-xs">{s.survey_type === "monthly" ? "Mensal" : "Trimestral"}</TableCell>
                <TableCell className="text-xs font-mono">{s.score ?? "—"}</TableCell>
                <TableCell>
                  {s.classification && (
                    <Badge className={`text-[10px] ${classifyNps(s.score ?? 0).color}`}>
                      {classifyNps(s.score ?? 0).label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{s.status === "pending" ? "Pendente" : s.status === "answered" ? "Respondido" : s.status}</TableCell>
                <TableCell>
                  {s.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => {
                        resetResponseForm();
                        setResponseDialog(s);
                      }}
                    >
                      <SmilePlus className="h-3 w-3 mr-1" />
                      Registrar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!surveys || surveys.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                  Nenhuma pesquisa NPS ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Survey Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pesquisa NPS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={surveyType} onValueChange={(v) => setSurveyType(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Período</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => createSurvey.mutate()} disabled={createSurvey.isPending}>
              Criar Pesquisa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={!!responseDialog} onOpenChange={(o) => { if (!o) setResponseDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Registrar Resposta NPS</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Score */}
            <div>
              <Label className="text-xs">Score NPS (0-10)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider value={score} onValueChange={setScore} min={0} max={10} step={1} className="flex-1" />
                <span className={`text-3xl font-bold font-mono ${scoreColor}`}>{score[0]}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {classifyNps(score[0]).label}
              </p>
            </div>

            {/* Aspect scores (quarterly) */}
            {responseDialog?.survey_type === "quarterly" && (
              <div>
                <Label className="text-xs mb-2 block">Avaliação por Aspecto</Label>
                <div className="space-y-3">
                  {NPS_ASPECTS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs w-36 text-muted-foreground">{label}</span>
                      <Slider
                        value={[aspectScores[key] ?? 7]}
                        onValueChange={(v) => setAspectScores(prev => ({ ...prev, [key]: v[0] }))}
                        min={0}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-5 text-right">{aspectScores[key] ?? 7}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Feedback Geral</Label>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">O que mais gostou?</Label>
              <Textarea value={likedMost} onChange={(e) => setLikedMost(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">O que pode melhorar?</Label>
              <Textarea value={improvement} onChange={(e) => setImprovement(e.target.value)} rows={2} className="mt-1" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={authTestimonial} onCheckedChange={(v) => setAuthTestimonial(!!v)} id="testimonial" />
                <label htmlFor="testimonial" className="text-xs">Autoriza uso de depoimento</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={caseStudy} onCheckedChange={(v) => setCaseStudy(!!v)} id="case" />
                <label htmlFor="case" className="text-xs">Interesse em case study</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={willRefer} onCheckedChange={(v) => setWillRefer(!!v)} id="refer" />
                <label htmlFor="refer" className="text-xs">Disposto a indicar</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => responseDialog && saveResponse.mutate(responseDialog.id)}
              disabled={saveResponse.isPending}
            >
              Registrar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
