import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Paintbrush,
  CalendarDays,
  Instagram,
  Megaphone,
  Search,
  Loader2,
  Check,
  RefreshCw,
  Bookmark,
  ArrowLeft,
  ImageIcon,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, typeof Instagram> = {
  social: Instagram,
  instagram: Instagram,
  ads: Megaphone,
  seo: Search,
};

export default function ProjectCreatives() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);
  const [generatingItems, setGeneratingItems] = useState<Record<string, string>>({});

  // Calendars with approved briefings
  const { data: calendars, isLoading } = useQuery({
    queryKey: ["creatives-calendars", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("project_id", projectId!)
        .in("status", ["briefings_review", "approved", "active"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Items for active calendar
  const { data: items } = useQuery({
    queryKey: ["creative-items", activeCalendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", activeCalendarId!)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      // Filter to items with approved briefings
      return (data ?? []).filter((item) => {
        const md = (item.metadata as any) ?? {};
        return md.briefing_status === "approved";
      });
    },
    enabled: !!activeCalendarId,
  });

  // Creative outputs for these items
  const { data: creatives } = useQuery({
    queryKey: ["creative-outputs", projectId, items?.map((i) => i.id)],
    queryFn: async () => {
      if (!items?.length) return [];
      const { data, error } = await supabase
        .from("creative_outputs")
        .select("*")
        .eq("project_id", projectId!)
        .in("planning_item_id", items.map((i) => i.id));
      if (error) throw error;
      return data;
    },
    enabled: !!items?.length,
  });

  const creativesMap = new Map(
    (creatives ?? []).map((c) => [c.planning_item_id, c])
  );

  const generateCreative = async (itemId: string) => {
    if (!projectId) return;
    setGeneratingItems((prev) => ({ ...prev, [itemId]: "a" }));

    try {
      // Create or get creative_outputs record
      let creative = creativesMap.get(itemId);
      if (!creative) {
        const { data, error } = await supabase
          .from("creative_outputs")
          .insert({ project_id: projectId, planning_item_id: itemId, status: "generating" })
          .select()
          .single();
        if (error) throw error;
        creative = data;
      } else {
        await supabase
          .from("creative_outputs")
          .update({ status: "generating", option_a_url: null, option_b_url: null, selected_option: null })
          .eq("id", creative.id);
      }

      // Generate option A
      const resA = await supabase.functions.invoke("generate-creative", {
        body: { planning_item_id: itemId, project_id: projectId, variant: "a" },
      });
      if (resA.error) throw new Error(resA.error.message || "Erro ao gerar opção A");
      const urlA = resA.data?.url;

      setGeneratingItems((prev) => ({ ...prev, [itemId]: "b" }));

      // Generate option B
      const resB = await supabase.functions.invoke("generate-creative", {
        body: { planning_item_id: itemId, project_id: projectId, variant: "b" },
      });
      if (resB.error) throw new Error(resB.error.message || "Erro ao gerar opção B");
      const urlB = resB.data?.url;

      // Update record
      await supabase
        .from("creative_outputs")
        .update({ option_a_url: urlA, option_b_url: urlB, status: "generated" })
        .eq("id", creative!.id);

      toast({ title: "Criativos gerados!", description: "2 opções prontas para revisão." });
      queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar criativos", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setGeneratingItems((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  const selectOption = async (creativeId: string, option: "a" | "b") => {
    const { error } = await supabase
      .from("creative_outputs")
      .update({ selected_option: option, status: "selected" })
      .eq("id", creativeId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Opção ${option.toUpperCase()} selecionada!` });
    queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
  };

  const saveAsReference = async (creative: any, item: any) => {
    const imageUrl = creative.selected_option === "a" ? creative.option_a_url : creative.option_b_url;
    const { error } = await supabase.from("brand_references").insert({
      project_id: projectId!,
      type: "kv",
      title: item.title,
      description: item.description ?? item.copy_text ?? "",
      image_url: imageUrl,
      tags: ["criativo-gerado"],
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Salvo como referência!", description: "O criativo foi adicionado ao banco de referências da marca." });
  };

  if (!projectId) return null;

  // Calendar detail view
  if (activeCalendarId) {
    const cal = calendars?.find((c) => c.id === activeCalendarId);
    return (
      <div className="max-w-6xl animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => setActiveCalendarId(null)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="page-title mb-1">{cal?.title ?? "Criativos"}</h1>
        <p className="page-subtitle mb-6">Gere e selecione criativos para cada briefing aprovado.</p>

        {(!items || items.length === 0) ? (
          <Card className="card-flat border-dashed">
            <CardContent className="flex flex-col items-center py-16">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Nenhum briefing aprovado</p>
              <p className="mt-1 text-xs text-muted-foreground">Aprove briefings primeiro na seção de Briefings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {items.map((item) => {
              const creative = creativesMap.get(item.id);
              const isGenerating = !!generatingItems[item.id];
              const generatingPhase = generatingItems[item.id];

              return (
                <Card key={item.id} className="card-flat overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.format && (
                            <Badge variant="secondary" className="text-[10px]">{item.format}</Badge>
                          )}
                          {item.channel && (
                            <Badge variant="secondary" className="text-[10px]">{item.channel}</Badge>
                          )}
                          {item.scheduled_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.scheduled_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        {item.copy_text && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.copy_text}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateCreative(item.id)}
                        disabled={isGenerating}
                        className={creative?.status === "generated" || creative?.status === "selected"
                          ? "border-border/40"
                          : "gradient-coral text-white"}
                        variant={creative?.status === "generated" || creative?.status === "selected" ? "outline" : "default"}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando {generatingPhase === "a" ? "A" : "B"}…
                          </>
                        ) : creative?.option_a_url ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" /> Refazer
                          </>
                        ) : (
                          <>
                            <Paintbrush className="mr-2 h-4 w-4" /> Gerar Criativos
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Image options */}
                    {creative?.option_a_url && creative?.option_b_url && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {(["a", "b"] as const).map((opt) => {
                          const url = opt === "a" ? creative.option_a_url : creative.option_b_url;
                          const isSelected = creative.selected_option === opt;
                          return (
                            <div
                              key={opt}
                              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? "border-primary shadow-md"
                                  : "border-border/30 hover:border-border/60"
                              }`}
                            >
                              <div className="absolute top-2 left-2 z-10">
                                <Badge className={`text-[10px] ${isSelected ? "bg-primary text-white" : "bg-card/80 backdrop-blur-sm"}`}>
                                  Opção {opt.toUpperCase()}
                                </Badge>
                              </div>
                              <img
                                src={url!}
                                alt={`Opção ${opt.toUpperCase()}`}
                                className="w-full aspect-square object-cover"
                              />
                              <div className="p-3 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  className={isSelected ? "gradient-coral text-white" : ""}
                                  onClick={() => selectOption(creative.id, opt)}
                                  disabled={isSelected}
                                >
                                  {isSelected ? (
                                    <><Check className="mr-1.5 h-3.5 w-3.5" /> Selecionado</>
                                  ) : (
                                    "Selecionar"
                                  )}
                                </Button>
                                {isSelected && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => saveAsReference(creative, item)}
                                  >
                                    <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Referência
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isGenerating && !creative?.option_a_url && (
                      <div className="mt-4 flex items-center justify-center py-16 rounded-xl bg-accent/30">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Gerando opção {generatingPhase === "a" ? "A" : "B"}…
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            Isso pode levar alguns segundos
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Calendar list
  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Criativos</h1>
        <p className="page-subtitle">
          Gere imagens conceito para cada briefing aprovado usando IA.
        </p>
      </div>

      {(!calendars || calendars.length === 0) ? (
        <Card className="border-dashed card-flat">
          <CardContent className="flex flex-col items-center py-16">
            <Paintbrush className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum planejamento disponível</p>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              Crie um planejamento e aprove os briefings para gerar criativos.
            </p>
            <Link to={`/projects/${projectId}/briefings`}>
              <Button className="mt-4" variant="outline">
                <CalendarDays className="mr-2 h-4 w-4" />
                Ir para Briefings
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calendars.map((cal) => {
            const ChannelIcon = CHANNEL_ICONS[cal.type ?? "social"] ?? CalendarDays;
            return (
              <Card
                key={cal.id}
                className="card-interactive"
                onClick={() => setActiveCalendarId(cal.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <ChannelIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{cal.title}</p>
                      {cal.period_start && cal.period_end && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(cal.period_start).toLocaleDateString("pt-BR")} – {new Date(cal.period_end).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Ver briefings
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
