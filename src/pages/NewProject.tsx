import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function NewProject() {
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    try {
      const slug = projectName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data: user } = await supabase.auth.getUser();

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          brand_name: projectName.trim(),
          slug: `${slug}-${Date.now()}`,
          created_by: user?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      if (user?.user?.id) {
        await supabase.from("project_members").insert({
          project_id: project.id,
          user_id: user.user.id,
          role: "owner",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto criado!", description: `${projectName} foi criado com sucesso.` });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="mb-4 hover:bg-accent/50">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="page-title">Novo Projeto</h1>
        <p className="page-subtitle">
          As demais informações podem ser preenchidas dentro do projeto.
        </p>
      </div>

      <div className="card-flat p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome do projeto</Label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ex: Nome da Marca"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="rounded-lg border-border/40 bg-accent/30 focus:border-primary/50"
            autoFocus
          />
        </div>

        <Button
          className="w-full gradient-coral text-white rounded-lg shadow-sm"
          onClick={handleCreate}
          disabled={loading || !projectName.trim()}
        >
          {loading ? "Criando..." : "Criar Projeto"}
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
