import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListChecks,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ArrowLeft,
  FolderOpen
} from "lucide-react";

interface StageWithProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  projectId: string;
  projectName: string;
}

interface MyTasksResponse {
  assignments: StageWithProject[];
  totalStages: number;
  completedStages: number;
}

export default function MyTasks() {
  const { data, isLoading } = useQuery<MyTasksResponse>({
    queryKey: ["/api/users/me/tasks"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const groupedByProject = data?.assignments.reduce((acc, stage) => {
    if (!acc[stage.projectId]) {
      acc[stage.projectId] = {
        projectName: stage.projectName,
        stages: []
      };
    }
    acc[stage.projectId].stages.push(stage);
    return acc;
  }, {} as Record<string, { projectName: string; stages: StageWithProject[] }>) || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minhas Tarefas</h1>
              <p className="text-sm text-muted-foreground">
                Estágios atribuídos a você em todos os projetos
              </p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{data.completedStages}/{data.totalStages}</p>
                <p className="text-xs text-muted-foreground">concluídos</p>
              </div>
              <Progress 
                value={data.totalStages > 0 ? (data.completedStages / data.totalStages) * 100 : 0} 
                className="w-24 h-2" 
              />
            </div>
          )}
        </div>

        {Object.keys(groupedByProject).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByProject).map(([projectId, { projectName, stages }]) => (
              <Card key={projectId} data-testid={`card-project-tasks-${projectId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      {projectName}
                    </CardTitle>
                    <Link href={`/projects/${projectId}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-project-${projectId}`}>
                        Ver Projeto
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {stages.map((stage) => (
                      <div
                        key={stage.id}
                        className="py-3 flex items-center justify-between gap-4"
                        data-testid={`row-stage-${stage.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {stage.status === "approved" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : stage.status === "in_progress" ? (
                            <Clock className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{stage.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  stage.status === "approved"
                                    ? "bg-green-500/10 text-green-600"
                                    : stage.status === "in_progress"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : ""
                                }`}
                              >
                                {stage.status === "approved"
                                  ? "Aprovado"
                                  : stage.status === "in_progress"
                                  ? "Em andamento"
                                  : stage.status === "rejected"
                                  ? "Rejeitado"
                                  : "Pendente"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{stage.progress}%</p>
                            <Progress value={stage.progress || 0} className="w-20 h-1.5" />
                          </div>
                          <Link href={`/projects/${projectId}?tab=execution`}>
                            <Button variant="ghost" size="icon" data-testid={`button-go-stage-${stage.id}`}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">Nenhuma tarefa atribuída</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Você não tem estágios atribuídos em nenhum projeto.
              </p>
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-go-projects">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Ver Projetos
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
