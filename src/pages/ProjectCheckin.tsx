import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Plus, CheckCircle2, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProjectCheckin() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");

  const { data: checkins, isLoading } = useQuery({
    queryKey: ["checkins", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("project_id", projectId!)
        .order("reference_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || !projectId) return;
    const { error } = await supabase.from("checkins").insert({
      project_id: projectId,
      title: newTitle.trim(),
      summary: newSummary.trim() || null,
      reference_date: new Date().toISOString().split("T")[0],
      status: "pending",
      type: "weekly",
      checklist: [],
    });
    if (error) {
      toast.error("Erro ao criar check-in");
      return;
    }
    toast.success("Check-in criado!");
    setDialogOpen(false);
    setNewTitle("");
    setNewSummary("");
    queryClient.invalidateQueries({ queryKey: ["checkins", projectId] });
  };

  const handleComplete = async (id: string) => {
    await supabase.from("checkins").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Check-in concluído!");
    queryClient.invalidateQueries({ queryKey: ["checkins", projectId] });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Check-in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento periódico de atividades e entregas do projeto.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo Check-in
        </Button>
      </div>

      {(!checkins || checkins.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum check-in registrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie check-ins para acompanhar o progresso do projeto periodicamente.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar Primeiro Check-in
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {checkins.map((c) => (
            <Card key={c.id} className={c.status === "completed" ? "opacity-70" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {c.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    {c.summary && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(c.reference_date), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <Badge variant={c.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {c.status === "completed" ? "Concluído" : "Pendente"}
                  </Badge>
                  {c.status !== "completed" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleComplete(c.id)}>
                      Concluir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Check-in semanal - Semana 12"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resumo (opcional)</label>
              <Textarea
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="Pontos principais a serem discutidos..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
