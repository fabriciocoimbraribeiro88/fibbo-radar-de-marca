import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Link2,
  CreditCard,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [testingApify, setTestingApify] = useState(false);
  const [apifyStatus, setApifyStatus] = useState<"idle" | "ok" | "error">("idle");
  const [apifyUser, setApifyUser] = useState("");

  const testApifyConnection = async () => {
    setTestingApify(true);
    setApifyStatus("idle");
    try {
      const { data, error } = await supabase.functions.invoke("test-apify");
      if (error) throw error;
      if (data?.success) {
        setApifyStatus("ok");
        setApifyUser(data.username || "");
        toast({ title: "Conexão OK!", description: `Apify conectado como ${data.username}` });
      } else {
        setApifyStatus("error");
        toast({ title: "Erro", description: data?.error || "Falha na conexão", variant: "destructive" });
      }
    } catch (err: any) {
      setApifyStatus("error");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTestingApify(false);
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
              <p className="text-sm text-muted-foreground">
                Gerencie os membros e suas permissões. Em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            {/* Apify */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent p-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">Apify</h3>
                        {apifyStatus === "ok" && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Conectado{apifyUser ? ` (${apifyUser})` : ""}
                          </Badge>
                        )}
                        {apifyStatus === "error" && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" />
                            Erro
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Coleta de dados do Instagram, ads e SEO
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testApifyConnection}
                    disabled={testingApify}
                  >
                    {testingApify && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Testar Conexão
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lovable AI */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent p-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">IA (Lovable Cloud)</h3>
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Ativo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Gemini, GPT-5 e outros modelos — sem chave extra necessária
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-base font-medium text-foreground">Consumo</h2>
              <p className="text-sm text-muted-foreground">
                Dashboard de consumo de tokens e custos. Em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
