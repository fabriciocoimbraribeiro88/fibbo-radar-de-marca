import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users,
  Link2,
  CreditCard,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
} from "lucide-react";

type ConnectionStatus = "idle" | "ok" | "error";

function IntegrationCard({
  name,
  description,
  icon: Icon,
  status,
  statusLabel,
  testing,
  onTest,
}: {
  name: string;
  description: string;
  icon: typeof Key;
  status: ConnectionStatus;
  statusLabel?: string;
  testing: boolean;
  onTest: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">{name}</h3>
                {status === "ok" && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {statusLabel || "Conectado"}
                  </Badge>
                )}
                {status === "error" && (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <XCircle className="h-3 w-3" />
                    Erro
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing}>
            {testing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Testar Conexão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();

  const [testingApify, setTestingApify] = useState(false);
  const [apifyStatus, setApifyStatus] = useState<ConnectionStatus>("idle");
  const [apifyUser, setApifyUser] = useState("");

  const [testingClaude, setTestingClaude] = useState(false);
  const [claudeStatus, setClaudeStatus] = useState<ConnectionStatus>("idle");
  const [claudeModel, setClaudeModel] = useState("");
  const [claudeModels, setClaudeModels] = useState<{ id: string; name: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-anthropic-models");
      if (error) throw error;
      if (data?.success && data.models) {
        setClaudeModels(data.models);
        if (!claudeModel && data.models.length > 0) {
          const defaultModel = data.models.find((m: any) => m.id.includes("sonnet-4")) || data.models[0];
          setClaudeModel(defaultModel.id);
        }
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar modelos", description: err.message, variant: "destructive" });
    } finally {
      setLoadingModels(false);
    }
  };

  const testApify = async () => {
    setTestingApify(true);
    setApifyStatus("idle");
    try {
      const { data, error } = await supabase.functions.invoke("test-apify");
      if (error) throw error;
      if (data?.success) {
        setApifyStatus("ok");
        setApifyUser(data.username || "");
        toast({ title: "Apify conectado!", description: `Usuário: ${data.username}` });
      } else {
        setApifyStatus("error");
        toast({ title: "Erro Apify", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      setApifyStatus("error");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTestingApify(false);
    }
  };

  const testClaude = async () => {
    setTestingClaude(true);
    setClaudeStatus("idle");
    try {
      const { data, error } = await supabase.functions.invoke("test-anthropic");
      if (error) throw error;
      if (data?.success) {
        setClaudeStatus("ok");
        toast({ title: "Claude conectado!", description: "API key válida." });
        fetchModels();
      } else {
        setClaudeStatus("error");
        toast({ title: "Erro Claude", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      setClaudeStatus("error");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTestingClaude(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Configurações</h1>

      <Tabs defaultValue="integrations">
        <TabsList className="mb-6 bg-accent">
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-3.5 w-3.5" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-3.5 w-3.5" />
            Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-base font-medium text-foreground">Membros da equipe</h2>
              <p className="text-sm text-muted-foreground">Em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            <IntegrationCard
              name="Apify"
              description="Coleta de dados do Instagram, ads e SEO"
              icon={Key}
              status={apifyStatus}
              statusLabel={apifyUser ? `Conectado (${apifyUser})` : "Conectado"}
              testing={testingApify}
              onTest={testApify}
            />
            <IntegrationCard
              name="Anthropic (Claude)"
              description="Análises de inteligência competitiva com IA"
              icon={Brain}
              status={claudeStatus}
              testing={testingClaude}
              onTest={testClaude}
            />

            {claudeStatus === "ok" && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="claude-model" className="text-sm font-medium text-foreground">
                        Modelo LLM
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Modelo usado nas análises de inteligência competitiva
                      </p>
                    </div>
                    {loadingModels ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando modelos…
                      </div>
                    ) : (
                      <Select value={claudeModel} onValueChange={setClaudeModel}>
                        <SelectTrigger id="claude-model" className="w-[260px]">
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {claudeModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-base font-medium text-foreground">Consumo</h2>
              <p className="text-sm text-muted-foreground">Em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
