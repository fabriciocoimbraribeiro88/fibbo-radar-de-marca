import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, CalendarDays, Instagram, Megaphone, Search } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  social: "📱 Social",
  instagram: "📱 Instagram",
  ads: "📢 Ads",
  seo: "🔍 SEO",
};

interface Props {
  projectId: string;
  calendarId: string;
}

export default function EditorialDetail({ projectId, calendarId }: Props) {
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

  const { data: items } = useQuery({
    queryKey: ["planning-items-summary", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("id, title, format, scheduled_date, scheduled_time, status")
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

  const formatCounts: Record<string, number> = {};
  for (const item of items ?? []) {
    const fmt = item.format ?? "Outro";
    formatCounts[fmt] = (formatCounts[fmt] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Editable fields */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Título</Label>
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
            <div className="flex justify-end pt-2">
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

      {/* Summary */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canal</span>
              <span className="font-medium">{CHANNEL_LABELS[calendar.type ?? "social"] ?? calendar.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-[10px]">
                {calendar.status === "draft" ? "Rascunho" : calendar.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de Posts</span>
              <span className="font-medium">{items?.length ?? 0}</span>
            </div>
            {Object.keys(formatCounts).length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mix de Formatos</span>
                <span className="font-medium text-right">
                  {Object.entries(formatCounts).map(([k, v]) => `${k} (${v})`).join(" · ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em</span>
              <span className="font-medium">
                {calendar.created_at
                  ? new Date(calendar.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts list */}
      {items && items.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Posts ({items.length})</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {item.format ?? "—"}
                  </Badge>
                  <span className="text-xs text-foreground line-clamp-1 flex-1">{item.title}</span>
                  {item.scheduled_date && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
