import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import type { Project, Roadmap, Stage } from "@shared/schema";

interface Phase {
  name: string;
  duration: string;
  deliverables: string[];
  objectives: string[];
  suggestedStartDate?: string;
  suggestedEndDate?: string;
}

interface Milestone {
  name: string;
  description: string;
  suggestedDate?: string;
  dependencies?: string[];
}

const phaseColors: Record<number, string> = {
  0: "bg-blue-500",
  1: "bg-purple-500",
  2: "bg-orange-500",
  3: "bg-pink-500",
  4: "bg-cyan-500",
  5: "bg-green-500",
};

export default function TimelinePage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/timeline");
  const projectId = params?.id;
  const [viewMode, setViewMode] = useState<"months" | "weeks">("months");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: roadmap, isLoading: roadmapLoading } = useQuery<Roadmap>({
    queryKey: ["/api/projects", projectId, "roadmap"],
    enabled: !!projectId,
  });

  const { data: stages, isLoading: stagesLoading } = useQuery<Stage[]>({
    queryKey: ["/api/projects", projectId, "stages"],
    enabled: !!projectId,
  });

  const isLoading = projectLoading || roadmapLoading || stagesLoading;

  const phases = (roadmap?.phases as Phase[]) || [];
  const milestones = (roadmap?.milestones as Milestone[]) || [];

  const now = new Date();
  const startDate = project?.startDate ? new Date(project.startDate) : now;
  const endDate = project?.deadline
    ? new Date(project.deadline)
    : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.ceil(totalDays / 7);
  const totalMonths = Math.ceil(totalDays / 30);

  const getMonthLabels = () => {
    const labels = [];
    const date = new Date(startDate);
    while (date <= endDate) {
      labels.push({
        month: date.toLocaleDateString("pt-BR", { month: "short" }),
        year: date.getFullYear(),
      });
      date.setMonth(date.getMonth() + 1);
    }
    return labels;
  };

  const getWeekLabels = () => {
    const labels = [];
    const date = new Date(startDate);
    let week = 1;
    while (date <= endDate) {
      labels.push({ week, date: new Date(date) });
      date.setDate(date.getDate() + 7);
      week++;
    }
    return labels;
  };

  const getPhasePosition = (index: number) => {
    const phaseDuration = 100 / phases.length;
    return {
      left: `${index * phaseDuration}%`,
      width: `${phaseDuration}%`,
    };
  };

  const getMilestonePosition = (index: number) => {
    const position = ((index + 1) / (milestones.length + 1)) * 100;
    return { left: `${position}%` };
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!roadmap || phases.length === 0) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground">{project?.name}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">Nenhum roadmap gerado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete o briefing para gerar o roadmap do projeto.
            </p>
            <Button onClick={() => navigate(`/projects/${projectId}/briefing`)}>
              Ir para Briefing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Timeline</h1>
            </div>
            <p className="text-sm text-muted-foreground">{project?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "months" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("months")}
            data-testid="button-view-months"
          >
            Meses
          </Button>
          <Button
            variant={viewMode === "weeks" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("weeks")}
            data-testid="button-view-weeks"
          >
            Semanas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fases</p>
                <p className="text-xl font-bold text-foreground">{phases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marcos</p>
                <p className="text-xl font-bold text-foreground">{milestones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="text-xl font-bold text-foreground">{totalDays} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Roadmap Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[800px] pb-4">
              <div className="flex border-b border-border pb-2 mb-4">
                {viewMode === "months" ? (
                  getMonthLabels().map((label, i) => (
                    <div key={i} className="flex-1 text-center text-sm text-muted-foreground">
                      <span className="font-medium">{label.month}</span>
                      <span className="text-xs ml-1">{label.year}</span>
                    </div>
                  ))
                ) : (
                  getWeekLabels().map((label, i) => (
                    <div key={i} className="flex-1 text-center text-sm text-muted-foreground">
                      <span className="font-medium">S{label.week}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="relative h-32 mb-8">
                <div className="absolute inset-0 bg-muted/30 rounded-lg" />
                {phases.map((phase, index) => {
                  const pos = getPhasePosition(index);
                  const stage = stages?.find((s) => s.name.toLowerCase().includes(phase.name.toLowerCase()));
                  const isComplete = stage?.status === "approved";
                  const isActive = stage?.status === "in_progress";

                  return (
                    <div
                      key={index}
                      className="absolute top-2 bottom-2"
                      style={{ left: pos.left, width: pos.width }}
                      data-testid={`phase-bar-${index}`}
                    >
                      <div
                        className={`h-full mx-1 rounded-lg flex flex-col justify-center px-3 ${
                          phaseColors[index % 6]
                        } ${isComplete ? "opacity-50" : ""} ${isActive ? "ring-2 ring-white ring-offset-2" : ""}`}
                      >
                        <p className="font-medium text-white text-sm truncate">
                          {phase.name}
                        </p>
                        <p className="text-xs text-white/80">{phase.duration}</p>
                        {isComplete && (
                          <CheckCircle2 className="w-4 h-4 text-white absolute top-2 right-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {milestones.length > 0 && (
                <>
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Marcos do Projeto
                  </div>
                  <div className="relative h-20 mb-4">
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
                    {milestones.map((milestone, index) => {
                      const pos = getMilestonePosition(index);
                      return (
                        <div
                          key={index}
                          className="absolute transform -translate-x-1/2"
                          style={{ left: pos.left }}
                          data-testid={`milestone-${index}`}
                        >
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Circle className="w-2 h-2 text-white fill-white" />
                            </div>
                            <div className="mt-2 text-center max-w-[120px]">
                              <p className="text-xs font-medium text-foreground truncate">
                                {milestone.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-foreground mb-3">Fases do Projeto</h4>
              <div className="space-y-2">
                {phases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`w-3 h-3 rounded-full ${phaseColors[index % 6]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{phase.name}</p>
                      <p className="text-xs text-muted-foreground">{phase.duration}</p>
                    </div>
                    <Badge variant="secondary">
                      {phase.deliverables?.length || 0} entregáveis
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Marcos</h4>
              <div className="space-y-2">
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum marco definido
                  </p>
                ) : (
                  milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <Circle className="w-3 h-3 mt-1 text-primary fill-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{milestone.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
