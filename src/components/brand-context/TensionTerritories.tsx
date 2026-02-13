import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  pole_a: string;
  pole_b: string;
  description: string;
  brand_position: string;
  related_pillar: string;
}

interface Props {
  projectId: string;
  briefing: any;
}

function newTerritory(): Territory {
  return {
    id: crypto.randomUUID(),
    name: "",
    pole_a: "",
    pole_b: "",
    description: "",
    brand_position: "",
    related_pillar: "",
  };
}

export default function TensionTerritories({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [territories, setTerritories] = useState<Territory[]>(briefing?.tension_territories ?? []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTerritories(briefing?.tension_territories ?? []);
  }, [briefing]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(async (data: Territory[]) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), tension_territories: data };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((data: Territory[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(data), 2000);
  }, [save]);

  const updateTerritory = (id: string, field: keyof Territory, value: string) => {
    setTerritories((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        if (field === "pole_a" || field === "pole_b") {
          updated.name = `${updated.pole_a} vs. ${updated.pole_b}`;
        }
        return updated;
      });
      schedSave(next);
      return next;
    });
  };

  const addTerritory = () => {
    if (territories.length >= 5) return;
    const next = [...territories, newTerritory()];
    setTerritories(next);
    schedSave(next);
  };

  const removeTerritory = (id: string) => {
    const next = territories.filter((t) => t.id !== id);
    setTerritories(next);
    schedSave(next);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const pillars = briefing?.content_pillars ?? [];
      if (pillars.length === 0) {
        toast.error("Defina os Pilares de Conteúdo primeiro para gerar Territórios de Tensão.");
        return;
      }

      const { data: project } = await supabase.from("projects").select("brand_name, segment, target_audience, tone_of_voice, brand_description").eq("id", projectId).single();

      const prompt = `Transforme os pilares de conteúdo genéricos em Territórios de Tensão — dualidades, paradoxos ou debates culturais onde a marca tem o direito de opinar.

MARCA: ${project?.brand_name ?? "—"}
SEGMENTO: ${project?.segment ?? "—"}
PÚBLICO-ALVO: ${project?.target_audience ?? "—"}
TOM DE VOZ: ${project?.tone_of_voice ?? "—"}
DESCRIÇÃO: ${project?.brand_description ?? "—"}

PILARES ATUAIS:
${pillars.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.percentage}%) — ${p.description ?? "—"}`).join("\n")}

Para cada pilar, pergunte: "Qual é a tensão central aqui? Qual é o debate, a contradição ou o paradoxo que a maioria das pessoas sente mas não consegue articular?"

Transforme cada pilar em uma dualidade no formato "Polo A vs. Polo B".

Responda APENAS com JSON válido:
{
  "territories": [
    {
      "pole_a": "Polo positivo/aspiracional",
      "pole_b": "Polo negativo/realista",
      "description": "Pergunta de tensão que articula o debate (1 frase)",
      "brand_position": "Como a marca se posiciona nesta tensão (1-2 frases)",
      "related_pillar": "Nome do pilar original"
    }
  ]
}`;

      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const { data, error } = await supabase.functions.invoke("generate-content-pillars", {
        body: {
          project_id: projectId,
          custom_prompt: prompt,
          custom_response_key: "territories",
        },
      });

      // Fallback: generate locally via edge function call
      if (error || !data?.territories) {
        // Use a simpler approach - call the AI gateway directly from the edge function
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-content-pillars`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "apikey": apiKey,
          },
          body: JSON.stringify({
            project_id: projectId,
            mode: "tension_territories",
          }),
        });
        const result = await res.json();
        if (result.territories) {
          const incoming: Territory[] = result.territories.map((t: any) => ({
            id: crypto.randomUUID(),
            name: `${t.pole_a} vs. ${t.pole_b}`,
            pole_a: t.pole_a,
            pole_b: t.pole_b,
            description: t.description ?? "",
            brand_position: t.brand_position ?? "",
            related_pillar: t.related_pillar ?? "",
          }));
          setTerritories(incoming);
          save(incoming);
          toast.success("Territórios de Tensão gerados!");
          return;
        }
      }

      if (data?.territories) {
        const incoming: Territory[] = data.territories.map((t: any) => ({
          id: crypto.randomUUID(),
          name: `${t.pole_a} vs. ${t.pole_b}`,
          pole_a: t.pole_a,
          pole_b: t.pole_b,
          description: t.description ?? "",
          brand_position: t.brand_position ?? "",
          related_pillar: t.related_pillar ?? "",
        }));
        setTerritories(incoming);
        save(incoming);
        toast.success("Territórios de Tensão gerados!");
      } else {
        throw new Error("Não foi possível gerar territórios");
      }
    } catch (e) {
      toast.error("Erro ao gerar: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Territórios de Tensão
            </CardTitle>
            <CardDescription>
              Dualidades, paradoxos e debates onde a marca tem o direito de opinar. Substituem os pilares genéricos por tensões provocativas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {!saving && territories.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            <Button variant="outline" size="sm" onClick={addTerritory} disabled={territories.length >= 5}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
              Gerar a partir dos Pilares
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {territories.map((t) => (
          <div key={t.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{t.name || "Novo Território"}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeTerritory(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Polo A (aspiracional)</Label>
                <Input value={t.pole_a} onChange={(e) => updateTerritory(t.id, "pole_a", e.target.value)} placeholder="Ex: Conexão Digital" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Polo B (realista/crítico)</Label>
                <Input value={t.pole_b} onChange={(e) => updateTerritory(t.id, "pole_b", e.target.value)} placeholder="Ex: Isolamento Real" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pergunta de Tensão</Label>
              <Input value={t.description} onChange={(e) => updateTerritory(t.id, "description", e.target.value)} placeholder="A tecnologia nos conecta ou nos isola?" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Posicionamento da Marca</Label>
              <Textarea value={t.brand_position} onChange={(e) => updateTerritory(t.id, "brand_position", e.target.value)} rows={2} placeholder="Como a marca se posiciona nesta tensão..." />
            </div>

            {t.related_pillar && (
              <p className="text-[10px] text-muted-foreground">Derivado do pilar: {t.related_pillar}</p>
            )}
          </div>
        ))}

        {territories.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">
              Nenhum território definido. Gere automaticamente a partir dos Pilares de Conteúdo.
            </p>
            <p className="text-xs text-muted-foreground">
              Territórios de Tensão são usados pela IA para gerar teses narrativas únicas no planejamento de conteúdo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
