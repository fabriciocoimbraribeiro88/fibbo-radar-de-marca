import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, CalendarDays, List, Columns3, Download, Plus, FileSpreadsheet, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PlanningItemDialog from "./PlanningItemDialog";

const STATUS_FLOW: Record<string, { label: string; color: string; emoji: string }> = {
  idea: { label: "Ideia", color: "bg-muted text-muted-foreground", emoji: "📝" },
  briefed: { label: "Briefado", color: "bg-blue-500/15 text-blue-600", emoji: "📋" },
  in_production: { label: "Em Produção", color: "bg-amber-500/15 text-amber-600", emoji: "🎨" },
  review: { label: "Revisão", color: "bg-purple-500/15 text-purple-600", emoji: "👀" },
  approved: { label: "Aprovado", color: "bg-green-500/15 text-green-600", emoji: "✅" },
  published: { label: "Publicado", color: "bg-green-700/15 text-green-700", emoji: "📤" },
};

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Props {
  projectId: string;
  calendarId: string;
  onBack: () => void;
}

export default function CalendarFinalView({ projectId, calendarId, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "kanban">("list");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: calendar } = useQuery({
    queryKey: ["planning-calendar", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase.from("planning_calendars").select("*").eq("id", calendarId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["planning-items-final", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", calendarId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateItemStatus = async (itemId: string, status: string) => {
    await supabase.from("planning_items").update({ status }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["planning-items-final", calendarId] });
  };

  // Calendar grid helpers
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();
  const getItemsForDay = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return items?.filter((i) => i.scheduled_date === dateStr) ?? [];
  };

  // Export functions
  const exportCSV = () => {
    if (!items) return;
    const rows = [["Data", "Dia", "Horário", "Pilar", "Formato", "Responsável", "Tema", "Status"].join(",")];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (const item of items) {
      const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
      rows.push([
        date ? date.toLocaleDateString("pt-BR") : "",
        date ? dayNames[date.getDay()] : "",
        item.scheduled_time ?? "",
        item.content_type ?? "",
        item.format ?? "",
        (item.metadata as any)?.responsible_code ?? "",
        `"${(item.title ?? "").replace(/"/g, '""')}"`,
        STATUS_FLOW[item.status ?? "idea"]?.label ?? item.status,
      ].join(","));
    }
    rows.push("");
    rows.push(`"Calendário gerado por FibboMetrics — Inteligência Competitiva com IA"`);
    rows.push(`"Data de geração: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}"`);
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${calendar?.title ?? "calendario"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Calendário exportado!" });
  };

  const exportMarkdown = () => {
    if (!items) return;
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let md = `# Briefings de Conteúdo — ${calendar?.title ?? ""}\n\n`;
    items.forEach((item, idx) => {
      const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
      const metadata = (item.metadata as any) ?? {};
      md += `## POST ${idx + 1}\n`;
      md += `- **Data:** ${date ? date.toLocaleDateString("pt-BR") : "—"} (${date ? dayNames[date.getDay()] : "—"})\n`;
      md += `- **Horário:** ${item.scheduled_time ?? "—"}\n`;
      md += `- **Pilar:** ${item.content_type ?? "—"}\n`;
      md += `- **Formato:** ${item.format ?? "—"}\n`;
      md += `- **Responsável:** ${metadata.responsible_code ?? "—"}\n\n`;
      if (metadata.objective) md += `**Objetivo:** ${metadata.objective}\n\n`;
      if (metadata.concept) md += `**Conceito:** ${metadata.concept}\n\n`;
      if (item.copy_text) md += `**Caption:** ${item.copy_text}\n\n`;
      if (item.theme) md += `**CTA:** ${item.theme}\n\n`;
      if (item.hashtags?.length) md += `**Hashtags:** ${item.hashtags.join(" ")}\n\n`;
      if (item.visual_brief) md += `**Brief Visual:** ${item.visual_brief}\n\n`;
      md += `---\n\n`;
    });
    md += `*Briefings gerados por FibboMetrics — Inteligência Competitiva com IA*\n`;
    md += `*Data: ${new Date().toLocaleDateString("pt-BR")}*\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `briefings-${calendar?.title ?? "conteudo"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Briefings exportados!" });
  };

  const copyToClipboard = () => {
    if (!items) return;
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let text = `${calendar?.title ?? "Calendário"}\n\n`;
    text += "Data | Dia | Horário | Pilar | Formato | Resp. | Tema | Status\n";
    text += "---|---|---|---|---|---|---|---\n";
    for (const item of items) {
      const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
      text += [
        date ? date.toLocaleDateString("pt-BR") : "—",
        date ? dayNames[date.getDay()] : "—",
        item.scheduled_time ?? "—",
        item.content_type ?? "—",
        item.format ?? "—",
        (item.metadata as any)?.responsible_code ?? "—",
        item.title,
        STATUS_FLOW[item.status ?? "idea"]?.label ?? item.status,
      ].join(" | ") + "\n";
    }
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para o clipboard!" });
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{calendar?.title ?? "Calendário"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{items?.length ?? 0} posts aprovados</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="mr-1 h-3.5 w-3.5" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportCSV}><FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Exportar Calendário (Excel)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportMarkdown}><FileText className="mr-2 h-3.5 w-3.5" /> Exportar Briefings (Markdown)</DropdownMenuItem>
                <DropdownMenuItem onClick={copyToClipboard}><Copy className="mr-2 h-3.5 w-3.5" /> Copiar Calendário</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Calendário</TabsTrigger>
          <TabsTrigger value="list" className="gap-1"><List className="h-3.5 w-3.5" /> Lista</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1"><Columns3 className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => { if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); } else setSelectedMonth((m) => m - 1); }}>←</Button>
            <span className="text-sm font-medium">{MONTHS_SHORT[selectedMonth]} {selectedYear}</span>
            <Button variant="ghost" size="sm" onClick={() => { if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); } else setSelectedMonth((m) => m + 1); }}>→</Button>
          </div>
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="min-h-[72px]" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayItems = getItemsForDay(day);
                  const isToday = day === new Date().getDate() && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
                  return (
                    <div key={day} className={`min-h-[72px] border border-border rounded p-1 ${isToday ? "bg-primary/5 ring-1 ring-primary/30" : "hover:bg-accent/30"}`}>
                      <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayItems.slice(0, 2).map((item) => (
                          <button key={item.id} onClick={() => setEditingItem(item)} className="w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            {item.title}
                          </button>
                        ))}
                        {dayItems.length > 2 && <span className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - 2}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Pilar</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Formato</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Resp.</th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">Tema</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => {
                    const st = STATUS_FLOW[item.status ?? "idea"] ?? STATUS_FLOW.idea;
                    const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
                    return (
                      <tr key={item.id} className="border-b hover:bg-accent/30 cursor-pointer" onClick={() => setEditingItem(item)}>
                        <td className="p-2"><Badge className={`text-[9px] ${st.color}`}>{st.emoji} {st.label}</Badge></td>
                        <td className="p-2 text-xs">{date ? date.toLocaleDateString("pt-BR") : "—"} {item.scheduled_time ?? ""}</td>
                        <td className="p-2"><Badge variant="secondary" className="text-[9px]">{item.content_type ?? "—"}</Badge></td>
                        <td className="p-2 text-xs">{item.format ?? "—"}</td>
                        <td className="p-2 text-xs font-mono">{(item.metadata as any)?.responsible_code ?? "—"}</td>
                        <td className="p-2 text-xs font-medium">{item.title}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Kanban View */}
        <TabsContent value="kanban">
          <div className="grid grid-cols-6 gap-3">
            {Object.entries(STATUS_FLOW).map(([key, st]) => {
              const columnItems = items?.filter((i) => (i.status ?? "idea") === key) ?? [];
              return (
                <div key={key}>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs">{st.emoji}</span>
                    <span className="text-xs font-medium text-foreground">{st.label}</span>
                    <Badge variant="secondary" className="text-[9px] ml-auto">{columnItems.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {columnItems.map((item) => (
                      <Card key={item.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setEditingItem(item)}>
                        <CardContent className="p-2">
                          <p className="text-[10px] font-medium text-foreground line-clamp-2">{item.title}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 pt-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Planejamento gerado por <span className="font-semibold text-foreground">FibboMetrics</span> — Inteligência Competitiva com IA
          {` · ${new Date().toLocaleDateString("pt-BR")}`}
        </p>
      </div>

      {editingItem && (
        <PlanningItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSave={async (updates) => {
            await supabase.from("planning_items").update(updates).eq("id", editingItem.id);
            queryClient.invalidateQueries({ queryKey: ["planning-items-final", calendarId] });
            setEditingItem(null);
          }}
          onStatusChange={async (status) => {
            await updateItemStatus(editingItem.id, status);
            setEditingItem(null);
          }}
        />
      )}
    </>
  );
}
