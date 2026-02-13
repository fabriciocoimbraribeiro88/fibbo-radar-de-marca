import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  Search,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import fibboLogo from "@/assets/fibbo-logo.png";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border/30 bg-card/90 backdrop-blur-sm px-4 shrink-0">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              alt="FibboMetrics"
              className="h-[2.1rem] object-scale-down"
              src={fibboLogo}
            />
          </button>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Buscar..."
              className="h-8 w-64 border-none bg-accent/50 pl-9 text-sm rounded-lg placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] bg-primary text-primary-foreground border-0">
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/60 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs gradient-coral text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline truncate text-muted-foreground text-xs max-w-[120px]">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
