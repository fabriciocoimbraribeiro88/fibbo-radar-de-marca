import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, X, Tag, Globe, Megaphone, Ban, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface HashtagData {
  proprietary: string[];
  community: string[];
  reach: string[];
  forbidden: string[];
}

interface Props {
  projectId: string;
  briefing: any;
}

const CATEGORIES: { key: keyof HashtagData; label: string; icon: React.ElementType; description: string }[] = [
  { key: "proprietary", label: "Hashtags Proprietárias", icon: Tag, description: "Únicas da marca" },
  { key: "community", label: "Hashtags de Comunidade", icon: Globe, description: "Do nicho/setor" },
  { key: "reach", label: "Hashtags de Alcance", icon: Megaphone, description: "Para descoberta" },
  { key: "forbidden", label: "Hashtags Proibidas", icon: Ban, description: "Nunca usar" },
];

const emptyData: HashtagData = { proprietary: [], community: [], reach: [], forbidden: [] };

export default function HashtagStrategy({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [data, setData] = useState<HashtagData>(briefing?.hashtag_strategy ?? emptyData);
  const [inputs, setInputs] = useState<Record<string, string>>({ proprietary: "", community: "", reach: "", forbidden: "" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<HashtagData>(emptyData);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setData(briefing?.hashtag_strategy ?? emptyData);
  }, [briefing]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const save = useCallback(async (d: HashtagData) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), hashtag_strategy: d };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((d: HashtagData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(d), 2000);
  }, [save]);

  const addTag = (cat: keyof HashtagData) => {
    const val = inputs[cat]?.trim().replace(/^#/, "");
    if (!val || data[cat].length >= 30) return;
    if (data[cat].includes(`#${val}`)) return;
    const next = { ...data, [cat]: [...data[cat], `#${val}`] };
    setData(next);
    setInputs((p) => ({ ...p, [cat]: "" }));
    schedSave(next);
  };

  const removeTag = (cat: keyof HashtagData, tag: string) => {
    const next = { ...data, [cat]: data[cat].filter((t) => t !== tag) };
    setData(next);
    schedSave(next);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-hashtag-strategy", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const strat = result.strategy ?? {};
      setPreview({
        proprietary: strat.proprietary ?? [],
        community: strat.community ?? [],
        reach: strat.reach ?? [],
        forbidden: strat.forbidden ?? [],
      });
      setDialogOpen(true);
    } catch (e) {
      toast.error("Erro ao gerar hashtags: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const applyPreview = () => {
    setData(preview);
    save(preview);
    setDialogOpen(false);
    toast.success("Estratégia de hashtags aplicada!");
  };

  const totalTags = data.proprietary.length + data.community.length + data.reach.length + data.forbidden.length;

  return (
    <>
      <div className="card-flat p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Estratégia de Hashtags</h3>
            <Badge variant="secondary" className="text-xs">{totalTags}</Badge>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {!saving && totalTags > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Gerar com IA
          </Button>
        </div>

        <div className="space-y-5">
          {CATEGORIES.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">— {description}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{data[key].length}/30</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inputs[key]}
                  onChange={(e) => setInputs((p) => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(key))}
                  placeholder="#hashtag"
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => addTag(key)} disabled={data[key].length >= 30}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {data[key].length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data[key].map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
                      {tag}
                      <button onClick={() => removeTag(key, tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estratégia de Hashtags Sugerida</DialogTitle>
            <DialogDescription>Revise as sugestões antes de aplicar. Isso substituirá as hashtags atuais.</DialogDescription>
          </DialogHeader>
          {(preview as any).justification && (
            <p className="text-xs text-primary/80 italic bg-primary/5 rounded-lg p-3">💡 {(preview as any).justification}</p>
          )}
          <div className="space-y-4">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(preview[key] ?? []).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  {(preview[key] ?? []).length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhuma sugestão</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={applyPreview}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
