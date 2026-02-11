import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, X, ImageIcon, Loader2, Trash2, Upload, Camera, CheckCircle, XCircle, Target } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  briefing: any;
}

type RefType = "kv" | "post_success" | "post_failure" | "campaign";

interface RefRow {
  id: string;
  project_id: string;
  type: RefType;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  platform: string | null;
  format: string | null;
  metrics: any;
  why_it_worked: string | null;
  pillar_id: string | null;
  tags: string[] | null;
  campaign_period_start: string | null;
  campaign_period_end: string | null;
  campaign_results: string | null;
  campaign_learnings: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const TYPE_META: Record<RefType, { emoji: string; label: string; badgeClass: string }> = {
  kv: { emoji: "📸", label: "Key Visual", badgeClass: "bg-accent text-foreground" },
  post_success: { emoji: "✅", label: "Post Sucesso", badgeClass: "bg-green-500/10 text-green-600" },
  post_failure: { emoji: "❌", label: "Post Falha", badgeClass: "bg-destructive/10 text-destructive" },
  campaign: { emoji: "🎯", label: "Campanha", badgeClass: "bg-primary/10 text-primary" },
};

const PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "YouTube", "Twitter", "Outro"];
const FORMATS = ["Reels", "Carrossel", "Estático", "Stories", "Vídeo", "Outro"];

function emptyRef(type: RefType, projectId: string): Partial<RefRow> {
  return {
    project_id: projectId, type, title: "", description: "",
    image_url: null, external_url: null, platform: null, format: null,
    metrics: {}, why_it_worked: "", pillar_id: null, tags: [],
    campaign_period_start: null, campaign_period_end: null,
    campaign_results: "", campaign_learnings: "",
  };
}

export default function BrandReferences({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<RefRow> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPillar, setFilterPillar] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");

  const pillars: Array<{ id: string; name: string; color: string }> = briefing?.content_pillars ?? [];

  const { data: refs = [], isLoading } = useQuery({
    queryKey: ["brand_references", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_references")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as RefRow[];
    },
  });

  const openAdd = (type: RefType) => {
    setEditing(emptyRef(type, projectId));
    setTagInput("");
    setDialogOpen(true);
  };

  const openEdit = (r: RefRow) => {
    setEditing({ ...r });
    setTagInput("");
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (!editing) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const path = `${projectId}/brand/references/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("brand-documents").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("brand-documents").getPublicUrl(path);
    setEditing({ ...editing, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const saveRef = async () => {
    if (!editing?.title) { toast.error("Título é obrigatório."); return; }
    const isNew = !editing.id;
    const payload = {
      project_id: projectId,
      type: editing.type!,
      title: editing.title,
      description: editing.description || null,
      image_url: editing.image_url || null,
      external_url: editing.external_url || null,
      platform: editing.platform || null,
      format: editing.format || null,
      metrics: editing.metrics || {},
      why_it_worked: editing.why_it_worked || null,
      pillar_id: editing.pillar_id || null,
      tags: editing.tags?.length ? editing.tags : null,
      campaign_period_start: editing.campaign_period_start || null,
      campaign_period_end: editing.campaign_period_end || null,
      campaign_results: editing.campaign_results || null,
      campaign_learnings: editing.campaign_learnings || null,
    };

    if (isNew) {
      const { error } = await supabase.from("brand_references").insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Referência adicionada!");
    } else {
      const { error } = await supabase.from("brand_references").update(payload as any).eq("id", editing.id!);
      if (error) { toast.error(error.message); return; }
      toast.success("Referência atualizada!");
    }
    queryClient.invalidateQueries({ queryKey: ["brand_references", projectId] });
    setDialogOpen(false);
  };

  const deleteRef = async () => {
    if (!deleteId) return;
    await supabase.from("brand_references").delete().eq("id", deleteId);
    queryClient.invalidateQueries({ queryKey: ["brand_references", projectId] });
    setDeleteId(null);
    toast.success("Referência removida.");
  };

  const addTag = () => {
    if (!editing || !tagInput.trim()) return;
    if (editing.tags?.includes(tagInput.trim())) return;
    setEditing({ ...editing, tags: [...(editing.tags ?? []), tagInput.trim()] });
    setTagInput("");
  };

  const removeTag = (t: string) => {
    if (!editing) return;
    setEditing({ ...editing, tags: (editing.tags ?? []).filter((x) => x !== t) });
  };

  const updateMetric = (key: string, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, metrics: { ...(editing.metrics ?? {}), [key]: value ? Number(value) : undefined } });
  };

  let filtered = refs;
  if (filterType !== "all") filtered = filtered.filter((r) => r.type === filterType);
  if (filterPillar !== "all") filtered = filtered.filter((r) => r.pillar_id === filterPillar);
  if (filterPlatform !== "all") filtered = filtered.filter((r) => r.platform === filterPlatform);

  const isPost = editing?.type === "post_success" || editing?.type === "post_failure";
  const isCampaign = editing?.type === "campaign";

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Referências & KVs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Banco de referências visuais, posts que performaram e campanhas de sucesso.
            </p>
          </div>
          <Button size="sm" onClick={() => openAdd("kv")}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Referência
          </Button>
        </div>

        {refs.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="kv">📸 KV</SelectItem>
                <SelectItem value="post_success">✅ Post Sucesso</SelectItem>
                <SelectItem value="post_failure">❌ Post Falha</SelectItem>
                <SelectItem value="campaign">🎯 Campanha</SelectItem>
              </SelectContent>
            </Select>
            {pillars.length > 0 && (
              <Select value={filterPillar} onValueChange={setFilterPillar}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="all">Todos Pilares</SelectItem>
                  {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todas Plataformas</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((r) => {
              const meta = TYPE_META[r.type as RefType];
              const pillar = pillars.find((p) => p.id === r.pillar_id);
              return (
                <Card key={r.id} className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(r)}>
                  <CardContent className="p-0">
                    {r.image_url && (
                      <div className="h-32 rounded-t-lg overflow-hidden bg-muted">
                        <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>
                              {meta.emoji} {meta.label}
                            </Badge>
                            {pillar && (
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pillar.color }} />
                                {pillar.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(r.type === "post_success" || r.type === "post_failure") && r.metrics && (
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {r.metrics.likes != null && <span>❤️ {r.metrics.likes}</span>}
                          {r.metrics.comments != null && <span>💬 {r.metrics.comments}</span>}
                          {r.metrics.reach != null && <span>📊 {r.metrics.reach}</span>}
                          {r.metrics.saves != null && <span>🔖 {r.metrics.saves}</span>}
                        </div>
                      )}
                      {r.created_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : refs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma referência adicionada. Adicione KVs, posts que performaram e campanhas de referência para contextualizar as análises.
              </p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma referência corresponde aos filtros.</p>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Referência" : "Nova Referência"}</DialogTitle>
            <DialogDescription>Selecione o tipo e preencha os campos.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Type selector */}
              <div className="grid grid-cols-4 gap-2">
                {(["kv", "post_success", "post_failure", "campaign"] as RefType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditing({ ...editing, type: t })}
                    className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                      editing.type === t ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <span className="text-lg block">{TYPE_META[t].emoji}</span>
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>

              {/* Common fields */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título *</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </div>

              {/* Image upload (all types) */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Imagem</Label>
                {editing.image_url ? (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img src={editing.image_url} alt="" className="w-full max-h-40 object-cover" />
                    <button
                      onClick={() => setEditing({ ...editing, image_url: null })}
                      className="absolute top-2 right-2 rounded-full bg-destructive/80 p-1"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (max 5MB)</span>
                      </>
                    )}
                    <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                )}
              </div>

              {/* Post-specific fields */}
              {isPost && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">URL do post</Label>
                    <Input value={editing.external_url ?? ""} onChange={(e) => setEditing({ ...editing, external_url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Plataforma</Label>
                      <Select value={editing.platform ?? ""} onValueChange={(v) => setEditing({ ...editing, platform: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-card">{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Formato</Label>
                      <Select value={editing.format ?? ""} onValueChange={(v) => setEditing({ ...editing, format: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-card">{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ key: "likes", label: "Likes" }, { key: "comments", label: "Comentários" }, { key: "reach", label: "Alcance" }, { key: "saves", label: "Salvamentos" }].map((m) => (
                      <div key={m.key} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{m.label}</Label>
                        <Input type="number" className="h-8 text-xs" value={editing.metrics?.[m.key] ?? ""} onChange={(e) => updateMetric(m.key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {editing.type === "post_success" ? "Por que deu certo" : "Por que não funcionou"}
                    </Label>
                    <Textarea value={editing.why_it_worked ?? ""} onChange={(e) => setEditing({ ...editing, why_it_worked: e.target.value })} rows={3} />
                  </div>
                </>
              )}

              {/* Campaign fields */}
              {isCampaign && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Período início</Label>
                      <Input type="date" value={editing.campaign_period_start ?? ""} onChange={(e) => setEditing({ ...editing, campaign_period_start: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Período fim</Label>
                      <Input type="date" value={editing.campaign_period_end ?? ""} onChange={(e) => setEditing({ ...editing, campaign_period_end: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Resultados</Label>
                    <Textarea value={editing.campaign_results ?? ""} onChange={(e) => setEditing({ ...editing, campaign_results: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Aprendizados</Label>
                    <Textarea value={editing.campaign_learnings ?? ""} onChange={(e) => setEditing({ ...editing, campaign_learnings: e.target.value })} rows={3} />
                  </div>
                </>
              )}

              {/* Pillar */}
              {pillars.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pilar associado</Label>
                  <Select value={editing.pillar_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, pillar_id: v === "none" ? null : v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Adicionar tag" className="h-8 text-sm" />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addTag}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                {(editing.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {editing.tags!.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
                        {t}<button onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveRef}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover referência?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRef}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
