import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Settings as SettingsIcon, CreditCard, Link2, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Configurações</h1>

      <Tabs defaultValue="team">
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
                Gerencie os membros e suas permissões. Funcionalidade disponível após criar o banco de dados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-accent p-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Apify</h3>
                    <p className="text-xs text-muted-foreground">Coleta de dados do Instagram e ads</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder="Apify API Token" className="flex-1" />
                  <Button variant="outline" size="sm">Testar Conexão</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-accent p-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Anthropic (Claude)</h3>
                    <p className="text-xs text-muted-foreground">Análises com inteligência artificial</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder="Anthropic API Key" className="flex-1" />
                  <Button variant="outline" size="sm">Testar Conexão</Button>
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
