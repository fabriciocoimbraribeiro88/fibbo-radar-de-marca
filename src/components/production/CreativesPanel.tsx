/**
 * Creatives panel extracted from ProjectCreatives.tsx for use inside
 * the unified Production page. This is a self-contained component that
 * renders the creative generation UI for a single calendar.
 */
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Paintbrush, Loader2, Check, RefreshCw, Bookmark, ImageIcon, Type, Copy, Sparkles,
} from "lucide-react";

interface Props {
  projectId: string;
  calendarId: string;
}

function getFormatAspect(format: string | null): string {
  const f = (format ?? "").toLowerCase();
  if (f.includes("stories") || f.includes("story") || f.includes("reel") || f.includes("reels")) {
    return "aspect-[9/16]";
  }
  return "aspect-square";
}

export default function CreativesPanel({ projectId, calendarId }: Props) {
  const queryClient = useQueryClient();
  const [generatingItems, setGeneratingItems] = useState<Record<string, string>>({});
  const [generatingCaptions, setGeneratingCaptions] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["creative-items", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", calendarId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((item) => {
        const md = (item.metadata as any) ?? {};
        return md.briefing_status === "approved";
      });
    },
  });

  const { data: creatives } = useQuery({
    queryKey: ["creative-outputs", projectId, items?.map((i) => i.id)],
    queryFn: async () => {
      if (!items?.length) return [];
      const { data, error } = await supabase
        .from("creative_outputs")
        .select("*")
        .eq("project_id", projectId)
        .in("planning_item_id", items.map((i) => i.id));
      if (error) throw error;
      return data;
    },
    enabled: !!items?.length,
  });

  const creativesMap = new Map((creatives ?? []).map((c) => [c.planning_item_id, c]));

  const generateCreative = async (itemId: string) => {
    setGeneratingItems((prev) => ({ ...prev, [itemId]: "a" }));
    try {
      let creative = creativesMap.get(itemId);
      if (!creative) {
        const { data, error } = await supabase
          .from("creative_outputs")
          .insert({ project_id: projectId, planning_item_id: itemId, status: "generating" })
          .select().single();
        if (error) throw error;
        creative = data;
      } else {
        await supabase.from("creative_outputs")
          .update({ status: "generating", option_a_url: null, option_b_url: null, selected_option: null })
          .eq("id", creative.id);
      }

      const resA = await supabase.functions.invoke("generate-creative", {
        body: { planning_item_id: itemId, project_id: projectId, variant: "a" },
      });
      if (resA.error) throw new Error(resA.error.message || "Erro ao gerar opção A");
      const urlA = resA.data?.url;

      setGeneratingItems((prev) => ({ ...prev, [itemId]: "b" }));

      const resB = await supabase.functions.invoke("generate-creative", {
        body: { planning_item_id: itemId, project_id: projectId, variant: "b" },
      });
      if (resB.error) throw new Error(resB.error.message || "Erro ao gerar opção B");
      const urlB = resB.data?.url;

      await supabase.from("creative_outputs")
        .update({ option_a_url: urlA, option_b_url: urlB, status: "generated" })
        .eq("id", creative!.id);

      toast({ title: "Criativos gerados!", description: "2 opções prontas para revisão." });
      queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar criativos", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setGeneratingItems((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
    }
  };

  const selectOption = async (creativeId: string, option: "a" | "b") => {
    const { error } = await supabase.from("creative_outputs").update({ selected_option: option, status: "selected" }).eq("id", creativeId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Opção ${option.toUpperCase()} selecionada!` });
    queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
  };

  const generateCaptions = async (creative: any, item: any) => {
    setGeneratingCaptions((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await supabase.functions.invoke("generate-creative-caption", {
        body: { planning_item_id: item.id, project_id: projectId, creative_id: creative.id },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao gerar legendas");
      toast({ title: "Legendas geradas!", description: "2 opções de legenda prontas para revisão." });
      queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar legendas", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setGeneratingCaptions((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  };

  const selectCaption = async (creativeId: string, option: "a" | "b") => {
    const { error } = await supabase.from("creative_outputs").update({ selected_caption: option } as any).eq("id", creativeId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Legenda ${option.toUpperCase()} selecionada!` });
    queryClient.invalidateQueries({ queryKey: ["creative-outputs"] });
  };

  const saveAsReference = async (creative: any, item: any) => {
    const imageUrl = creative.selected_option === "a" ? creative.option_a_url : creative.option_b_url;
    const captionText = creative.selected_caption === "a" ? creative.caption_a : creative.caption_b;
    const { error } = await supabase.from("brand_references").insert({
      project_id: projectId, type: "kv", title: item.title,
      description: captionText ?? item.description ?? item.copy_text ?? "",
      image_url: imageUrl, tags: ["criativo-gerado"],
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Salvo como referência!", description: "O criativo foi adicionado ao banco de referências da marca." });
  };

  const saveCaptionAsReference = async (creative: any, item: any, captionOption: "a" | "b") => {
    const captionText = captionOption === "a" ? creative.caption_a : creative.caption_b;
    const { error } = await supabase.from("brand_references").insert({
      project_id: projectId, type: "post_success", title: `Legenda: ${item.title}`,
      description: captionText ?? "", tags: ["legenda-gerada"],
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Legenda salva como referência!" });
  };

  const generateAll = useCallback(async () => {
    if (!items?.length) return;
    const pending = items.filter((item) => {
      const c = creativesMap.get(item.id);
      return !c?.option_a_url;
    });
    if (pending.length === 0) {
      toast({ title: "Todos os criativos já foram gerados." });
      return;
    }
    setGeneratingAll(true);
    let success = 0;
    for (const item of pending) {
      try {
        await generateCreative(item.id);
        success++;
      } catch {
        // individual errors already toasted
      }
    }
    setGeneratingAll(false);
    if (success > 0) {
      toast({ title: `${success} criativo(s) gerado(s)!` });
    }
  }, [items, creativesMap, generateCreative]);

  if (!items || items.length === 0) {
    return (
      <Card className="card-flat border-dashed">
        <CardContent className="flex flex-col items-center py-16">
          <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nenhum briefing aprovado</p>
          <p className="mt-1 text-xs text-muted-foreground">Aprove briefings primeiro na etapa anterior.</p>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = items.filter((item) => !creativesMap.get(item.id)?.option_a_url).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Gere e selecione criativos para cada briefing aprovado.</p>
        {pendingCount > 0 && (
          <Button
            onClick={generateAll}
            disabled={generatingAll || Object.keys(generatingItems).length > 0}
            className="gradient-coral text-white"
          >
            {generatingAll ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando {items.length - pendingCount + 1}/{items.length}…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Gerar Todos ({pendingCount})</>
            )}
          </Button>
        )}
      </div>
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
                    {item.format && <Badge variant="secondary" className="text-[10px]">{item.format}</Badge>}
                    {item.channel && <Badge variant="secondary" className="text-[10px]">{item.channel}</Badge>}
                    {item.scheduled_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.scheduled_date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {item.copy_text && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.copy_text}</p>}
                </div>
                <Button
                  size="sm"
                  onClick={() => generateCreative(item.id)}
                  disabled={isGenerating}
                  className={creative?.status === "generated" || creative?.status === "selected" ? "border-border/40" : "gradient-coral text-white"}
                  variant={creative?.status === "generated" || creative?.status === "selected" ? "outline" : "default"}
                >
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando {generatingPhase === "a" ? "A" : "B"}…</>
                  ) : creative?.option_a_url ? (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Refazer</>
                  ) : (
                    <><Paintbrush className="mr-2 h-4 w-4" /> Gerar Criativos</>
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
                      <div key={opt} className={`relative rounded-xl overflow-hidden border-2 transition-all ${isSelected ? "border-primary shadow-md" : "border-border/30 hover:border-border/60"}`}>
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className={`text-[10px] ${isSelected ? "bg-primary text-white" : "bg-card/80 backdrop-blur-sm"}`}>
                            Opção {opt.toUpperCase()}
                          </Badge>
                        </div>
                        <img src={url!} alt={`Opção ${opt.toUpperCase()}`} className={`w-full object-cover ${getFormatAspect(item.format)}`} />
                        <div className="p-3 flex items-center gap-2">
                          <Button size="sm" variant={isSelected ? "default" : "outline"} className={isSelected ? "gradient-coral text-white" : ""} onClick={() => selectOption(creative.id, opt)} disabled={isSelected}>
                            {isSelected ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Selecionado</> : "Selecionar"}
                          </Button>
                          {isSelected && (
                            <Button size="sm" variant="ghost" onClick={() => saveAsReference(creative, item)}>
                              <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Referência
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Caption generation */}
              {creative?.selected_option && (
                <div className="mt-5 border-t pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5" /> Legendas
                    </h4>
                    <Button size="sm" variant={creative.caption_a ? "outline" : "default"} className={creative.caption_a ? "border-border/40" : "gradient-coral text-white"} onClick={() => generateCaptions(creative, item)} disabled={!!generatingCaptions[item.id]}>
                      {generatingCaptions[item.id] ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</> : creative.caption_a ? <><RefreshCw className="mr-2 h-4 w-4" /> Refazer</> : <><Type className="mr-2 h-4 w-4" /> Gerar Legendas</>}
                    </Button>
                  </div>

                  {generatingCaptions[item.id] && !creative.caption_a && (
                    <div className="flex items-center justify-center py-10 rounded-xl bg-accent/30">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Gerando legendas com base no contexto da marca…</p>
                      </div>
                    </div>
                  )}

                  {creative.caption_a && creative.caption_b && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(["a", "b"] as const).map((opt) => {
                        const caption = opt === "a" ? creative.caption_a : creative.caption_b;
                        const isCaptionSelected = creative.selected_caption === opt;
                        return (
                          <div key={opt} className={`relative rounded-xl border-2 p-4 transition-all ${isCaptionSelected ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"}`}>
                            <Badge className={`mb-2 text-[10px] ${isCaptionSelected ? "bg-primary text-white" : "bg-muted"}`}>
                              Legenda {opt.toUpperCase()}
                            </Badge>
                            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed mb-3">{caption}</p>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant={isCaptionSelected ? "default" : "outline"} className={isCaptionSelected ? "gradient-coral text-white" : ""} onClick={() => selectCaption(creative.id, opt)} disabled={isCaptionSelected}>
                                {isCaptionSelected ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Selecionada</> : "Selecionar"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => saveCaptionAsReference(creative, item, opt)}>
                                <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Referência
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(caption); toast({ title: "Legenda copiada!" }); }}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {isGenerating && !creative?.option_a_url && (
                <div className="mt-4 flex items-center justify-center py-16 rounded-xl bg-accent/30">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Gerando opção {generatingPhase === "a" ? "A" : "B"}…</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
