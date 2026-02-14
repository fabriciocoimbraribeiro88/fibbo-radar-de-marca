import { Outlet, useParams, useLocation, Link } from "react-router-dom";
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
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const NAV_GROUPS = [
  {
    label: "CONFIGURAÇÃO",
    items: [
      { title: "Fontes de Dados", path: "/sources", icon: Database },
      { title: "Contexto de Marca", path: "/brand", icon: Palette },
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
    ],
  },
];

// Map path segments to readable names
const PATH_LABELS: Record<string, string> = {
  "": "Visão Geral",
  brand: "Contexto de Marca",
  sources: "Fontes de Dados",
  dashboard: "Dashboard",
  analyses: "Métricas Avançadas",
  planning: "Planejamento",
  okrs: "OKRs",
  new: "Nova",
};

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

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

  // Compute current page name for breadcrumb
  const subPath = location.pathname.replace(basePath, "").replace(/^\//, "");
  const currentPageKey = subPath.split("/")[0] || "";
  const currentPageLabel = PATH_LABELS[currentPageKey] ?? currentPageKey;

  return (
    <div className="flex gap-0 -m-6 min-h-[calc(100vh-3.5rem)]">
      {/* Sub-sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/20 bg-card/50 backdrop-blur-sm p-4 custom-scrollbar overflow-auto">
        {/* Project name — clickable to go to overview */}
        <Link to={basePath} className="block mb-5 px-2 group">
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <h2 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {project?.name}
              </h2>
              {project?.instagram_handle && (
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                  @{project.instagram_handle.replace("@", "")}
                </p>
              )}
            </>
          )}
        </Link>

        {/* Navigation */}
        <nav className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-2.5 mb-1.5 mt-4 first:mt-0">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={`${basePath}${item.path}`}
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
      <div className="flex-1 overflow-auto">
        {/* Breadcrumb */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/projects" className="hover:text-foreground transition-colors">Projetos</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={basePath} className="hover:text-foreground transition-colors truncate max-w-[120px]">
            {project?.name ?? "..."}
          </Link>
          {currentPageKey && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{currentPageLabel}</span>
            </>
          )}
        </div>
        <div className="p-6 pt-2">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
