import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger } from
"@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Bell,
  Search,
  LogOut,
  Radar,
  ChevronDown } from
"lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import fibboLogo from "@/assets/fibbo-logo.png";

const navItems = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard },
{ title: "Projetos", url: "/projects", icon: FolderOpen },
{ title: "Configurações", url: "/settings", icon: Settings }];


export default function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = user?.user_metadata?.full_name ?
  user.user_metadata.full_name.
  split(" ").
  map((n: string) => n[0]).
  join("").
  toUpperCase().
  slice(0, 2) :
  user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border bg-card">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-5">
              <img alt="Fibbo" className="h-7" src="/lovable-uploads/165f694b-a8ef-47da-9c31-b73b782aee8e.png" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Radar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Radar</span>
              </div>
            </div>

            {/* Nav */}
            <SidebarContent className="flex-1 px-2">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) =>
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          activeClassName="bg-accent text-foreground font-medium">

                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {/* User */}
            <div className="border-t border-border p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-left text-muted-foreground">
                      {user?.user_metadata?.full_name || user?.email}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card">
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
          </div>
        </Sidebar>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="h-8 w-64 border-0 bg-accent pl-9 text-sm" />

              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px]">
                  3
                </Badge>
              </Button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>);

}