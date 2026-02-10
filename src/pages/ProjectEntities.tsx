import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Users,
  Sparkles,
  Eye,
  Instagram,
  Globe,
  Loader2,
  Download,
  BarChart3,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EntityType = Database["public"]["Enums"]["entity_type"];

const TAB_CONFIG: { value: EntityType; label: string; icon: typeof Users }[] = [
  { value: "competitor", label: "Concorrentes", icon: Users },
  { value: "influencer", label: "Influencers", icon: Sparkles },
  { value: "inspiration", label: "Inspirações", icon: Eye },
];

export default function ProjectEntities() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newType, setNewType] = useState<EntityType>("competitor");
  const [fetchingEntityId, setFetchingEntityId] = useState<string | null>(null);

  const fetchInstagram = async (entityId: string, handle: string) => {
    setFetchingEntityId(entityId);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram", {
        body: { entity_id: entityId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Coleta concluída!",
          description: `${data.records} registros coletados para @${handle.replace("@", "")}`,
        });
      } else {
        toast({ title: "Erro na coleta", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setFetchingEntityId(null);
    }
  };

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: entities, isLoading } = useQuery({
    queryKey: ["project-entities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_entities")
        .select("*, monitored_entities(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const addEntity = useMutation({
    mutationFn: async () => {
      const { data: entity, error: entityError } = await supabase
        .from("monitored_entities")
        .insert({
          name: newName,
          type: newType,
          instagram_handle: newHandle || null,
          website_url: newWebsite || null,
        })
        .select()
        .single();
      if (entityError) throw entityError;

      const { error: linkError } = await supabase
        .from("project_entities")
        .insert({
          project_id: projectId!,
          entity_id: entity.id,
          entity_role: newType,
        });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
      setDialogOpen(false);
      setNewName("");
      setNewHandle("");
      setNewWebsite("");
      toast({ title: "Entidade adicionada!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const getEntitiesByType = (type: EntityType) =>
    entities?.filter((e) => e.entity_role === type) ?? [];

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Entidades</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie concorrentes, influencers e inspirações.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Nova Entidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  {TAB_CONFIG.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNewType(t.value)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        newType === t.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t.label.slice(0, -1)}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da entidade" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Instagram</Label>
                  <Input value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="@handle" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Website</Label>
                  <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} placeholder="https://" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addEntity.mutate()}
                  disabled={!newName.trim() || addEntity.isPending}
                >
                  {addEntity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Tabs defaultValue="competitor">
        <TabsList className="mb-6 bg-accent">
          {TAB_CONFIG.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {getEntitiesByType(t.value).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : getEntitiesByType(tab.value).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <tab.icon className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum {tab.label.toLowerCase().slice(0, -1)} adicionado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {getEntitiesByType(tab.value).map((pe) => {
                  const e = pe.monitored_entities;
                  if (!e) return null;
                  return (
                    <Card key={pe.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-foreground">
                            {e.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {e.instagram_handle && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Instagram className="h-3 w-3" />
                                  {e.instagram_handle}
                                </span>
                              )}
                              {e.website_url && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Globe className="h-3 w-3" />
                                  {e.website_url}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {e.instagram_handle && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={fetchingEntityId === pe.entity_id}
                            onClick={() => fetchInstagram(pe.entity_id, e.instagram_handle!)}
                          >
                            {fetchingEntityId === pe.entity_id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-3.5 w-3.5" />
                            )}
                            Coletar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
