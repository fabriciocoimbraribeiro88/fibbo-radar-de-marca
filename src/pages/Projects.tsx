import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
          <h1 className="text-xl font-semibold text-foreground">Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus projetos de inteligência competitiva.
          </p>
        </div>
        <Button onClick={() => navigate("/projects/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !projects || projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-accent p-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Nenhum projeto criado
            </h2>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Crie um projeto para começar a monitorar marcas e concorrentes.
            </p>
            <Button onClick={() => navigate("/projects/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.brand_name}</p>
                  </div>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">
                    {p.status}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {p.segment && <span>{p.segment}</span>}
                  {p.instagram_handle && <span>{p.instagram_handle}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
