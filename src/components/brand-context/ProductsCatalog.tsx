import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, X, Package, Pencil, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  curve: "A" | "B" | "C";
  margin: "high" | "medium" | "low";
  price_range: string;
  link: string;
  seo_keywords: string[];
  status: "active" | "launching" | "discontinued";
  pillar_ids: string[];
  seasonality: string;
  differentials: string;
}

interface Props {
  projectId: string;
  briefing: any;
}

const CATEGORIES = ["Produto", "Serviço", "Infoproduto", "SaaS", "Consultoria", "Varejo", "Outro"];

const CURVE_INFO = {
  A: { emoji: "🅰️", label: "Curva A", desc: "Carro-chefe. Maior faturamento. Prioridade máxima.", badgeClass: "bg-primary/10 text-primary border-primary/20" },
  B: { emoji: "🅱️", label: "Curva B", desc: "Relevante. Faturamento significativo. Prioridade média.", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  C: { emoji: "🅲", label: "Curva C", desc: "Complementar. Conteúdo pontual ou sazonal.", badgeClass: "bg-muted text-muted-foreground" },
};

const MARGIN_INFO = {
  high: { emoji: "💰", label: "Alta", desc: "Lucro significativo por venda.", badgeClass: "bg-green-500/10 text-green-600" },
  medium: { emoji: "💵", label: "Média", desc: "Lucro moderado por unidade.", badgeClass: "bg-amber-500/10 text-amber-600" },
  low: { emoji: "📉", label: "Baixa", desc: "Lucro pequeno. Precisa de volume.", badgeClass: "bg-muted text-muted-foreground" },
};

const STATUS_INFO: Record<string, { emoji: string; label: string }> = {
  active: { emoji: "🟢", label: "Ativo" },
  launching: { emoji: "🟡", label: "Em Lançamento" },
  discontinued: { emoji: "🔴", label: "Descontinuado" },
};

function emptyProduct(): Product {
  return {
    id: crypto.randomUUID(), name: "", category: "", description: "",
    curve: "A", margin: "high", price_range: "", link: "",
    seo_keywords: [], status: "active", pillar_ids: [],
    seasonality: "always", differentials: "",
  };
}

const curveOrder = { A: 0, B: 1, C: 2 };
const marginOrder = { high: 0, medium: 1, low: 2 };

export default function ProductsCatalog({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>(briefing?.products ?? []);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [filterCurve, setFilterCurve] = useState("all");
  const [filterMargin, setFilterMargin] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pillars: Array<{ id: string; name: string; color: string }> = briefing?.content_pillars ?? [];

  useEffect(() => {
    setProducts(briefing?.products ?? []);
  }, [briefing]);

  const save = useCallback(async (d: Product[]) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), products: d };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const openAdd = () => { setEditing(emptyProduct()); setKeywordInput(""); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setKeywordInput(""); setDialogOpen(true); };

  const saveProduct = () => {
    if (!editing?.name || !editing?.category || !editing?.description) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    const exists = products.find((p) => p.id === editing.id);
    const next = exists ? products.map((p) => (p.id === editing.id ? editing : p)) : [...products, editing];
    setProducts(next);
    save(next);
    setDialogOpen(false);
    toast.success(exists ? "Produto atualizado!" : "Produto adicionado!");
  };

  const removeProduct = (id: string) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    save(next);
  };

  const addKeyword = () => {
    if (!editing || !keywordInput.trim()) return;
    if (editing.seo_keywords.includes(keywordInput.trim())) return;
    setEditing({ ...editing, seo_keywords: [...editing.seo_keywords, keywordInput.trim()] });
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    if (!editing) return;
    setEditing({ ...editing, seo_keywords: editing.seo_keywords.filter((k) => k !== kw) });
  };

  const togglePillar = (pillarId: string) => {
    if (!editing) return;
    const ids = editing.pillar_ids.includes(pillarId)
      ? editing.pillar_ids.filter((id) => id !== pillarId)
      : [...editing.pillar_ids, pillarId];
    setEditing({ ...editing, pillar_ids: ids });
  };

  // Filtering and sorting
  let filtered = products;
  if (filterCurve !== "all") filtered = filtered.filter((p) => p.curve === filterCurve);
  if (filterMargin !== "all") filtered = filtered.filter((p) => p.margin === filterMargin);
  if (filterStatus !== "all") filtered = filtered.filter((p) => p.status === filterStatus);
  filtered = [...filtered].sort((a, b) => {
    const cDiff = curveOrder[a.curve] - curveOrder[b.curve];
    if (cDiff !== 0) return cDiff;
    return marginOrder[a.margin] - marginOrder[b.margin];
  });

  const activeCount = products.filter((p) => p.status === "active").length;
  const curveACount = products.filter((p) => p.curve === "A").length;
  const highMarginCount = products.filter((p) => p.margin === "high").length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Produtos & Serviços</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Catálogo dos principais itens que a marca oferece. Usado nas análises, planejamento, SEO e campanhas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {!saving && products.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Produto
            </Button>
          </div>
        </div>

        {/* Filters */}
        {products.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterCurve} onValueChange={setFilterCurve}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todas Curvas</SelectItem>
                <SelectItem value="A">Curva A</SelectItem>
                <SelectItem value="B">Curva B</SelectItem>
                <SelectItem value="C">Curva C</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMargin} onValueChange={setFilterMargin}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todas Margens</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="launching">Em Lançamento</SelectItem>
                <SelectItem value="discontinued">Descontinuado</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {activeCount} ativos | {curveACount} Curva A | {highMarginCount} Margem Alta
            </span>
          </div>
        )}

        {/* Product cards */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card key={p.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.category}{p.price_range ? ` · ${p.price_range}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className={`text-xs ${CURVE_INFO[p.curve].badgeClass}`}>
                          {CURVE_INFO[p.curve].emoji} {CURVE_INFO[p.curve].label}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${MARGIN_INFO[p.margin].badgeClass}`}>
                          {MARGIN_INFO[p.margin].emoji} Margem {MARGIN_INFO[p.margin].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_INFO[p.status].emoji} {STATUS_INFO[p.status].label}
                        </Badge>
                      </div>
                      {p.pillar_ids.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-muted-foreground">Pilares:</span>
                          {p.pillar_ids.map((pid) => {
                            const pillar = pillars.find((pl) => pl.id === pid);
                            return pillar ? (
                              <span key={pid} className="inline-flex items-center gap-1 text-[10px]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pillar.color }} />
                                {pillar.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {p.seo_keywords.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">SEO:</span>
                          <span className="text-[10px] text-muted-foreground">{p.seo_keywords.join(", ")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum produto cadastrado. Adicione seus produtos e serviços para que a IA possa gerar recomendações mais precisas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto corresponde aos filtros.</p>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && products.find((p) => p.id === editing.id) ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
            <DialogDescription>Preencha as informações do produto ou serviço.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Curso Marketing Digital" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoria *</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-card">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrição *</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </div>

              {/* Curve */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Curva *</Label>
                <div className="grid gap-2">
                  {(["A", "B", "C"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditing({ ...editing, curve: c })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        editing.curve === c ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{CURVE_INFO[c].emoji} {CURVE_INFO[c].label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{CURVE_INFO[c].desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Margem *</Label>
                <div className="grid gap-2">
                  {(["high", "medium", "low"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setEditing({ ...editing, margin: m })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        editing.margin === m ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{MARGIN_INFO[m].emoji} {MARGIN_INFO[m].label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{MARGIN_INFO[m].desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Faixa de preço</Label>
                  <Input value={editing.price_range} onChange={(e) => setEditing({ ...editing, price_range: e.target.value })} placeholder="R$ 997" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Link</Label>
                  <Input value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="https://..." />
                </div>
              </div>

              {/* SEO Keywords */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Keywords SEO</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="Adicionar keyword"
                    className="h-8 text-sm"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addKeyword}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {editing.seo_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {editing.seo_keywords.map((k) => (
                      <Badge key={k} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
                        {k}
                        <button onClick={() => removeKeyword(k)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status *</Label>
                  <Select value={editing.status} onValueChange={(v: any) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="active">🟢 Ativo</SelectItem>
                      <SelectItem value="launching">🟡 Em Lançamento</SelectItem>
                      <SelectItem value="discontinued">🔴 Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sazonalidade</Label>
                  <Select value={editing.seasonality} onValueChange={(v) => setEditing({ ...editing, seasonality: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="always">Sempre disponível</SelectItem>
                      <SelectItem value="seasonal">Sazonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pillar association */}
              {pillars.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Pilar associado</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {pillars.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={() => togglePillar(pl.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                          editing.pillar_ids.includes(pl.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.color }} />
                        {pl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diferenciais</Label>
                <Textarea value={editing.differentials} onChange={(e) => setEditing({ ...editing, differentials: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveProduct}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
