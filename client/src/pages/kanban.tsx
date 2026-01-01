import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FolderKanban,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";
import type { Client, Project } from "@shared/schema";

const kanbanColumns = [
  { status: "briefing", label: "Briefing", color: "bg-yellow-500" },
  { status: "planning", label: "Planejamento", color: "bg-blue-500" },
  { status: "design", label: "Design", color: "bg-purple-500" },
  { status: "development", label: "Desenvolvimento", color: "bg-orange-500" },
  { status: "testing", label: "Testes", color: "bg-pink-500" },
  { status: "deploy", label: "Deploy", color: "bg-cyan-500" },
  { status: "completed", label: "Concluído", color: "bg-green-500" },
];

export default function KanbanPage() {
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const isLoading = clientsLoading || projectsLoading;

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.name || "Cliente";
  };

  const getProjectsByStatus = (status: string) => {
    return projects?.filter((p) => p.status === status) || [];
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="flex-shrink-0 w-72">
              <Skeleton className="h-8 w-full mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kanban</h1>
          <p className="text-muted-foreground">
            Visualize seus projetos por status
          </p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project-kanban">
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex gap-4 pb-4 min-h-full">
          {kanbanColumns.map((column) => {
            const columnProjects = getProjectsByStatus(column.status);
            return (
              <div
                key={column.status}
                className="flex-shrink-0 w-72"
                data-testid={`kanban-column-${column.status}`}
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-foreground">{column.label}</h3>
                  <Badge variant="secondary" size="sm" className="ml-auto">
                    {columnProjects.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {columnProjects.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum projeto
                      </p>
                    </div>
                  ) : (
                    columnProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                      >
                        <Card
                          className="cursor-pointer hover-elevate"
                          data-testid={`kanban-card-${project.id}`}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium text-foreground mb-2 line-clamp-2">
                              {project.name}
                            </h4>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <User className="w-3 h-3" />
                              <span className="truncate">
                                {getClientName(project.clientId)}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium text-foreground">
                                  {project.progress || 0}%
                                </span>
                              </div>
                              <Progress
                                value={project.progress || 0}
                                className="h-1.5"
                              />
                            </div>

                            {project.deadline && (
                              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(project.deadline).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
