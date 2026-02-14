import { useState } from "react";
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
import { Plus, X, ImageIcon, Loader2, Trash2, Upload, CheckCircle, XCircle, Target, Megaphone, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  briefing: any;
}

type RefType = "kv" | "post_success" | "post_failure" | "campaign" | "ad" | "article";

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

const TYPE_META: Record<RefType, { icon: typeof ImageIcon; label: string; badgeClass: string }> = {
  kv: { icon: ImageIcon, label: "Key Visual", badgeClass: "bg-accent text-foreground" },
  post_success: { icon: CheckCircle, label: "Post Sucesso", badgeClass: "bg-green-500/10 text-green-600" },
  post_failure: { icon: XCircle, label: "Post Falha", badgeClass: "bg-destructive/10 text-destructive" },
  campaign: { icon: Target, label: "Campanha", badgeClass: "bg-primary/10 text-primary" },
  ad: { icon: Megaphone, label: "Anúncio", badgeClass: "bg-amber-500/10 text-amber-600" },
  article: { icon: FileText, label: "Artigo", badgeClass: "bg-blue-500/10 text-blue-600" },
};

const PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "YouTube", "Twitter", "Google Ads", "Meta Ads", "Blog", "Outro"];
const FORMATS = ["Reels", "Carrossel", "Estático", "Stories", "Vídeo", "Texto", "Outro"];

function emptyRef(type: RefType, projectId: string): Partial<RefRow> {
  return {
    project_id: projectId, type, title: "", description: "",
    image_url: null, external_url: null, platform: null, format: null,
    metrics: {}, why_it_worked: "",
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
  const [filterType, setFilterType] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");

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
    setDialogOpen(true);
  };

  const openEdit = (r: RefRow) => {
    setEditing({ ...r });
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

  const updateMetric = (key: string, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, metrics: { ...(editing.metrics ?? {}), [key]: value ? Number(value) : undefined } });
  };

  let filtered = refs;
  if (filterType !== "all") filtered = filtered.filter((r) => r.type === filterType);
  if (filterPlatform !== "all") filtered = filtered.filter((r) => r.platform === filterPlatform);

  const isPost = editing?.type === "post_success" || editing?.type === "post_failure";
  const isCampaign = editing?.type === "campaign";
  const isAd = editing?.type === "ad";
  const isArticle = editing?.type === "article";
  const showMetrics = isPost || isAd;
  const showPlatformFormat = isPost || isAd || isArticle;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Banco de Referências</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Referências visuais, posts, anúncios, artigos e campanhas que contextualizam a marca.
            </p>
          </div>
          <Button size="sm" onClick={() => openAdd("kv")}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>

        {refs.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.keys(TYPE_META) as RefType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return <SelectItem key={t} value={t}><span className="flex items-center gap-1.5"><Icon className="h-3 w-3" />{meta.label}</span></SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todas plataformas</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((r) => {
              const meta = TYPE_META[r.type as RefType] ?? TYPE_META.kv;
              const Icon = meta.icon;
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
                            <Badge variant="outline" className={`text-[10px] gap-1 ${meta.badgeClass}`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </Badge>
                            {r.platform && (
                              <span className="text-[10px] text-muted-foreground">{r.platform}</span>
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
                      {(r.type === "post_success" || r.type === "post_failure" || r.type === "ad") && r.metrics && (
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {r.metrics.likes != null && <span>{r.metrics.likes} likes</span>}
                          {r.metrics.comments != null && <span>{r.metrics.comments} coment.</span>}
                          {r.metrics.reach != null && <span>{r.metrics.reach} alcance</span>}
                          {r.metrics.saves != null && <span>{r.metrics.saves} salvam.</span>}
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
                Nenhuma referência adicionada ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione posts, anúncios, artigos e campanhas para contextualizar as análises.
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
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(TYPE_META) as RefType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setEditing({ ...editing, type: t })}
                      className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                        editing.type === t ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4 mx-auto mb-1" />
                      {meta.label}
                    </button>
                  );
                })}
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

              {/* Image upload */}
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

              {/* Platform & Format — shown for posts, ads, articles */}
              {showPlatformFormat && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">URL externa</Label>
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
                </>
              )}

              {/* Metrics — posts and ads */}
              {showMetrics && (
                <div className="grid grid-cols-4 gap-2">
                  {[{ key: "likes", label: "Likes" }, { key: "comments", label: "Coment." }, { key: "reach", label: "Alcance" }, { key: "saves", label: "Salvam." }].map((m) => (
                    <div key={m.key} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{m.label}</Label>
                      <Input type="number" className="h-8 text-xs" value={editing.metrics?.[m.key] ?? ""} onChange={(e) => updateMetric(m.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Why it worked — posts and ads */}
              {(isPost || isAd) && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {editing.type === "post_failure" ? "Por que não funcionou" : "Por que deu certo"}
                  </Label>
                  <Textarea value={editing.why_it_worked ?? ""} onChange={(e) => setEditing({ ...editing, why_it_worked: e.target.value })} rows={3} />
                </div>
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

              {/* Article-specific */}
              {isArticle && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Por que é relevante</Label>
                  <Textarea value={editing.why_it_worked ?? ""} onChange={(e) => setEditing({ ...editing, why_it_worked: e.target.value })} rows={3} />
                </div>
              )}
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
