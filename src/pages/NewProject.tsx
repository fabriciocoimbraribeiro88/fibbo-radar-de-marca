import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  FileText,
  Users,
  Database,
  ClipboardCheck,
  Plus,
  X,
  Instagram,
  Globe,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createProject } from "@/lib/createProject";

const STEPS = [
  { title: "Marca", icon: Building2 },
  { title: "Briefing", icon: FileText },
  { title: "Concorrentes", icon: Users },
  { title: "Fontes", icon: Database },
  { title: "Revisão", icon: ClipboardCheck },
];

const SEGMENTS = [
  "Saúde", "E-commerce", "Educação", "Tecnologia", "Varejo",
  "Serviços", "Alimentação", "Moda", "Beleza", "Outro",
];

interface EntityEntry {
  name: string;
  instagram_handle: string;
  website_url: string;
  type: "competitor" | "influencer" | "inspiration";
}

export default function NewProject() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1
  const [projectName, setProjectName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [segment, setSegment] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  // Step 2
  const [brandDescription, setBrandDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // Step 3
  const [entities, setEntities] = useState<EntityEntry[]>([]);
  const [entityName, setEntityName] = useState("");
  const [entityHandle, setEntityHandle] = useState("");
  const [entityWebsite, setEntityWebsite] = useState("");
  const [entityType, setEntityType] = useState<EntityEntry["type"]>("competitor");

  // Step 4
  const [instagramPosts, setInstagramPosts] = useState(true);
  const [instagramComments, setInstagramComments] = useState(true);
  const [adsLibrary, setAdsLibrary] = useState(false);
  const [seoData, setSeoData] = useState(false);
  const [schedule, setSchedule] = useState("manual");

  const progress = ((step + 1) / STEPS.length) * 100;

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const addEntity = () => {
    if (entityName.trim()) {
      setEntities([...entities, {
        name: entityName,
        instagram_handle: entityHandle,
        website_url: entityWebsite,
        type: entityType,
      }]);
      setEntityName("");
      setEntityHandle("");
      setEntityWebsite("");
    }
  };

  const queryClient = useQueryClient();

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createProject({
        projectName,
        brandName,
        segment,
        websiteUrl,
        instagramHandle,
        brandDescription,
        targetAudience,
        toneOfVoice,
        keywords,
        entities,
        dataSources: {
          instagramPosts,
          instagramComments,
          adsLibrary,
          seoData,
        },
        schedule,
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      toast({ title: "Projeto criado!", description: `${projectName} foi criado com sucesso.` });
      navigate("/projects");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return projectName && brandName && segment;
    if (step === 2) return entities.filter(e => e.type === "competitor").length >= 1;
    return true;
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Novo Projeto</h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex justify-between">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-xs ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Brand Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Informações da Marca</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome do projeto</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ex: TechStore Q1 2025" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome da marca</Label>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Ex: TechStore Brasil" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Segmento</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                  <SelectContent className="bg-card">
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    <Globe className="mr-1 inline h-3 w-3" />Website
                  </Label>
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    <Instagram className="mr-1 inline h-3 w-3" />Instagram
                  </Label>
                  <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@handle" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Briefing */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Briefing Estratégico</h2>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição da marca</Label>
                <Textarea value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} placeholder="Descreva a marca, seus diferenciais..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Público-alvo</Label>
                <Textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Descreva o público-alvo..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tom de voz</Label>
                <Textarea value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} placeholder="Ex: Profissional, técnico, acessível..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Palavras-chave / Produtos</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="Adicionar palavra-chave"
                  />
                  <Button variant="outline" size="icon" onClick={addKeyword} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {keywords.map(k => (
                      <Badge key={k} variant="secondary" className="gap-1 pl-2 pr-1">
                        {k}
                        <button onClick={() => setKeywords(keywords.filter(kw => kw !== k))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Entities */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Concorrentes & Referências</h2>
              <p className="text-sm text-muted-foreground">Adicione pelo menos 1 concorrente.</p>

              <div className="rounded-lg border border-border p-4">
                <div className="mb-3 flex gap-2">
                  {(["competitor", "influencer", "inspiration"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setEntityType(t)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        entityType === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t === "competitor" ? "Concorrente" : t === "influencer" ? "Influencer" : "Inspiração"}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Nome" />
                  <Input value={entityHandle} onChange={(e) => setEntityHandle(e.target.value)} placeholder="@instagram" />
                  <Input value={entityWebsite} onChange={(e) => setEntityWebsite(e.target.value)} placeholder="website (opcional)" />
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={addEntity} disabled={!entityName.trim()}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {entities.length > 0 && (
                <div className="space-y-2">
                  {entities.map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {e.type === "competitor" ? "Concorrente" : e.type === "influencer" ? "Influencer" : "Inspiração"}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{e.name}</span>
                        {e.instagram_handle && (
                          <span className="text-xs text-muted-foreground">{e.instagram_handle}</span>
                        )}
                      </div>
                      <button onClick={() => setEntities(entities.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Data sources */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Fontes de Dados</h2>
              <p className="text-sm text-muted-foreground">Selecione quais dados coletar.</p>

              <div className="space-y-3">
                {[
                  { label: "Instagram Posts", value: instagramPosts, set: setInstagramPosts },
                  { label: "Instagram Comentários", value: instagramComments, set: setInstagramComments },
                  { label: "Biblioteca de Ads", value: adsLibrary, set: setAdsLibrary },
                  { label: "SEO", value: seoData, set: setSeoData },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Switch checked={value} onCheckedChange={set} />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Frequência de coleta</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="manual">Manual (sob demanda)</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Revisão</h2>
              <div className="space-y-3">
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-xs text-muted-foreground">Projeto</p>
                  <p className="text-sm font-medium text-foreground">{projectName}</p>
                </div>
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-xs text-muted-foreground">Marca</p>
                  <p className="text-sm font-medium text-foreground">{brandName} — {segment}</p>
                </div>
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-xs text-muted-foreground">Entidades</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {entities.map((e, i) => (
                      <Badge key={i} variant="outline">{e.name}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-xs text-muted-foreground">Fontes de dados</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {instagramPosts && <Badge variant="secondary">Instagram Posts</Badge>}
                    {instagramComments && <Badge variant="secondary">Comentários</Badge>}
                    {adsLibrary && <Badge variant="secondary">Ads Library</Badge>}
                    {seoData && <Badge variant="secondary">SEO</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Criando..." : "Criar Projeto"}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
