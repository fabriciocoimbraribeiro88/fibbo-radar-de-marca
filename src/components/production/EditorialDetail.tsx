import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Loader2,
  ArrowRight,
  FileText,
  CalendarDays,
  Users,
  LayoutGrid,
  Clock,
} from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  social: "📱 Social",
  instagram: "📱 Instagram",
  ads: "📢 Ads",
  seo: "🔍 SEO",
};

const FORMAT_COLORS: Record<string, string> = {
  Reels: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Carrossel: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Estático": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Stories: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

interface Props {
  projectId: string;
  calendarId: string;
  onAdvance: () => void;
}

export default function EditorialDetail({ projectId, calendarId, onAdvance }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editPeriodStart, setEditPeriodStart] = useState<string | null>(null);
  const [editPeriodEnd, setEditPeriodEnd] = useState<string | null>(null);

  const { data: calendar, isLoading } = useQuery({
    queryKey: ["calendar-detail", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("id", calendarId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch analysis base
  const { data: analysis } = useQuery({
    queryKey: ["analysis-base", calendar?.generated_from_analysis],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, type, status, period_start, period_end")
        .eq("id", calendar!.generated_from_analysis!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!calendar?.generated_from_analysis,
  });

  const { data: items } = useQuery({
    queryKey: ["planning-items-summary", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("id, title, format, scheduled_date, scheduled_time, status, metadata, channel")
        .eq("calendar_id", calendarId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !calendar) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const title = editTitle ?? calendar.title;
  const periodStart = editPeriodStart ?? calendar.period_start ?? "";
  const periodEnd = editPeriodEnd ?? calendar.period_end ?? "";
  const hasChanges =
    (editTitle !== null && editTitle !== calendar.title) ||
    (editPeriodStart !== null && editPeriodStart !== (calendar.period_start ?? "")) ||
    (editPeriodEnd !== null && editPeriodEnd !== (calendar.period_end ?? ""));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (editTitle !== null) updates.title = editTitle;
      if (editPeriodStart !== null) updates.period_start = editPeriodStart;
      if (editPeriodEnd !== null) updates.period_end = editPeriodEnd;

      const { error } = await supabase
        .from("planning_calendars")
        .update(updates)
        .eq("id", calendarId);
      if (error) throw error;

      toast({ title: "Planejamento atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["calendar-detail", calendarId] });
      queryClient.invalidateQueries({ queryKey: ["planning-calendars", projectId] });
      setEditTitle(null);
      setEditPeriodStart(null);
      setEditPeriodEnd(null);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Compute format mix
  const formatCounts: Record<string, number> = {};
  for (const item of items ?? []) {
    const fmt = item.format ?? "Outro";
    formatCounts[fmt] = (formatCounts[fmt] ?? 0) + 1;
  }
  const totalItems = items?.length ?? 0;

  // Compute colabs from items metadata
  const colabSet = new Set<string>();
  for (const item of items ?? []) {
    const md = item.metadata as any;
    if (md?.responsible) colabSet.add(md.responsible);
    if (md?.colab_handle) colabSet.add(md.colab_handle);
  }

  // Compute weeks
  const weeks =
    periodStart && periodEnd
      ? Math.max(1, Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : null;

  const postsPerWeek = weeks && totalItems > 0 ? Math.round(totalItems / weeks) : null;

  // Unique scheduled dates
  const uniqueDates = new Set((items ?? []).map((i) => i.scheduled_date).filter(Boolean));

  return (
    <div className="space-y-5">
      {/* Title & Period - Editable */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Título do Planejamento</Label>
            <Input
              value={title}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Início do Período</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setEditPeriodStart(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Fim do Período</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setEditPeriodEnd(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="mr-1.5 h-3.5 w-3.5" /> Salvar Alterações</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Analysis base */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Análise Base</span>
            </div>
            <p className="text-xs font-medium text-foreground line-clamp-2">
              {analysis?.title ?? "Não vinculada"}
            </p>
            {analysis?.status && (
              <Badge variant="outline" className="mt-1.5 text-[9px]">
                {analysis.status === "approved" ? "Aprovada" : analysis.status}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Channel */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Canal</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {CHANNEL_LABELS[calendar.type ?? "social"] ?? calendar.type}
            </p>
          </CardContent>
        </Card>

        {/* Volume */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Volume</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{totalItems} posts</p>
            {postsPerWeek !== null && weeks !== null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ~{postsPerWeek}/semana · {weeks} semanas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Colabs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Colabs</span>
            </div>
            {colabSet.size > 0 ? (
              <div className="flex flex-wrap gap-1">
                {Array.from(colabSet).map((c) => (
                  <Badge key={c} variant="secondary" className="text-[9px]">{c}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum colab</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Format mix */}
      {Object.keys(formatCounts).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Mix de Formatos</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(formatCounts).map(([fmt, count]) => {
                const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                const colorClass = FORMAT_COLORS[fmt] ?? "bg-muted text-muted-foreground";
                return (
                  <div
                    key={fmt}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${colorClass}`}
                  >
                    <span>{fmt}</span>
                    <span className="opacity-70">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts list */}
      {items && items.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Posts ({items.length})</h3>
              <span className="text-[10px] text-muted-foreground">{uniqueDates.size} dias com publicação</span>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {items.map((item) => {
                const colorClass = FORMAT_COLORS[item.format ?? ""] ?? "";
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 border-b border-border last:border-0"
                  >
                    <Badge className={`text-[9px] shrink-0 border-0 ${colorClass || "bg-secondary text-secondary-foreground"}`}>
                      {item.format ?? "—"}
                    </Badge>
                    <span className="text-xs text-foreground line-clamp-1 flex-1">{item.title}</span>
                    {item.scheduled_date && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                        {item.scheduled_time && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {String(item.scheduled_time).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advance button */}
      <div className="flex justify-end pt-2">
        <Button size="lg" onClick={onAdvance} disabled={totalItems === 0}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Avançar para Títulos
        </Button>
      </div>
    </div>
  );
}
