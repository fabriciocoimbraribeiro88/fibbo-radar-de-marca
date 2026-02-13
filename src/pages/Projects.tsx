import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">
            Gerencie seus projetos de inteligência competitiva.
          </p>
        </div>
        <Button className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate("/projects/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="gradient-card p-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-base font-medium text-foreground mb-1">
            Nenhum projeto criado
          </h2>
          <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
            Crie um projeto para começar a monitorar marcas e concorrentes.
          </p>
          <Button className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro projeto
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="card-interactive p-5"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-base text-foreground">{p.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.brand_name}</p>
                </div>
                <Badge variant="secondary" className="bg-accent/60 text-foreground/80 border-0 rounded-full text-[10px]">
                  {p.status}
                </Badge>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {p.segment && <span>{p.segment}</span>}
                {p.instagram_handle && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5">{p.instagram_handle}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
