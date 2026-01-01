import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft,
  Activity,
  Search,
} from "lucide-react";
import type { Stage, Project } from "@shared/schema";
import { useState, useMemo } from "react";

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
  user?: { id: string; name: string } | null;
}

const ITEMS_PER_PAGE = 10;

const activityTypeLabels: Record<string, string> = {
  progress_update: "Atualização de Progresso",
  stage_approval: "Aprovação de Etapa",
  document_created: "Documento Criado",
  member_added: "Membro Adicionado",
  project_status_changed: "Status do Projeto Alterado",
};

export default function ActivityHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allActivity, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity/all"],
    queryFn: async () => {
      const response = await fetch("/api/activity/all");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  const filteredActivity = useMemo(() => {
    if (!allActivity) return [];

    let result = allActivity;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.description?.toLowerCase().includes(query) ||
          log.project?.name.toLowerCase().includes(query) ||
          log.stage?.name.toLowerCase().includes(query) ||
          log.user?.name.toLowerCase().includes(query)
      );
    }

    // Filter by activity type
    if (activityTypeFilter !== "all") {
      result = result.filter((log) => log.activityType === activityTypeFilter);
    }

    return result;
  }, [allActivity, searchQuery, activityTypeFilter]);

  const totalPages = Math.ceil(filteredActivity.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedActivity = filteredActivity.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getActivityTitle = (log: ActivityLog): string => {
    switch (log.activityType) {
      case "progress_update":
        return `${log.stage?.name || "Etapa"} atualizada`;
      case "stage_approval":
        return log.newStatus === "approved" ? "Etapa aprovada" : "Etapa rejeitada";
      case "document_created":
        return "Documento gerado";
      case "member_added":
        return "Membro adicionado";
      case "project_status_changed":
        return "Status do projeto alterado";
      default:
        return "Atividade registrada";
    }
  };

  const getActivitySubtitle = (log: ActivityLog): string => {
    switch (log.activityType) {
      case "progress_update":
        return `${log.project?.name || "Projeto"} - ${log.previousProgress}% para ${log.newProgress}%`;
      case "stage_approval":
        return `${log.project?.name || "Projeto"} - ${log.stage?.name || "Etapa"}`;
      case "document_created":
        return `${log.project?.name || "Projeto"} - ${log.description || "Documento"}`;
      case "member_added":
        return `${log.project?.name || "Projeto"} - ${log.description || "Novo membro"}`;
      case "project_status_changed":
        return `${log.project?.name || "Projeto"} - ${log.previousStatus} → ${log.newStatus}`;
      default:
        return log.project?.name || "Projeto";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4" style={{ paddingTop: "1rem" }}>
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico de Atividades</h1>
            <p className="text-sm text-muted-foreground">
              Total de {filteredActivity.length} atividade{filteredActivity.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Pesquisar
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquise por projeto, etapa, usuário..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8"
                  data-testid="input-search-activity"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Tipo de Atividade
              </label>
              <Select value={activityTypeFilter} onValueChange={(value) => {
                setActivityTypeFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger data-testid="select-activity-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="progress_update">Atualização de Progresso</SelectItem>
                  <SelectItem value="stage_approval">Aprovação de Etapa</SelectItem>
                  <SelectItem value="document_created">Documento Criado</SelectItem>
                  <SelectItem value="member_added">Membro Adicionado</SelectItem>
                  <SelectItem value="project_status_changed">Status do Projeto Alterado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Carregando atividades...</p>
              </div>
            ) : paginatedActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {filteredActivity.length === 0
                    ? "Nenhuma atividade encontrada"
                    : "Nenhuma atividade nesta página"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border transition-colors hover:bg-[#13151c]"
                    data-testid={`activity-item-${log.id}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">
                          {getActivityTitle(log)}
                        </p>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {activityTypeLabels[log.activityType]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getActivitySubtitle(log)}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mb-2 italic">
                          Nota: {log.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                        <span>
                          Por: <strong>{log.user?.name || "Usuário desconhecido"}</strong>
                        </span>
                        <span>
                          {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {paginatedActivity.length > 0 && totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(currentPage - 1)}
                      data-testid="button-prev-page"
                    />
                  </PaginationItem>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(currentPage + 1)}
                      data-testid="button-next-page"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
