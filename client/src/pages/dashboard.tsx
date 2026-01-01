import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Star,
  Activity,
  FileText,
  Bot,
  Download,
} from "lucide-react";
import type { Client, Project, Stage } from "@shared/schema";
import { useState, useMemo } from "react";

const statusColors: Record<string, string> = {
  briefing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  planning: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  design: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  development: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  testing: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  deploy: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const statusLabels: Record<string, string> = {
  briefing: "Briefing",
  planning: "Planejamento",
  design: "Design",
  development: "Desenvolvimento",
  testing: "Testes",
  deploy: "Deploy",
  completed: "Concluido",
};


interface MyTask {
  stage: Stage;
  project: Project;
  isOwner: boolean;
  isAssigned: boolean;
  canEdit: boolean;
}

interface ActivityLog {
  id: string;
  stageId?: string | null;
  projectId?: string | null;
  documentId?: string | null;
  memberId?: string | null;
  userId?: string | null;
  activityType: "progress_update" | "stage_approval" | "document_created" | "member_added" | "project_status_changed";
  previousProgress?: number | null;
  newProgress?: number | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  stage?: Stage | null;
  project?: Project | null;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedShortcutProjectId, setSelectedShortcutProjectId] = useState<string>("");

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery<MyTask[]>({
    queryKey: ["/api/my-tasks"],
  });

  const { data: activity } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    queryFn: async () => {
      const response = await fetch("/api/activity?limit=20");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const isLoading = clientsLoading || projectsLoading || tasksLoading;

  const activeProjects = projects?.filter((p) => p.status !== "completed") || [];
  const completedProjects = projects?.filter((p) => p.status === "completed") || [];
  
  // Auto-select first active project if no selection
  const shortcutProjectId = selectedShortcutProjectId || activeProjects[0]?.id;

  const filteredProjects = useMemo(() => {
    let result = projects || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    return result.slice(0, 6);
  }, [projects, searchQuery, statusFilter]);

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.name || "Cliente";
  };

  const urgentTasks = useMemo(() => {
    if (!myTasks || myTasks.length === 0) return [];
    return myTasks
      .filter((t) => {
        const status = t.stage?.status;
        const progress = t.stage?.progress ?? 0;
        return status !== "completed" && progress < 100;
      })
      .sort((a, b) => (b.stage?.weight || 0) - (a.stage?.weight || 0))
      .slice(0, 4);
  }, [myTasks]);

  const stats = [
    {
      label: "Total de Clientes",
      value: clients?.length || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Projetos Ativos",
      value: activeProjects.length,
      icon: FolderKanban,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Projetos Concluidos",
      value: completedProjects.length,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Em Desenvolvimento",
      value: projects?.filter((p) => p.status === "development").length || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Visão geral dos seus projetos e clientes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/clients/new">
            <Button variant="outline" data-testid="button-new-client-dashboard">
              <Users className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button data-testid="button-new-project-dashboard">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {urgentTasks.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Tarefas em Andamento</CardTitle>
            </div>
            <Link href="/my-tasks">
              <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {urgentTasks.map((task) => (
                <Link key={task.stage.id} href={`/projects/${task.project.id}`}>
                  <div
                    className="p-3 rounded-lg border border-border bg-background hover-elevate cursor-pointer"
                    data-testid={`urgent-task-${task.stage.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {task.stage.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.project.name}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {task.stage.progress || 0}%
                      </Badge>
                    </div>
                    <Progress value={task.stage.progress || 0} className="h-1.5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Projetos</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" data-testid="button-view-all-projects">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Nenhum projeto encontrado"
                    : "Nenhum projeto ainda"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Tente ajustar os filtros"
                    : "Crie seu primeiro projeto para comecar"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Link href="/projects/new">
                    <Button data-testid="button-create-first-project">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Projeto
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg border border-border hover-elevate h-full"
                    data-testid={`project-card-${project.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate cursor-pointer">
                          {project.name}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {getClientName(project.clientId)}
                        </p>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite.mutate(project.id);
                          }}
                          data-testid={`button-favorite-${project.id}`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              project.isFavorite
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                        <Badge
                          variant="secondary"
                          className={statusColors[project.status]}
                        >
                          {statusLabels[project.status]}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium text-foreground">
                            {project.progress || 0}%
                          </span>
                        </div>
                        <Progress value={project.progress || 0} className="h-2" />
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Atalhos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeProjects.length > 0 ? (
                <>
                  {activeProjects.length > 1 && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Selecione o projeto para usar os atalhos
                      </label>
                      <Select value={shortcutProjectId || ""} onValueChange={setSelectedShortcutProjectId}>
                        <SelectTrigger className="w-full" data-testid="select-shortcut-project">
                          <SelectValue placeholder="Escolha um projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id} data-testid={`option-project-${project.id}`}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-2">
                    Acesse rapidamente as funcionalidades do projeto
                  </p>
                  {shortcutProjectId && (
                    <>
                      <Link href={`/projects/${shortcutProjectId}/documents`}>
                        <Button variant="outline" className="w-full justify-start" data-testid="shortcut-documents">
                          <FileText className="w-4 h-4 mr-2" />
                          Gerenciar Documentos
                        </Button>
                      </Link>
                      <Link href={`/projects/${shortcutProjectId}/agents`}>
                        <Button variant="outline" className="w-full justify-start" data-testid="shortcut-agents">
                          <Bot className="w-4 h-4 mr-2" />
                          Análises Agentes IA
                        </Button>
                      </Link>
                      <Link href={`/projects/${shortcutProjectId}/export`}>
                        <Button variant="outline" className="w-full justify-start" data-testid="shortcut-export">
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Projeto
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <FolderKanban className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Crie um projeto para ver os atalhos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Atividades Recentes
              </CardTitle>
              <Link href="/activity-history">
                <Button variant="ghost" size="sm" data-testid="button-view-history">
                  Ver Histórico
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!activity || activity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade recente
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {activity.map((log) => {
                      let title = "";
                      let subtitle = "";
                      
                      switch (log.activityType) {
                        case "progress_update":
                          title = `${log.stage?.name || "Etapa"} atualizada`;
                          subtitle = `${log.project?.name || "Projeto"} - ${log.previousProgress}% para ${log.newProgress}%`;
                          break;
                        case "stage_approval":
                          title = log.newStatus === "approved" ? "Etapa aprovada" : "Etapa rejeitada";
                          subtitle = `${log.project?.name || "Projeto"} - ${log.stage?.name || "Etapa"}`;
                          break;
                        case "document_created":
                          title = "Documento gerado";
                          subtitle = `${log.project?.name || "Projeto"} - ${log.description || "Documento"}`;
                          break;
                        case "member_added":
                          title = "Membro adicionado";
                          subtitle = `${log.project?.name || "Projeto"} - ${log.description || "Novo membro"}`;
                          break;
                        case "project_status_changed":
                          title = "Status do projeto alterado";
                          subtitle = `${log.project?.name || "Projeto"} - ${log.previousStatus} → ${log.newStatus}`;
                          break;
                        default:
                          title = "Atividade registrada";
                          subtitle = log.project?.name || "Projeto";
                      }
                      
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover-elevate"
                          data-testid={`activity-log-${log.id}`}
                        >
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">
                              {title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {subtitle}
                            </p>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {log.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
