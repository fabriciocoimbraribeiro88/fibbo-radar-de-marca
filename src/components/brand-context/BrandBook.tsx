import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, X, Plus, Upload, ExternalLink, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

interface ColorEntry {
  id: string;
  hex: string;
  name: string;
  usage: string;
}

interface FontEntry {
  name: string;
  weights: number[];
  usage: string;
}

interface BoardEntry {
  id: string;
  name: string;
  url: string;
}

interface BrandBookData {
  logos: {
    main_url?: string;
    mono_url?: string;
    icon_url?: string;
    protection_area?: string;
    forbidden_uses?: string;
  };
  colors: {
    primary: ColorEntry[];
    secondary: ColorEntry[];
    tertiary: ColorEntry[];
    support: {
      success: string;
      error: string;
      warning: string;
      info: string;
    };
  };
  typography: {
    primary: FontEntry;
    secondary: FontEntry;
    display: FontEntry;
  };
  visual_style: {
    photography: string;
    illustration: string;
    icon_style: string;
    graphic_elements: string;
  };
  moodboard: BoardEntry[];
}

const emptyBrandBook: BrandBookData = {
  logos: {},
  colors: {
    primary: [],
    secondary: [],
    tertiary: [],
    support: { success: "#10b981", error: "#ef4444", warning: "#f59e0b", info: "#3b82f6" },
  },
  typography: {
    primary: { name: "", weights: [400], usage: "" },
    secondary: { name: "", weights: [400], usage: "" },
    display: { name: "", weights: [], usage: "" },
  },
  visual_style: { photography: "", illustration: "", icon_style: "", graphic_elements: "" },
  moodboard: [],
};

function deepMergeBB(target: BrandBookData, source: any): BrandBookData {
  if (!source) return target;
  return {
    logos: { ...target.logos, ...source.logos },
    colors: {
      primary: source.colors?.primary ?? target.colors.primary,
      secondary: source.colors?.secondary ?? target.colors.secondary,
      tertiary: source.colors?.tertiary ?? target.colors.tertiary,
      support: { ...target.colors.support, ...source.colors?.support },
    },
    typography: {
      primary: { ...target.typography.primary, ...source.typography?.primary },
      secondary: { ...target.typography.secondary, ...source.typography?.secondary },
      display: { ...target.typography.display, ...source.typography?.display },
    },
    visual_style: { ...target.visual_style, ...source.visual_style },
    moodboard: source.moodboard ?? target.moodboard,
  };
}

interface Props {
  projectId: string;
  briefing: any;
}

const WEIGHTS = [
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "SemiBold" },
  { value: 700, label: "Bold" },
];

export default function BrandBook({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [data, setData] = useState<BrandBookData>(deepMergeBB(emptyBrandBook, briefing?.brand_book));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setData(deepMergeBB(emptyBrandBook, briefing?.brand_book));
  }, [briefing]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const save = useCallback(async (d: BrandBookData) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), brand_book: d };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((d: BrandBookData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(d), 2000);
  }, [save]);

  const update = useCallback((updater: (prev: BrandBookData) => BrandBookData) => {
    setData((prev) => {
      const next = updater(prev);
      schedSave(next);
      return next;
    });
  }, [schedSave]);

  // Logo upload
  const handleLogoUpload = async (type: "main" | "mono" | "icon", file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "svg", "webp"].includes(ext ?? "")) {
      toast.error("Formato não suportado. Use PNG, SVG ou WEBP.");
      return;
    }
    setUploading(type);
    const path = `${projectId}/brand/logos/${type}.${ext}`;
    const { error } = await supabase.storage.from("brand-documents").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Erro no upload: " + error.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("brand-documents").getPublicUrl(path);
    const urlKey = `${type}_url` as "main_url" | "mono_url" | "icon_url";
    update((prev) => ({ ...prev, logos: { ...prev.logos, [urlKey]: urlData.publicUrl } }));
    setUploading(null);
    toast.success("Logo enviado!");
  };

  const removeLogo = (type: "main" | "mono" | "icon") => {
    const urlKey = `${type}_url` as "main_url" | "mono_url" | "icon_url";
    update((prev) => ({ ...prev, logos: { ...prev.logos, [urlKey]: undefined } }));
  };

  // Color helpers
  const addColor = (tier: "primary" | "secondary" | "tertiary") => {
    const limits = { primary: 3, secondary: 4, tertiary: 4 };
    if (data.colors[tier].length >= limits[tier]) return;
    update((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [tier]: [...prev.colors[tier], { id: crypto.randomUUID(), hex: "#6366f1", name: "", usage: "" }],
      },
    }));
  };

  const updateColor = (tier: "primary" | "secondary" | "tertiary", id: string, field: keyof ColorEntry, value: string) => {
    update((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [tier]: prev.colors[tier].map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      },
    }));
  };

  const removeColor = (tier: "primary" | "secondary" | "tertiary", id: string) => {
    update((prev) => ({
      ...prev,
      colors: { ...prev.colors, [tier]: prev.colors[tier].filter((c) => c.id !== id) },
    }));
  };

  const updateSupportColor = (key: keyof BrandBookData["colors"]["support"], hex: string) => {
    update((prev) => ({
      ...prev,
      colors: { ...prev.colors, support: { ...prev.colors.support, [key]: hex } },
    }));
  };

  // Typography
  const updateFont = (tier: "primary" | "secondary" | "display", field: keyof FontEntry, value: any) => {
    update((prev) => ({
      ...prev,
      typography: { ...prev.typography, [tier]: { ...prev.typography[tier], [field]: value } },
    }));
  };

  const toggleWeight = (tier: "primary" | "secondary" | "display", weight: number) => {
    update((prev) => {
      const current = prev.typography[tier].weights;
      const next = current.includes(weight) ? current.filter((w) => w !== weight) : [...current, weight].sort();
      return { ...prev, typography: { ...prev.typography, [tier]: { ...prev.typography[tier], weights: next } } };
    });
  };

  // Moodboard
  const addBoard = () => {
    if (data.moodboard.length >= 3) return;
    update((prev) => ({ ...prev, moodboard: [...prev.moodboard, { id: crypto.randomUUID(), name: "", url: "" }] }));
  };

  const updateBoard = (id: string, field: keyof BoardEntry, value: string) => {
    update((prev) => ({ ...prev, moodboard: prev.moodboard.map((b) => (b.id === id ? { ...b, [field]: value } : b)) }));
  };

  const removeBoard = (id: string) => {
    update((prev) => ({ ...prev, moodboard: prev.moodboard.filter((b) => b.id !== id) }));
  };

  const allColors = [
    ...data.colors.primary,
    ...data.colors.secondary,
    ...data.colors.tertiary,
    { id: "s1", hex: data.colors.support.success, name: "Sucesso", usage: "" },
    { id: "s2", hex: data.colors.support.error, name: "Erro", usage: "" },
    { id: "s3", hex: data.colors.support.warning, name: "Alerta", usage: "" },
    { id: "s4", hex: data.colors.support.info, name: "Info", usage: "" },
  ];

  const LogoUploadArea = ({ label, type, url }: { label: string; type: "main" | "mono" | "icon"; url?: string }) => (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {url ? (
        <div className="relative rounded-lg border border-dashed p-4 flex items-center justify-center bg-muted/30">
          <img src={url} alt={label} className="max-h-20 max-w-full object-contain" />
          <button
            onClick={() => removeLogo(type)}
            className="absolute top-2 right-2 rounded-full bg-destructive/10 p-1 hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3 text-destructive" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading === type ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">PNG, SVG, WEBP (max 2MB)</span>
            </>
          )}
          <input
            type="file"
            accept=".png,.svg,.webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleLogoUpload(type, e.target.files[0])}
          />
        </label>
      )}
    </div>
  );

  const ColorRow = ({ tier, color }: { tier: "primary" | "secondary" | "tertiary"; color: ColorEntry }) => (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color.hex}
        onChange={(e) => updateColor(tier, color.id, "hex", e.target.value)}
        className="w-10 h-10 rounded-lg border cursor-pointer shrink-0 p-0.5"
      />
      <Input
        value={color.hex}
        onChange={(e) => updateColor(tier, color.id, "hex", e.target.value)}
        className="w-24 h-8 text-xs font-mono"
        placeholder="#RRGGBB"
      />
      <Input
        value={color.name}
        onChange={(e) => updateColor(tier, color.id, "name", e.target.value)}
        className="h-8 text-sm flex-1"
        placeholder="Coral Fibbo"
      />
      <Input
        value={color.usage}
        onChange={(e) => updateColor(tier, color.id, "usage", e.target.value)}
        className="h-8 text-sm flex-1"
        placeholder="CTAs e destaques"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeColor(tier, color.id)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const ColorTier = ({ tier, label, limit }: { tier: "primary" | "secondary" | "tertiary"; label: string; limit: number }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addColor(tier)} disabled={data.colors[tier].length >= limit}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      {data.colors[tier].map((c) => <ColorRow key={c.id} tier={tier} color={c} />)}
      {data.colors[tier].length === 0 && <p className="text-xs text-muted-foreground py-2">Nenhuma cor definida.</p>}
    </div>
  );

  const FontBlock = ({ tier, label }: { tier: "primary" | "secondary" | "display"; label: string }) => (
    <div className="space-y-2 rounded-lg border p-3">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={data.typography[tier].name}
          onChange={(e) => updateFont(tier, "name", e.target.value)}
          placeholder="Inter"
          className="h-8 text-sm"
        />
        <Input
          value={data.typography[tier].usage}
          onChange={(e) => updateFont(tier, "usage", e.target.value)}
          placeholder="Títulos e CTAs"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {WEIGHTS.map((w) => (
          <button
            key={w.value}
            onClick={() => toggleWeight(tier, w.value)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              data.typography[tier].weights.includes(w.value)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {w.label} ({w.value})
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
        {saving && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</>}
        {!saving && <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Salvo</>}
      </div>

      {/* 1. Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo da Marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <LogoUploadArea label="Logo Principal" type="main" url={data.logos.main_url} />
            <LogoUploadArea label="Logo Monocromática" type="mono" url={data.logos.mono_url} />
            <LogoUploadArea label="Ícone / Favicon" type="icon" url={data.logos.icon_url} />
          </div>

          {data.logos.main_url && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-8 flex items-center justify-center border">
                <img src={data.logos.main_url} alt="Logo claro" className="max-w-[120px] object-contain" />
              </div>
              <div className="rounded-lg bg-gray-900 p-8 flex items-center justify-center border border-gray-700">
                <img src={data.logos.main_url} alt="Logo escuro" className="max-w-[120px] object-contain" />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Área de proteção</Label>
              <Textarea
                value={data.logos.protection_area ?? ""}
                onChange={(e) => update((prev) => ({ ...prev, logos: { ...prev.logos, protection_area: e.target.value } }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Usos proibidos</Label>
              <Textarea
                value={data.logos.forbidden_uses ?? ""}
                onChange={(e) => update((prev) => ({ ...prev, logos: { ...prev.logos, forbidden_uses: e.target.value } }))}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Paleta de Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paleta de Cores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorTier tier="primary" label="Cores Primárias" limit={3} />
          <ColorTier tier="secondary" label="Cores Secundárias" limit={4} />
          <ColorTier tier="tertiary" label="Cores Terciárias" limit={4} />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Cores de Suporte</Label>
            {(["success", "error", "warning", "info"] as const).map((key) => {
              const labels: Record<string, string> = { success: "Sucesso", error: "Erro", warning: "Alerta", info: "Informação" };
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.colors.support[key]}
                    onChange={(e) => updateSupportColor(key, e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer shrink-0 p-0.5"
                  />
                  <Input
                    value={data.colors.support[key]}
                    onChange={(e) => updateSupportColor(key, e.target.value)}
                    className="w-24 h-8 text-xs font-mono"
                  />
                  <span className="text-sm text-muted-foreground">{labels[key]}</span>
                </div>
              );
            })}
          </div>

          {allColors.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Preview</Label>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {allColors.map((c) => (
                  <div key={c.id} className="flex-1" style={{ backgroundColor: c.hex }} title={c.name || c.hex} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tipografia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipografia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FontBlock tier="primary" label="Fonte Primária" />
          <FontBlock tier="secondary" label="Fonte Secundária" />
          <FontBlock tier="display" label="Fonte Display (opcional)" />
        </CardContent>
      </Card>

      {/* 4. Estilo Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estilo Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Estilo de fotografia</Label>
            <Textarea
              value={data.visual_style.photography}
              onChange={(e) => update((prev) => ({ ...prev, visual_style: { ...prev.visual_style, photography: e.target.value } }))}
              rows={2} placeholder="Lifestyle, cores quentes, luz natural"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Estilo de ilustração</Label>
            <Textarea
              value={data.visual_style.illustration}
              onChange={(e) => update((prev) => ({ ...prev, visual_style: { ...prev.visual_style, illustration: e.target.value } }))}
              rows={2} placeholder="Flat design, minimalista"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Estilo de ícones</Label>
            <Select
              value={data.visual_style.icon_style}
              onValueChange={(v) => update((prev) => ({ ...prev, visual_style: { ...prev.visual_style, icon_style: v } }))}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="duotone">Duotone</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Elementos gráficos recorrentes</Label>
            <Textarea
              value={data.visual_style.graphic_elements}
              onChange={(e) => update((prev) => ({ ...prev, visual_style: { ...prev.visual_style, graphic_elements: e.target.value } }))}
              rows={2} placeholder="Patterns geométricos, gradientes sutis"
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Moodboard */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Moodboard / Referências Visuais</CardTitle>
              <CardDescription>Cole links de boards do Pinterest com as referências visuais da marca.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addBoard} disabled={data.moodboard.length >= 3}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Board
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.moodboard.map((b) => {
            const isPinterest = b.url.includes("pinterest.com");
            const isValid = b.url.startsWith("http");
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border p-3">
                <Input
                  value={b.name}
                  onChange={(e) => updateBoard(b.id, "name", e.target.value)}
                  placeholder="Visionboard 2025"
                  className="h-8 text-sm w-44"
                />
                <Input
                  value={b.url}
                  onChange={(e) => updateBoard(b.id, "url", e.target.value)}
                  placeholder="https://br.pinterest.com/..."
                  className="h-8 text-sm flex-1"
                />
                {isPinterest && isValid && (
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Abrir no Pinterest <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {b.url && !isPinterest && isValid && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeBoard(b.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          {data.moodboard.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum board adicionado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
