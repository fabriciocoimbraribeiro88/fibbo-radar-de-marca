import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2 } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved";

export default function ProjectBrand() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [form, setForm] = useState({
    brand_name: "",
    brand_description: "",
    target_audience: "",
    tone_of_voice: "",
    keywords: "",
    instagram_handle: "",
    website_url: "",
    segment: "",
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // Init form from project data
  useEffect(() => {
    if (project && !initialized.current) {
      setForm({
        brand_name: project.brand_name ?? "",
        brand_description: project.brand_description ?? "",
        target_audience: project.target_audience ?? "",
        tone_of_voice: project.tone_of_voice ?? "",
        keywords: project.keywords?.join(", ") ?? "",
        instagram_handle: project.instagram_handle ?? "",
        website_url: project.website_url ?? "",
        segment: project.segment ?? "",
      });
      initialized.current = true;
    }
  }, [project]);

  const save = useCallback(
    async (data: typeof form) => {
      if (!id) return;
      setSaveStatus("saving");
      const keywords = data.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("projects")
        .update({
          brand_name: data.brand_name,
          brand_description: data.brand_description,
          target_audience: data.target_audience,
          tone_of_voice: data.tone_of_voice,
          keywords,
          instagram_handle: data.instagram_handle,
          website_url: data.website_url,
          segment: data.segment,
        })
        .eq("id", id);
      if (!error) {
        setSaveStatus("saved");
        queryClient.invalidateQueries({ queryKey: ["project", id] });
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    },
    [id, queryClient]
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(next), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Marca</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Briefing completo da marca para contextualizar as análises.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando…
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Salvo
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome da Marca</Label>
              <Input
                value={form.brand_name}
                onChange={(e) => handleChange("brand_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Segmento</Label>
              <Input
                value={form.segment}
                onChange={(e) => handleChange("segment", e.target.value)}
                placeholder="Ex: Moda, Tecnologia, Food..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição da Marca</Label>
            <Textarea
              value={form.brand_description}
              onChange={(e) => handleChange("brand_description", e.target.value)}
              placeholder="Descreva a marca, seu posicionamento, valores..."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Público-Alvo</Label>
            <Textarea
              value={form.target_audience}
              onChange={(e) => handleChange("target_audience", e.target.value)}
              placeholder="Descreva o público-alvo principal da marca..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tom de Voz</Label>
            <Input
              value={form.tone_of_voice}
              onChange={(e) => handleChange("tone_of_voice", e.target.value)}
              placeholder="Ex: Profissional, descontraído, inspirador..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Keywords / Produtos / Serviços
            </Label>
            <Input
              value={form.keywords}
              onChange={(e) => handleChange("keywords", e.target.value)}
              placeholder="Separe por vírgula: keyword1, keyword2, keyword3"
            />
            {form.keywords && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.keywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .map((k) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instagram</Label>
              <Input
                value={form.instagram_handle}
                onChange={(e) => handleChange("instagram_handle", e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input
                value={form.website_url}
                onChange={(e) => handleChange("website_url", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
