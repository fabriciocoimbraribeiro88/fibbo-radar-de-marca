import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Plus,
  Megaphone,
  Search,
  Instagram,
  Loader2,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Lightbulb,
  Send,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CHANNELS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "ads", label: "Campanhas / Ads", icon: Megaphone },
  { value: "seo", label: "SEO / Blog", icon: Search },
];

const CONTENT_TYPES: Record<string, string[]> = {
  instagram: ["Reels", "Carrossel", "Post Estático", "Stories", "Collab"],
  ads: ["Campanha", "Conjunto de Anúncios", "Anúncio"],
  seo: ["Artigo", "Landing Page", "Palavra-chave"],
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: "Ideia", color: "bg-muted text-muted-foreground" },
  planned: { label: "Planejado", color: "bg-blue-500/15 text-blue-600" },
  in_production: { label: "Em Produção", color: "bg-amber-500/15 text-amber-600" },
  scheduled: { label: "Agendado", color: "bg-purple-500/15 text-purple-600" },
  published: { label: "Publicado", color: "bg-green-500/15 text-green-600" },
};

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface ItemForm {
  title: string;
  description: string;
  channel: string;
  content_type: string;
  scheduled_date: string;
  status: string;
  copy_text: string;
  hashtags: string;
  target_audience: string;
  keywords: string;
}

const emptyForm: ItemForm = {
  title: "",
  description: "",
  channel: "instagram",
  content_type: "",
  scheduled_date: "",
  status: "idea",
  copy_text: "",
  hashtags: "",
  target_audience: "",
  keywords: "",
};

export default function ProjectPlanning() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("instagram");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch approved analyses to link planning
  const { data: approvedAnalyses } = useQuery({
    queryKey: ["approved-analyses", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, type, period_start, period_end, created_at")
        .eq("project_id", projectId!)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Get calendars linked to analyses
  const { data: calendars, isLoading: calLoading } = useQuery({
    queryKey: ["planning-calendars", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const activeCalendar = calendars?.find((c) => c.id === selectedCalendarId) ?? calendars?.[0] ?? null;

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["planning-items", activeCalendar?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", activeCalendar!.id)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeCalendar?.id,
  });

  // Create calendar from analysis
  const createFromAnalysis = useMutation({
    mutationFn: async (analysisId: string) => {
      const analysis = approvedAnalyses?.find((a) => a.id === analysisId);
      if (!analysis) throw new Error("Análise não encontrada");

      const { data, error } = await supabase
        .from("planning_calendars")
        .insert({
          project_id: projectId!,
          title: `Planejamento — ${analysis.title}`,
          type: "integrated",
          generated_from_analysis: analysisId,
          period_start: analysis.period_start,
          period_end: analysis.period_end,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["planning-calendars"] });
      setSelectedCalendarId(data.id);
      toast({ title: "Calendário criado!", description: "Adicione itens baseados nos aprendizados da análise." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeCalendar) throw new Error("Nenhum calendário selecionado");
      const payload = {
        calendar_id: activeCalendar.id,
        title: form.title,
        description: form.description || null,
        channel: form.channel,
        content_type: form.content_type || null,
        scheduled_date: form.scheduled_date || null,
        status: form.status,
        copy_text: form.copy_text || null,
        hashtags: form.hashtags ? form.hashtags.split(",").map((h) => h.trim()) : null,
        target_audience: form.target_audience || null,
        keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim()) : null,
      };

      if (editingId) {
        const { error } = await supabase.from("planning_items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planning_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-items"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Item atualizado!" : "Item criado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planning_items")
        .update({ status: "deleted" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-items"] });
      setDeleteTarget(null);
      toast({ title: "Item removido!" });
    },
  });

  const openNew = (channel?: string) => {
    setForm({ ...emptyForm, channel: channel || activeTab });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm({
      title: item.title,
      description: item.description || "",
      channel: item.channel || "instagram",
      content_type: item.content_type || "",
      scheduled_date: item.scheduled_date || "",
      status: item.status || "idea",
      copy_text: item.copy_text || "",
      hashtags: item.hashtags?.join(", ") || "",
      target_audience: item.target_audience || "",
      keywords: item.keywords?.join(", ") || "",
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const filteredItems = items?.filter(
    (i) => i.channel === activeTab && i.status !== "deleted"
  ) ?? [];

  const monthItems = filteredItems.filter((i) => {
    if (!i.scheduled_date) return false;
    const d = new Date(i.scheduled_date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const unscheduledItems = filteredItems.filter((i) => !i.scheduled_date);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();

  const getItemsForDay = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthItems.filter((i) => i.scheduled_date === dateStr);
  };

  // Analyses that don't have a calendar yet
  const unusedAnalyses = approvedAnalyses?.filter(
    (a) => !calendars?.some((c) => c.generated_from_analysis === a.id)
  ) ?? [];

  if (calLoading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // No approved analyses and no calendars → show empty state
  const hasNoContent = !calendars?.length && !approvedAnalyses?.length;

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Planejamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calendário de conteúdo e campanhas baseado nos aprendizados das análises.
          </p>
        </div>
        {activeCalendar && (
          <Button onClick={() => openNew()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        )}
      </div>

      {/* Create from analysis prompt */}
      {unusedAnalyses.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {unusedAnalyses.length === 1 ? "Nova análise aprovada disponível" : `${unusedAnalyses.length} análises aprovadas disponíveis`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crie um calendário de conteúdo baseado nos aprendizados da análise.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {unusedAnalyses.map((a) => (
                    <Button
                      key={a.id}
                      variant="outline"
                      size="sm"
                      disabled={createFromAnalysis.isPending}
                      onClick={() => createFromAnalysis.mutate(a.id)}
                    >
                      {createFromAnalysis.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {a.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar selector if multiple */}
      {calendars && calendars.length > 1 && (
        <div className="mb-4">
          <Select
            value={activeCalendar?.id ?? ""}
            onValueChange={(v) => setSelectedCalendarId(v)}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione um calendário" />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* No calendars empty state */}
      {!activeCalendar && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum planejamento criado</p>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              O planejamento é gerado a partir de análises aprovadas. Crie e aprove uma análise primeiro para gerar o calendário de conteúdo.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate(`/projects/${projectId}/analyses`)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Ir para Análises
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calendar content */}
      {activeCalendar && (
        <>
          {/* Source analysis badge */}
          {activeCalendar.generated_from_analysis && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs gap-1">
                <BarChart3 className="h-3 w-3" />
                Baseado em análise aprovada
              </Badge>
              {activeCalendar.period_start && activeCalendar.period_end && (
                <span className="text-xs text-muted-foreground">
                  {new Date(activeCalendar.period_start).toLocaleDateString("pt-BR")} – {new Date(activeCalendar.period_end).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-accent">
              {CHANNELS.map((ch) => (
                <TabsTrigger key={ch.value} value={ch.value} className="gap-2">
                  <ch.icon className="h-3.5 w-3.5" />
                  {ch.label}
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {items?.filter((i) => i.channel === ch.value && i.status !== "deleted").length ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {CHANNELS.map((ch) => (
              <TabsContent key={ch.value} value={ch.value}>
                {/* Month selector */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear((y) => y - 1);
                        } else {
                          setSelectedMonth((m) => m - 1);
                        }
                      }}
                    >
                      ←
                    </Button>
                    <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
                      {MONTHS[selectedMonth]} {selectedYear}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear((y) => y + 1);
                        } else {
                          setSelectedMonth((m) => m + 1);
                        }
                      }}
                    >
                      →
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {monthItems.length} itens no mês
                  </span>
                </div>

                {/* Calendar grid */}
                <Card className="mb-6">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                        <div key={d} className="py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[72px]" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayItems = getItemsForDay(day);
                        const isToday =
                          day === new Date().getDate() &&
                          selectedMonth === new Date().getMonth() &&
                          selectedYear === new Date().getFullYear();

                        return (
                          <div
                            key={day}
                            className={`min-h-[72px] border border-border rounded p-1 ${
                              isToday ? "bg-primary/5 ring-1 ring-primary/30" : "hover:bg-accent/30"
                            }`}
                          >
                            <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                              {day}
                            </span>
                            <div className="space-y-0.5 mt-0.5">
                              {dayItems.slice(0, 2).map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => openEdit(item)}
                                  className="w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  {item.title}
                                </button>
                              ))}
                              {dayItems.length > 2 && (
                                <span className="text-[9px] text-muted-foreground pl-1">
                                  +{dayItems.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Unscheduled / Bank of Ideas */}
                {unscheduledItems.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground">Banco de Ideias</h3>
                      <Badge variant="secondary" className="text-[10px]">{unscheduledItems.length}</Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {unscheduledItems.map((item) => {
                        const st = STATUS_CONFIG[item.status ?? "idea"] ?? STATUS_CONFIG.idea;
                        return (
                          <Card key={item.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openEdit(item)}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                                <Badge className={`text-[9px] shrink-0 ml-2 ${st.color}`}>{st.label}</Badge>
                              </div>
                              {item.content_type && (
                                <span className="text-[10px] text-muted-foreground">{item.content_type}</span>
                              )}
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All items list */}
                {filteredItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Todos os Itens</h3>
                    <div className="space-y-2">
                      {filteredItems.map((item) => {
                        const st = STATUS_CONFIG[item.status ?? "idea"] ?? STATUS_CONFIG.idea;
                        return (
                          <Card key={item.id}>
                            <CardContent className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                    <Badge className={`text-[9px] shrink-0 ${st.color}`}>{st.label}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.content_type && (
                                      <span className="text-[10px] text-muted-foreground">{item.content_type}</span>
                                    )}
                                    {item.scheduled_date && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        {new Date(item.scheduled_date).toLocaleDateString("pt-BR")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredItems.length === 0 && !itemsLoading && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center py-16">
                      <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Nenhum item planejado</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Adicione itens ao calendário baseados nos aprendizados da análise.
                      </p>
                      <Button className="mt-4" size="sm" onClick={() => openNew(ch.value)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Criar Primeiro Item
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Item dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="bg-card sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v, content_type: "" }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(CONTENT_TYPES[form.channel] ?? []).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título do item" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o conteúdo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.channel === "instagram" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Copy / Legenda</Label>
                  <Textarea
                    value={form.copy_text}
                    onChange={(e) => setForm((f) => ({ ...f, copy_text: e.target.value }))}
                    placeholder="Texto da publicação..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hashtags (separadas por vírgula)</Label>
                  <Input
                    value={form.hashtags}
                    onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                    placeholder="#marca, #conteúdo"
                  />
                </div>
              </>
            )}

            {form.channel === "seo" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Keywords (separadas por vírgula)</Label>
                <Input
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  placeholder="palavra-chave 1, palavra-chave 2"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Público-alvo</Label>
              <Input
                value={form.target_audience}
                onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                placeholder="Ex: Mulheres 25-35, empreendedoras"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este item do planejamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
