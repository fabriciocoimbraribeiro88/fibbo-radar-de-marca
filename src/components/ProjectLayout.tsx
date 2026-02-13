import { Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Palette,
  Database,
  BarChart3,
  Search,
  CalendarDays,
  Target,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const NAV_GROUPS = [
  {
    label: "CONFIGURAÇÃO",
    items: [
      { title: "Visão Geral", path: "", icon: LayoutDashboard, end: true },
      { title: "Contexto de Marca", path: "/brand", icon: Palette },
      { title: "Fontes de Dados", path: "/sources", icon: Database },
    ],
  },
  {
    label: "ANÁLISE",
    items: [
      { title: "Dashboard", path: "/dashboard", icon: BarChart3 },
      { title: "Métricas Avançadas", path: "/analyses", icon: Search },
    ],
  },
  {
    label: "AÇÃO",
    items: [
      { title: "Planejamento", path: "/planning", icon: CalendarDays },
      { title: "OKRs", path: "/okrs", icon: Target },
      { title: "Relatórios", path: "/reports", icon: FileText },
    ],
  },
];

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const basePath = `/projects/${id}`;

  return (
    <div className="flex gap-0 -m-6 min-h-[calc(100vh-3.5rem)]">
      {/* Sub-sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/20 bg-card/50 backdrop-blur-sm p-4">
        {/* Project name */}
        <div className="mb-5 px-2">
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <h2 className="text-base font-bold text-foreground truncate">
                {project?.name}
              </h2>
              <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                {project?.brand_name}
              </p>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="section-label px-2.5 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={`${basePath}${item.path}`}
                    end={item.end}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
