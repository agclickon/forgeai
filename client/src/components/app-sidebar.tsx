import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Columns3,
  Plus,
  ChevronRight,
  Settings,
  LogOut,
  ListChecks,
  Shield,
  BarChart3,
  Bot,
  Building2,
  Activity,
  User,
  Pencil,
} from "lucide-react";
import logoImg from "@assets/logo-forge-ai.png?url";
import type { Client, Project } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";

// Helper to get proper image URL from object storage path
const getImageUrl = (path: string | null | undefined) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `/api/files/${path}`;
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [currentAdminTab, setCurrentAdminTab] = useState("overview");

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: async () => {
      // Clear all queries to reset the app state
      await queryClient.cancelQueries();
      queryClient.clear();
      // Use window.location for a hard redirect to ensure page reloads
      window.location.href = "/login";
    },
  });

  useEffect(() => {
    const updateAdminTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || "overview";
      setCurrentAdminTab(tab);
    };

    updateAdminTab();

    const handlePopState = () => {
      updateAdminTab();
    };

    window.addEventListener("popstate", handlePopState);

    const interval = setInterval(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || "overview";
      if (tab !== currentAdminTab) {
        setCurrentAdminTab(tab);
      }
    }, 100);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, [currentAdminTab]);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: adminCheck } = useQuery<{ isAdmin: boolean; role: string }>({
    queryKey: ["/api/admin/check"],
  });

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const getClientProjects = (clientId: string) => {
    return projects?.filter((p) => p.clientId === clientId) || [];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatClientDisplayName = (client: Client) => {
    const firstName = client.name.split(" ")[0];
    if (client.company) {
      return `${client.company} - ${firstName}`;
    }
    return client.name;
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 h-14 flex items-center justify-center border-b border-sidebar-border">
        <Link href="/" className="flex items-center justify-center w-full">
          <img src={logoImg} alt="Forge AI" className="h-8 object-contain max-w-full" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/" || location === "/dashboard"}
                  data-testid="nav-dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/my-tasks"}
                  data-testid="nav-my-tasks"
                >
                  <Link href="/my-tasks">
                    <ListChecks className="w-4 h-4" />
                    <span>Minhas Tarefas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/kanban"}
                  data-testid="nav-kanban"
                >
                  <Link href="/kanban">
                    <Columns3 className="w-4 h-4" />
                    <span>Kanban</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {adminCheck?.isAdmin && (
                <Collapsible defaultOpen={location.startsWith("/admin")}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={location === "/admin"}
                        data-testid="nav-admin"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Administração</span>
                        <ChevronRight
                          className={`ml-auto w-4 h-4 transition-transform ${
                            location.startsWith("/admin") ? "rotate-90" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={currentAdminTab === "overview"}
                            data-testid="nav-admin-overview"
                          >
                            <Link href="/admin">
                              <BarChart3 className="w-3 h-3" />
                              <span>Visão Geral</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={currentAdminTab === "users"}
                            data-testid="nav-admin-users"
                          >
                            <Link href="/admin?tab=users">
                              <Users className="w-3 h-3" />
                              <span>Usuários</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={currentAdminTab === "ai-providers"}
                            data-testid="nav-admin-ai-providers"
                          >
                            <Link href="/admin?tab=ai-providers">
                              <Bot className="w-3 h-3" />
                              <span>Provedores IA</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === "/admin/clients"}
                            data-testid="nav-admin-clients"
                          >
                            <Link href="/admin/clients">
                              <Building2 className="w-3 h-3" />
                              <span>Gestão de Clientes</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={currentAdminTab === "audit"}
                            data-testid="nav-admin-audit"
                          >
                            <Link href="/admin?tab=audit">
                              <Activity className="w-3 h-3" />
                              <span>Auditoria</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Clientes</span>
            <Link href="/clients/new">
              <Button variant="ghost" size="icon" className="w-6 h-6" data-testid="button-add-client">
                <Plus className="w-3 h-3" />
              </Button>
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clients?.map((client) => (
                <Collapsible
                  key={client.id}
                  open={expandedClients.has(client.id)}
                  onOpenChange={() => toggleClient(client.id)}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={location === `/clients/${client.id}`}
                        data-testid={`nav-client-${client.id}`}
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={getImageUrl(client.imageUrl)} className="object-cover" />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{formatClientDisplayName(client)}</span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            expandedClients.has(client.id) ? "rotate-90" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {getClientProjects(client.id).map((project) => (
                          <SidebarMenuSubItem key={project.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === `/projects/${project.id}`}
                              data-testid={`nav-project-${project.id}`}
                            >
                              <Link href={`/projects/${project.id}`}>
                                <FolderKanban className="w-3 h-3" />
                                <span className="truncate">{project.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild data-testid={`button-new-project-${client.id}`}>
                            <Link href={`/projects/new?clientId=${client.id}`}>
                              <Plus className="w-3 h-3" />
                              <span>Novo Projeto</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild data-testid={`button-edit-client-${client.id}`}>
                            <Link href={`/clients/${client.id}/edit`}>
                              <Pencil className="w-3 h-3" />
                              <span>Editar Cliente</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
              {(!clients || clients.length === 0) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-testid="nav-clients-empty">
                    <Link href="/clients/new">
                      <Users className="w-4 h-4" />
                      <span className="text-muted-foreground">Adicionar primeiro cliente</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Avatar className="w-8 h-8 cursor-pointer hover-elevate">
              <AvatarImage src={getImageUrl(user?.profileImageUrl)} className="object-cover" />
              <AvatarFallback>
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href="/profile" className="block">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.firstName || user?.email?.split("@")[0] || "Usuario"}
              </p>
              <p className="text-xs truncate text-muted-foreground">{user?.email}</p>
            </Link>
          </div>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="w-8 h-8" data-testid="button-profile">
              <User className="w-4 h-4" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
