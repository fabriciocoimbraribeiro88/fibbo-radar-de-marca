import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Plus,
  Save,
  CheckCircle2,
  Trash2,
  Calendar,
  Users,
  Star,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

// ── Types ────────────────────────────────────────────────────────
interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  notes: string;
}

interface Checkin {
  id: string;
  project_id: string;
  type: string;
  title: string;
  reference_date: string;
  status: string;
  checklist: ChecklistItem[];
  summary: string | null;
  nps_score: number | null;
  nps_feedback: string | null;
  participants: string[];
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Templates ────────────────────────────────────────────────────
const TEMPLATES: Record<string, ChecklistItem[]> = {
  weekly: [
    { id: "w1", text: "KPIs principais da semana", checked: false, notes: "" },
    { id: "w2", text: "Comparativo com semana anterior", checked: false, notes: "" },
    { id: "w3", text: "Destaques positivos", checked: false, notes: "" },
    { id: "w4", text: "Otimizações realizadas", checked: false, notes: "" },
    { id: "w5", text: "Plano para próxima semana", checked: false, notes: "" },
    { id: "w6", text: "Enviar report (WhatsApp resumo + Drive detalhado)", checked: false, notes: "" },
  ],
  monthly: [
    { id: "m1", text: "Resumo executivo (status 🟢/🟡/🔴)", checked: false, notes: "" },
    { id: "m2", text: "Performance geral (investimento, leads, CPL/CPA, ROAS)", checked: false, notes: "" },
    { id: "m3", text: "Análise por canal (Meta Ads, Google Ads)", checked: false, notes: "" },
    { id: "m4", text: "Análise de público (demo, dispositivos, horários)", checked: false, notes: "" },
    { id: "m5", text: "Criativos e mensagens (performance, formatos)", checked: false, notes: "" },
    { id: "m6", text: "Otimizações realizadas e impacto", checked: false, notes: "" },
    { id: "m7", text: "Insights e aprendizados do mês", checked: false, notes: "" },
    { id: "m8", text: "Conteúdo orgânico e SEO", checked: false, notes: "" },
    { id: "m9", text: "Plano de ação para próximo mês", checked: false, notes: "" },
    { id: "m10", text: "Reunião mensal de apresentação", checked: false, notes: "" },
    { id: "m11", text: "Enviar NPS mensal", checked: false, notes: "" },
    { id: "m12", text: "Analisar NPS e definir ações", checked: false, notes: "" },
  ],
  quarterly: [
    { id: "q1", text: "Executive summary do trimestre", checked: false, notes: "" },
    { id: "q2", text: "Análise de OKRs (% atingimento, gaps)", checked: false, notes: "" },
    { id: "q3", text: "Performance consolidada 3 meses", checked: false, notes: "" },
    { id: "q4", text: "Análise aprofundada por canal", checked: false, notes: "" },
    { id: "q5", text: "ROI e resultados de negócio", checked: false, notes: "" },
    { id: "q6", text: "Conteúdo e marca (crescimento, engajamento)", checked: false, notes: "" },
    { id: "q7", text: "Análise de público e comportamento", checked: false, notes: "" },
    { id: "q8", text: "Histórico de testes A/B e aprendizados", checked: false, notes: "" },
    { id: "q9", text: "Análise competitiva atualizada", checked: false, notes: "" },
    { id: "q10", text: "Estratégia para próximo trimestre (novos OKRs)", checked: false, notes: "" },
    { id: "q11", text: "Reunião de revisão trimestral (2h)", checked: false, notes: "" },
    { id: "q12", text: "Enviar NPS trimestral completo", checked: false, notes: "" },
    { id: "q13", text: "Documentar feedback e action items", checked: false, notes: "" },
  ],
  annual: [
    { id: "a1", text: "Executive summary do ano", checked: false, notes: "" },
    { id: "a2", text: "Jornada completa 12 meses", checked: false, notes: "" },
    { id: "a3", text: "Performance consolidada anual", checked: false, notes: "" },
    { id: "a4", text: "Análise de todos OKRs (4 trimestres)", checked: false, notes: "" },
    { id: "a5", text: "ROI anual completo", checked: false, notes: "" },
    { id: "a6", text: "Evolução de marca e presença digital", checked: false, notes: "" },
    { id: "a7", text: "Histórico completo de testes e aprendizados", checked: false, notes: "" },
    { id: "a8", text: "Cases de sucesso detalhados", checked: false, notes: "" },
    { id: "a9", text: "Análise competitiva anual", checked: false, notes: "" },
    { id: "a10", text: "Estratégia para próximo ano", checked: false, notes: "" },
    { id: "a11", text: "Proposta de OKRs anuais", checked: false, notes: "" },
    { id: "a12", text: "Reunião anual estratégica (3h)", checked: false, notes: "" },
    { id: "a13", text: "Renovação/upgrade de contrato", checked: false, notes: "" },
    { id: "a14", text: "NPS anual e pesquisa de satisfação", checked: false, notes: "" },
  ],
};

const TYPE_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "secondary" },
  completed: { label: "Concluído", variant: "default" },
};

const uid = () => crypto.randomUUID();

// ── Component ────────────────────────────────────────────────────
export default function ProjectCheckins() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Active check-in state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [type, setType] = useState("weekly");
  const [title, setTitle] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsFeedback, setNpsFeedback] = useState("");
  const [participants, setParticipants] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  // Fetch history
  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ["checkins", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("project_id", projectId!)
        .order("reference_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Checkin[];
    },
    enabled: !!projectId,
  });

  // Save / update
  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload = {
        project_id: projectId!,
        type,
        title,
        reference_date: new Date().toISOString().split("T")[0],
        status,
        checklist: JSON.parse(JSON.stringify(checklist)),
        summary: summary || null,
        nps_score: npsScore,
        nps_feedback: npsFeedback || null,
        participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
        created_by: user?.id ?? null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      };

      if (activeId) {
        const { error } = await supabase.from("checkins").update(payload).eq("id", activeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checkins").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["checkins", projectId] });
      toast({ title: status === "completed" ? "Check-in concluído!" : "Rascunho salvo" });
      if (status === "completed") resetForm();
    },
    onError: (err) => {
      toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase.from("checkins").delete().eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins", projectId] });
      toast({ title: "Check-in removido" });
      if (activeId) resetForm();
    },
  });

  function resetForm() {
    setActiveId(null);
    setTitle("");
    setChecklist([]);
    setSummary("");
    setNpsScore(null);
    setNpsFeedback("");
    setParticipants("");
    setEditingItemId(null);
  }

  function startNew(t: string) {
    resetForm();
    setType(t);
    const weekNum = Math.ceil((new Date().getDate()) / 7);
    const month = format(new Date(), "MMM/yy", { locale: pt });
    const titles: Record<string, string> = {
      weekly: `Report Semanal - S${weekNum} ${month}`,
      monthly: `Relatório Mensal - ${format(new Date(), "MMMM yyyy", { locale: pt })}`,
      quarterly: `Revisão Trimestral - ${format(new Date(), "yyyy")}`,
      annual: `Revisão Anual - ${format(new Date(), "yyyy")}`,
    };
    setTitle(titles[t] ?? "Novo Check-in");
    setChecklist(TEMPLATES[t]?.map((item) => ({ ...item, id: uid() })) ?? []);
  }

  function loadCheckin(c: Checkin) {
    setActiveId(c.id);
    setType(c.type);
    setTitle(c.title);
    setChecklist(Array.isArray(c.checklist) ? c.checklist : []);
    setSummary(c.summary ?? "");
    setNpsScore(c.nps_score);
    setNpsFeedback(c.nps_feedback ?? "");
    setParticipants((c.participants ?? []).join(", "));
    setEditingItemId(null);
  }

  function toggleItem(itemId: string) {
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)));
  }

  function updateItemText(itemId: string, text: string) {
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? { ...i, text } : i)));
  }

  function updateItemNotes(itemId: string, notes: string) {
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? { ...i, notes } : i)));
  }

  function removeItem(itemId: string) {
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
  }

  function addItem() {
    if (!newItemText.trim()) return;
    setChecklist((prev) => [...prev, { id: uid(), text: newItemText.trim(), checked: false, notes: "" }]);
    setNewItemText("");
  }

  const checkedCount = checklist.filter((i) => i.checked).length;
  const progress = checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0;

  const filteredHistory = checkins.filter((c) => {
    if (historyFilter === "all") return true;
    return c.type === historyFilter;
  });

  const showNps = type === "monthly" || type === "quarterly" || type === "annual";
  const hasActiveForm = checklist.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Check-in
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reports semanais, mensais, trimestrais e anuais com checklists editáveis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Active Check-in ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type selector */}
          {!hasActiveForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo Check-in</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-20 flex-col gap-1"
                      onClick={() => startNew(key)}
                    >
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active form */}
          {hasActiveForm && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{TYPE_LABELS[type]}</Badge>
                    {activeId && <Badge variant={STATUS_LABELS[checkins.find((c) => c.id === activeId)?.status ?? "pending"]?.variant ?? "outline"}>{STATUS_LABELS[checkins.find((c) => c.id === activeId)?.status ?? "pending"]?.label}</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4 mr-1" /> Fechar
                  </Button>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold mt-2 border-none px-0 focus-visible:ring-0 bg-transparent"
                  placeholder="Título do check-in"
                />
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {checkedCount}/{checklist.length} ({progress}%)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Checklist items */}
                {checklist.map((item) => (
                  <div key={item.id} className="group border rounded-lg p-3 space-y-2 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                      />
                      {editingItemId === item.id ? (
                        <Input
                          value={item.text}
                          onChange={(e) => updateItemText(item.id, e.target.value)}
                          onBlur={() => setEditingItemId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                          autoFocus
                          className="flex-1 h-7 text-sm"
                        />
                      ) : (
                        <span
                          className={`flex-1 text-sm cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                          onClick={() => setEditingItemId(item.id)}
                        >
                          {item.text}
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingItemId(item.id)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {/* Notes per item */}
                    <Input
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      placeholder="Notas..."
                      className="h-7 text-xs ml-7 border-dashed"
                    />
                  </div>
                ))}

                {/* Add new item */}
                <div className="flex gap-2 pt-2">
                  <Input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Adicionar item ao checklist..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                  />
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Summary */}
                <div className="pt-4 space-y-2">
                  <label className="text-sm font-medium">Resumo / Notas gerais</label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Resumo do check-in..."
                    rows={3}
                  />
                </div>

                {/* NPS (monthly+) */}
                {showNps && (
                  <div className="pt-4 space-y-3 border-t">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" /> NPS
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Nota (0-10):</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 11 }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setNpsScore(i)}
                            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                              npsScore === i
                                ? i <= 6
                                  ? "bg-destructive text-destructive-foreground"
                                  : i <= 8
                                  ? "bg-yellow-500 text-white"
                                  : "bg-green-500 text-white"
                                : "bg-muted hover:bg-accent"
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={npsFeedback}
                      onChange={(e) => setNpsFeedback(e.target.value)}
                      placeholder="Feedback qualitativo do NPS..."
                      rows={2}
                    />
                  </div>
                )}

                {/* Participants */}
                <div className="pt-4 space-y-2 border-t">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Participantes
                  </label>
                  <Input
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="Nomes separados por vírgula"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate("in_progress")}
                    disabled={saveMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" /> Salvar rascunho
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate("completed")}
                    disabled={saveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como concluído
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: History ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico</CardTitle>
              <Select value={historyFilter} onValueChange={setHistoryFilter}>
                <SelectTrigger className="h-8 text-xs mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-auto custom-scrollbar">
              {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!isLoading && filteredHistory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum check-in ainda</p>
              )}
              {filteredHistory.map((c) => {
                const items = Array.isArray(c.checklist) ? c.checklist : [];
                const done = items.filter((i: ChecklistItem) => i.checked).length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                const isActive = activeId === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => loadCheckin(c)}
                    className={`w-full text-left border rounded-lg p-3 space-y-2 transition-colors hover:bg-accent/40 ${isActive ? "ring-2 ring-primary/50 bg-accent/30" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[c.type]}</Badge>
                      <Badge variant={STATUS_LABELS[c.status]?.variant ?? "outline"} className="text-[10px]">
                        {STATUS_LABELS[c.status]?.label ?? c.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{format(new Date(c.reference_date), "dd/MM/yyyy")}</span>
                      {c.nps_score != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3" /> NPS {c.nps_score}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
