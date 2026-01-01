import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  CheckSquare,
  Code,
  Loader2,
  Brain,
  Target,
  Calendar,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  ListChecks,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  BookOpen,
  Shield,
  Bot,
  Trash2,
  Users,
  UserPlus,
  Mail,
  Briefcase,
  Pencil,
  Eye,
  EyeOff,
  Timer,
  Zap,
  TrendingUp,
  TrendingDown,
  Palette,
  Package,
  Sparkles,
  Check,
  Calculator,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Project, Briefing, Scope, Roadmap, Stage, Checklist, Document, AiCommand, Client, ProjectMember, StageAssignment, Task } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Square, SquareCheck, X, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  briefing: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  planning: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  design: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  development: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  testing: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  deploy: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const statusLabels: Record<string, string> = {
  briefing: "Briefing",
  planning: "Planejamento",
  design: "Design",
  development: "Desenvolvimento",
  testing: "Testes",
  deploy: "Deploy",
  completed: "Concluído",
};

const methodologyLabels: Record<string, string> = {
  scrum: "Scrum",
  kanban: "Kanban",
  waterfall: "Waterfall",
  hybrid: "Híbrido",
};

// Extrai um resumo limpo do conteúdo markdown
function getDocumentSummary(content: string | null | undefined, maxLength: number = 180): string {
  if (!content) return "Sem conteúdo disponível";
  
  // Remove markdown headers (# ## ### etc)
  let text = content.replace(/^#{1,6}\s+.*$/gm, '');
  // Remove markdown links [text](url)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown bold/italic **text** *text* __text__ _text_
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove markdown code blocks ```code```
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove inline code `code`
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove markdown horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove markdown list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  // Remove markdown blockquotes
  text = text.replace(/^>\s*/gm, '');
  // Remove multiple newlines and trim
  text = text.replace(/\n{2,}/g, ' ');
  text = text.replace(/\n/g, ' ');
  // Remove extra spaces
  text = text.replace(/\s{2,}/g, ' ').trim();
  
  // Find first meaningful sentence or paragraph
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  if (sentences.length > 0) {
    const summary = sentences.slice(0, 2).join(' ');
    if (summary.length > maxLength) {
      return summary.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
    }
    return summary;
  }
  
  // Fallback to first N characters
  if (text.length > maxLength) {
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  return text || "Sem resumo disponível";
}

interface StageTasksListProps {
  stageId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (title: string) => void;
  onCreateTask: (title: string) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  isCreating: boolean;
}

function StageTasksList({
  stageId,
  isExpanded,
  onToggleExpand,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
  onToggleTask,
  isCreating,
}: StageTasksListProps) {
  const { toast } = useToast();
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/stages", stageId, "tasks"],
    enabled: !!stageId,
  });

  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/stages/${stageId}/generate-tasks`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages", stageId, "tasks"] });
      toast({
        title: "Tarefas geradas",
        description: "As tarefas padrão foram criadas para este estágio.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar as tarefas.",
        variant: "destructive",
      });
    },
  });

  const completedCount = tasks?.filter(t => t.status === "completed").length || 0;
  const totalCount = tasks?.length || 0;

  return (
    <div className="pt-3 border-t border-border">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center justify-between w-full text-left hover-elevate rounded p-1 -m-1"
            data-testid={`button-toggle-tasks-${stageId}`}
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              Tarefas {totalCount > 0 && `(${completedCount}/${totalCount})`}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {tasks && tasks.length > 0 ? (
                  <ul className="space-y-1">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover-elevate rounded p-1 -m-1"
                        onClick={() => onToggleTask(task.id, task.status !== "completed")}
                        data-testid={`task-item-${task.id}`}
                      >
                        {task.status === "completed" ? (
                          <SquareCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}>
                          {task.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa criada</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateTasksMutation.mutate()}
                      disabled={generateTasksMutation.isPending}
                      data-testid={`button-generate-tasks-${stageId}`}
                    >
                      {generateTasksMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Gerar Tarefas Automáticas
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Nova tarefa..."
                    value={newTaskTitle}
                    onChange={(e) => onNewTaskTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim()) {
                        onCreateTask(newTaskTitle.trim());
                      }
                    }}
                    className="h-8 text-sm"
                    data-testid={`input-new-task-${stageId}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (newTaskTitle.trim()) {
                        onCreateTask(newTaskTitle.trim());
                      }
                    }}
                    disabled={!newTaskTitle.trim() || isCreating}
                    data-testid={`button-add-task-${stageId}`}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function ProjectDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", project?.clientId],
    enabled: !!project?.clientId,
  });

  const { data: briefing } = useQuery<Briefing>({
    queryKey: ["/api/projects", projectId, "briefing"],
    enabled: !!projectId,
  });

  const { data: scope } = useQuery<Scope>({
    queryKey: ["/api/projects", projectId, "scope"],
    enabled: !!projectId,
  });

  const { data: roadmap } = useQuery<Roadmap>({
    queryKey: ["/api/projects", projectId, "roadmap"],
    enabled: !!projectId,
  });

  const { data: stages } = useQuery<Stage[]>({
    queryKey: ["/api/projects", projectId, "stages"],
    enabled: !!projectId,
  });

  const { data: checklists } = useQuery<Checklist[]>({
    queryKey: ["/api/projects", projectId, "checklists"],
    enabled: !!projectId,
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/projects", projectId, "documents"],
    enabled: !!projectId,
  });

  const { data: aiCommand } = useQuery<AiCommand>({
    queryKey: ["/api/projects", projectId, "ai-command"],
    enabled: !!projectId,
  });

  const { data: members } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", projectId, "members"],
    enabled: !!projectId,
  });

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "contributor", specialty: "", password: "" });
  const [assignStageId, setAssignStageId] = useState<string | null>(null);
  const [selectedMemberToAssign, setSelectedMemberToAssign] = useState<string>("");
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [editMemberData, setEditMemberData] = useState({ name: "", role: "", specialty: "", password: "" });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [showProjectDatesModal, setShowProjectDatesModal] = useState(false);
  const [projectStartDate, setProjectStartDate] = useState<Date | undefined>(undefined);
  const [projectEndDate, setProjectEndDate] = useState<Date | undefined>(undefined);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  
  // Roadmap editing state
  const [editingRoadmap, setEditingRoadmap] = useState(false);
  const [editRoadmapPhases, setEditRoadmapPhases] = useState<any[]>([]);
  const [editRoadmapMilestones, setEditRoadmapMilestones] = useState<any[]>([]);

  const addMemberMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; role: string; specialty?: string; password: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setShowAddMemberModal(false);
      setNewMember({ name: "", email: "", role: "contributor", specialty: "", password: "" });
      toast({
        title: "Membro adicionado",
        description: "O profissional foi adicionado à equipe.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o membro.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/members/${memberId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({
        title: "Membro removido",
        description: "O profissional foi removido da equipe.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro.",
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: Partial<ProjectMember> }) => {
      return await apiRequest("PUT", `/api/projects/${projectId}/members/${memberId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({
        title: "Membro atualizado",
        description: "As informações do profissional foram atualizadas.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o membro.",
        variant: "destructive",
      });
    },
  });

  const assignStageMutation = useMutation({
    mutationFn: async ({ stageId, memberId }: { stageId: string; memberId: string }) => {
      return await apiRequest("POST", `/api/stages/${stageId}/assignments`, { memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      setAssignStageId(null);
      setSelectedMemberToAssign("");
      toast({
        title: "Membro atribuído",
        description: "O profissional foi atribuído ao estágio.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o membro.",
        variant: "destructive",
      });
    },
  });

  const regenerateAiCommandMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/ai-command/regenerate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "ai-command"] });
      toast({
        title: "Comando Regenerado",
        description: "O comando para IA foi atualizado.",
      });
    },
  });

  const approveStage = useMutation({
    mutationFn: async ({ stageId, approved, comment }: { stageId: string; approved: boolean; comment?: string }) => {
      return await apiRequest("POST", `/api/stages/${stageId}/approve`, { approved, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      toast({
        title: "Estágio atualizado",
        description: "O status do estágio foi alterado.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estágio.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Projeto excluído",
        description: "O projeto foi removido com sucesso.",
        variant: "success",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistId, items }: { checklistId: string; items: any[] }) => {
      return await apiRequest("PUT", `/api/checklists/${checklistId}`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "checklists"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o checklist.",
        variant: "destructive",
      });
    },
  });

  const toggleChecklistItem = (checklist: Checklist, itemIndex: number) => {
    const items = [...(checklist.items as any[])];
    items[itemIndex] = { ...items[itemIndex], checked: !items[itemIndex].checked };
    updateChecklistMutation.mutate({ checklistId: checklist.id, items });
  };

  const createTaskMutation = useMutation({
    mutationFn: async ({ stageId, title }: { stageId: string; title: string }) => {
      return await apiRequest("POST", `/api/stages/${stageId}/tasks`, { title });
    },
    onSuccess: (_, { stageId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages", stageId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      setNewTaskTitle(prev => ({ ...prev, [stageId]: "" }));
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi adicionada ao estágio.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return await apiRequest("PUT", `/api/tasks/${taskId}`, { 
        status: completed ? "completed" : "pending" 
      });
    },
    onSuccess: () => {
      stages?.forEach(stage => {
        queryClient.invalidateQueries({ queryKey: ["/api/stages", stage.id, "tasks"] });
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const updateProjectDatesMutation = useMutation({
    mutationFn: async (dates: { startDate: Date | undefined; estimatedEndDate: Date | undefined }) => {
      return await apiRequest("PUT", `/api/projects/${projectId}`, {
        startDate: dates.startDate?.toISOString() || null,
        estimatedEndDate: dates.estimatedEndDate?.toISOString() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowProjectDatesModal(false);
      toast({
        title: "Datas atualizadas",
        description: "As datas do projeto foram atualizadas.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as datas.",
        variant: "destructive",
      });
    },
  });

  const updateRoadmapMutation = useMutation({
    mutationFn: async (data: { phases: any[]; milestones: any[] }) => {
      return await apiRequest("PUT", `/api/projects/${projectId}/roadmap`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "roadmap"] });
      setEditingRoadmap(false);
      toast({
        title: "Roadmap atualizado",
        description: "As alterações foram salvas com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o roadmap.",
        variant: "destructive",
      });
    },
  });

  const startEditingRoadmap = () => {
    setEditRoadmapPhases(JSON.parse(JSON.stringify(phases)));
    setEditRoadmapMilestones(JSON.parse(JSON.stringify(milestones)));
    setEditingRoadmap(true);
  };

  const saveRoadmap = () => {
    updateRoadmapMutation.mutate({
      phases: editRoadmapPhases,
      milestones: editRoadmapMilestones,
    });
  };

  const cancelEditingRoadmap = () => {
    setEditingRoadmap(false);
  };

  const updatePhase = (index: number, field: string, value: any) => {
    const updated = [...editRoadmapPhases];
    updated[index] = { ...updated[index], [field]: value };
    setEditRoadmapPhases(updated);
  };

  const updatePhaseTask = (phaseIndex: number, taskIndex: number, value: string) => {
    const updated = [...editRoadmapPhases];
    const tasks = [...(updated[phaseIndex].tasks || [])];
    tasks[taskIndex] = value;
    updated[phaseIndex] = { ...updated[phaseIndex], tasks };
    setEditRoadmapPhases(updated);
  };

  const addPhaseTask = (phaseIndex: number) => {
    const updated = [...editRoadmapPhases];
    const tasks = [...(updated[phaseIndex].tasks || []), ""];
    updated[phaseIndex] = { ...updated[phaseIndex], tasks };
    setEditRoadmapPhases(updated);
  };

  const removePhaseTask = (phaseIndex: number, taskIndex: number) => {
    const updated = [...editRoadmapPhases];
    const tasks = [...(updated[phaseIndex].tasks || [])];
    tasks.splice(taskIndex, 1);
    updated[phaseIndex] = { ...updated[phaseIndex], tasks };
    setEditRoadmapPhases(updated);
  };

  const addPhase = () => {
    setEditRoadmapPhases([...editRoadmapPhases, { name: "", description: "", duration: "", tasks: [] }]);
  };

  const removePhase = (index: number) => {
    const updated = [...editRoadmapPhases];
    updated.splice(index, 1);
    setEditRoadmapPhases(updated);
  };

  const exportRoadmap = () => {
    if (!roadmap) return;

    let content = `ROADMAP DO PROJETO: ${project.name}\n`;
    content += `${"=".repeat(50)}\n\n`;

    if (phases.length > 0) {
      content += "FASES DO PROJETO\n";
      content += `${"-".repeat(30)}\n\n`;

      phases.forEach((phase: any, index: number) => {
        content += `${index + 1}. ${phase.name}`;
        if (phase.duration) content += ` (${phase.duration})`;
        content += "\n";
        if (phase.description) content += `   ${phase.description}\n`;
        if (phase.tasks && phase.tasks.length > 0) {
          content += "\n   Tarefas:\n";
          phase.tasks.forEach((task: string) => {
            content += `   - ${task}\n`;
          });
        }
        content += "\n";
      });
    }

    if (milestones.length > 0) {
      content += "\nMARCOS DO PROJETO\n";
      content += `${"-".repeat(30)}\n\n`;

      milestones.forEach((milestone: any, index: number) => {
        content += `${index + 1}. ${milestone.name}`;
        if (milestone.date) {
          content += ` - ${new Date(milestone.date).toLocaleDateString("pt-BR")}`;
        }
        content += "\n";
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap_${project.name.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Roadmap exportado",
      description: "O arquivo foi baixado com sucesso.",
      variant: "success",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Comando copiado para a área de transferência.",
      variant: "success",
    });
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Projeto não encontrado</p>
      </div>
    );
  }

  const deliverables = (scope?.deliverables as string[]) || [];
  const risks = (scope?.risks as string[]) || [];
  const phases = (roadmap?.phases as any[]) || [];
  const milestones = (roadmap?.milestones as any[]) || [];

  const calculateProjectTime = () => {
    const startDate = project?.startDate ? new Date(project.startDate) : null;
    const endDate = project?.estimatedEndDate ? new Date(project.estimatedEndDate) : null;
    const today = new Date();
    
    if (!startDate || !endDate) return null;
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const expectedProgress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
    const actualProgress = project?.progress || 0;
    const progressDifference = actualProgress - expectedProgress;
    
    let alertLevel: "success" | "warning" | "danger" = "success";
    if (progressDifference < -20) alertLevel = "danger";
    else if (progressDifference < -10) alertLevel = "warning";
    
    return {
      totalDays,
      elapsedDays: Math.max(0, elapsedDays),
      remainingDays: Math.max(0, remainingDays),
      expectedProgress,
      actualProgress,
      progressDifference,
      alertLevel,
      isOverdue: remainingDays < 0,
    };
  };

  const projectTime = calculateProjectTime();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-background flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  data-testid="button-delete-project"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o projeto "{project.name}"? Esta ação não pode ser desfeita e todos os dados serão perdidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteProjectMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteProjectMutation.isPending}
                  >
                    {deleteProjectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">
                  {project.name}
                </h1>
                <Badge className={statusColors[project.status]} variant="secondary">
                  {statusLabels[project.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {client?.company && `${client.company} - `}{client?.name} - {methodologyLabels[project.methodology || "hybrid"]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {projectTime ? (
              <button
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted hover-elevate cursor-pointer"
                onClick={() => {
                  setProjectStartDate(project?.startDate ? new Date(project.startDate) : undefined);
                  setProjectEndDate(project?.estimatedEndDate ? new Date(project.estimatedEndDate) : undefined);
                  setShowProjectDatesModal(true);
                }}
                data-testid="button-edit-dates"
              >
                <Timer className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  {projectTime.isOverdue ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      Atrasado por {Math.abs(projectTime.remainingDays)} dias
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">
                      {projectTime.remainingDays} dias restantes
                    </span>
                  )}
                </div>
                {projectTime.alertLevel === "danger" && (
                  <Badge variant="destructive" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Acelerar
                  </Badge>
                )}
                {projectTime.alertLevel === "warning" && (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Atenção
                  </Badge>
                )}
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProjectDatesModal(true)}
                data-testid="button-set-dates"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Definir Cronograma
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="font-semibold text-foreground">{project.progress || 0}%</p>
              </div>
              <Progress value={project.progress || 0} className="w-32 h-2" />
            </div>
            {project.status === "briefing" && (
              <Link href={`/projects/${projectId}/briefing`}>
                <Button data-testid="button-continue-briefing">
                  <Brain className="w-4 h-4 mr-2" />
                  Continuar Briefing
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-border px-4 md:px-6 flex-shrink-0">
            <TabsList className="h-12 bg-transparent gap-2">
              <Link href={`/projects/${projectId}/briefing`}>
                <Button variant="ghost" size="sm" className="h-9" data-testid="button-briefing-nav">
                  <Brain className="w-4 h-4 mr-2" />
                  Briefing
                </Button>
              </Link>
              <TabsTrigger value="overview" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-overview">
                <Target className="w-4 h-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <Link href={`/projects/${projectId}/scope`}>
                <Button variant="ghost" size="sm" className="h-9" data-testid="button-scope-nav">
                  <FileText className="w-4 h-4 mr-2" />
                  Escopo Completo
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/styles`}>
                <Button variant="ghost" size="sm" className="h-9" data-testid="button-styles-nav">
                  <Palette className="w-4 h-4 mr-2" />
                  Estilos
                </Button>
              </Link>
              <TabsTrigger value="roadmap" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-roadmap">
                <GitBranch className="w-4 h-4 mr-2" />
                Roadmap
              </TabsTrigger>
              <TabsTrigger value="execution" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-execution">
                <ListChecks className="w-4 h-4 mr-2" />
                Execução
              </TabsTrigger>
              <TabsTrigger value="ai-command" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-ai-command">
                <Code className="w-4 h-4 mr-2" />
                Comando IA
              </TabsTrigger>
              <TabsTrigger value="docs" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-docs">
                <BookOpen className="w-4 h-4 mr-2" />
                Documentações
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-team">
                <Users className="w-4 h-4 mr-2" />
                Equipe
              </TabsTrigger>
              <TabsTrigger value="proposal" className="data-[state=active]:bg-muted hover-elevate" data-testid="tab-proposal">
                <FileText className="w-4 h-4 mr-2" />
                Proposta
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Objetivo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-foreground">
                          {scope?.objective || briefing?.businessObjective || "Objetivo não definido ainda."}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckSquare className="w-5 h-5" />
                          Entregáveis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {deliverables.length > 0 ? (
                          <ul className="space-y-2">
                            {deliverables.map((item: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <span className="text-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">Entregáveis serão definidos após o briefing.</p>
                        )}
                      </CardContent>
                    </Card>

                    {risks.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            Riscos Identificados
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {risks.map((risk: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                                <span className="text-foreground">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Detalhes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo de Projeto</p>
                          <p className="font-medium text-foreground">{briefing?.projectType || "Não definido"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stack</p>
                          <p className="font-medium text-foreground">{briefing?.stack || "Não definida"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Prazo</p>
                          <p className="font-medium text-foreground">
                            {project?.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString("pt-BR") : (briefing?.deadline ? new Date(briefing.deadline).toLocaleDateString("pt-BR") : "Não definido")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Orçamento</p>
                          <p className="font-medium text-foreground">{briefing?.budget || "Não definido"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Estágios
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stages && stages.length > 0 ? (
                          <div className="space-y-3">
                            {stages.sort((a, b) => a.order - b.order).map((stage) => (
                              <div key={stage.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">{stage.name}</span>
                                  <span className="text-xs text-muted-foreground">{stage.progress}%</span>
                                </div>
                                <Progress value={stage.progress || 0} className="h-1.5" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Estágios serão criados após o briefing.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roadmap" className="mt-0">
                <div className="space-y-6">
                  {/* Action buttons */}
                  {phases.length > 0 && (
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {editingRoadmap ? (
                        <>
                          <Button variant="outline" onClick={cancelEditingRoadmap} data-testid="button-cancel-roadmap">
                            Cancelar
                          </Button>
                          <Button onClick={saveRoadmap} disabled={updateRoadmapMutation.isPending} data-testid="button-save-roadmap">
                            {updateRoadmapMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Salvar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={exportRoadmap} data-testid="button-export-roadmap">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                          </Button>
                          <Button variant="outline" onClick={startEditingRoadmap} data-testid="button-edit-roadmap">
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {editingRoadmap ? (
                    /* Edit mode */
                    <div className="space-y-6">
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                        <div className="space-y-6">
                          {editRoadmapPhases.map((phase: any, index: number) => (
                            <div key={index} className="relative pl-10">
                              <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary" />
                              <Card>
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <Input
                                      value={phase.name}
                                      onChange={(e) => updatePhase(index, "name", e.target.value)}
                                      placeholder="Nome da fase"
                                      className="font-semibold"
                                      data-testid={`input-phase-name-${index}`}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={phase.duration || ""}
                                        onChange={(e) => updatePhase(index, "duration", e.target.value)}
                                        placeholder="Duração"
                                        className="w-24"
                                        data-testid={`input-phase-duration-${index}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removePhase(index)}
                                        className="text-destructive"
                                        data-testid={`button-remove-phase-${index}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <Input
                                    value={phase.description || ""}
                                    onChange={(e) => updatePhase(index, "description", e.target.value)}
                                    placeholder="Descrição da fase"
                                    data-testid={`input-phase-description-${index}`}
                                  />
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Tarefas</Label>
                                    {(phase.tasks || []).map((task: string, taskIndex: number) => (
                                      <div key={taskIndex} className="flex items-center gap-2">
                                        <Input
                                          value={task}
                                          onChange={(e) => updatePhaseTask(index, taskIndex, e.target.value)}
                                          placeholder="Tarefa"
                                          data-testid={`input-task-${index}-${taskIndex}`}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removePhaseTask(index, taskIndex)}
                                          className="text-destructive shrink-0"
                                          data-testid={`button-remove-task-${index}-${taskIndex}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addPhaseTask(index)}
                                      data-testid={`button-add-task-${index}`}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Adicionar Tarefa
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" onClick={addPhase} className="w-full" data-testid="button-add-phase">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Fase
                      </Button>
                    </div>
                  ) : phases.length > 0 ? (
                    /* View mode */
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-6">
                        {phases.map((phase: any, index: number) => (
                          <div key={index} className="relative pl-10">
                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary" />
                            <Card>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <CardTitle className="text-base">{phase.name}</CardTitle>
                                  {phase.duration && (
                                    <Badge variant="secondary">{phase.duration}</Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">{phase.description}</p>
                                {phase.tasks && phase.tasks.length > 0 && (
                                  <ul className="mt-3 space-y-1">
                                    {phase.tasks.map((task: string, taskIndex: number) => (
                                      <li key={taskIndex} className="text-sm text-foreground flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Roadmap não gerado</h3>
                        <p className="text-sm text-muted-foreground">
                          O roadmap será gerado automaticamente após o briefing.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {milestones.length > 0 && !editingRoadmap && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Marcos do Projeto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {milestones.map((milestone: any, index: number) => (
                            <div key={index} className="p-4 rounded-lg bg-muted">
                              <p className="font-medium text-foreground">{milestone.name}</p>
                              {milestone.date && (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(milestone.date).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="execution" className="mt-0">
                <div className="space-y-6">
                  {projectTime && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <p className="text-2xl font-bold text-foreground">{projectTime.elapsedDays}</p>
                            <p className="text-xs text-muted-foreground">Dias decorridos</p>
                          </div>
                          <div className={`text-center p-3 rounded-lg ${projectTime.isOverdue ? "bg-red-500/10" : "bg-muted"}`}>
                            <p className={`text-2xl font-bold ${projectTime.isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                              {projectTime.isOverdue ? `-${Math.abs(projectTime.remainingDays)}` : projectTime.remainingDays}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {projectTime.isOverdue ? "Dias de atraso" : "Dias restantes"}
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <div className="flex items-center justify-center gap-1">
                              <p className="text-2xl font-bold text-foreground">{projectTime.expectedProgress}%</p>
                              {projectTime.progressDifference >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Progresso esperado</p>
                          </div>
                          <div className={`text-center p-3 rounded-lg ${
                            projectTime.alertLevel === "danger" ? "bg-red-500/10" :
                            projectTime.alertLevel === "warning" ? "bg-yellow-500/10" :
                            "bg-green-500/10"
                          }`}>
                            <p className={`text-2xl font-bold ${
                              projectTime.alertLevel === "danger" ? "text-red-600 dark:text-red-400" :
                              projectTime.alertLevel === "warning" ? "text-yellow-600 dark:text-yellow-400" :
                              "text-green-600 dark:text-green-400"
                            }`}>
                              {projectTime.progressDifference >= 0 ? "+" : ""}{projectTime.progressDifference}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {projectTime.progressDifference >= 0 ? "Adiantado" : "Atrasado"}
                            </p>
                          </div>
                        </div>
                        {projectTime.alertLevel !== "success" && (
                          <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                            projectTime.alertLevel === "danger" ? "bg-red-500/10" : "bg-yellow-500/10"
                          }`}>
                            {projectTime.alertLevel === "danger" ? (
                              <Zap className="w-5 h-5 text-red-500" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            )}
                            <div>
                              <p className={`font-medium ${
                                projectTime.alertLevel === "danger" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                              }`}>
                                {projectTime.alertLevel === "danger" ? "Necessário acelerar o projeto" : "Atenção ao cronograma"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                O progresso está {Math.abs(projectTime.progressDifference)}% abaixo do esperado para o tempo decorrido.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Estágios do Projeto</h2>
                      <p className="text-sm text-muted-foreground">
                        Gerencie o progresso e aprovação de cada estágio
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/projects/${projectId}/agents`}>
                        <Button variant="outline" data-testid="button-view-agents">
                          <Bot className="w-4 h-4 mr-2" />
                          Análises Agentes IA
                        </Button>
                      </Link>
                      <Link href={`/projects/${projectId}/mindmap`}>
                        <Button variant="outline" data-testid="button-view-mindmap">
                          <GitBranch className="w-4 h-4 mr-2" />
                          Mapa Mental
                        </Button>
                      </Link>
                      <Link href={`/projects/${projectId}/vault`}>
                        <Button variant="outline" data-testid="button-view-vault">
                          <Shield className="w-4 h-4 mr-2" />
                          Cofre
                        </Button>
                      </Link>
                      <Link href={`/projects/${projectId}/timeline`}>
                        <Button variant="outline" data-testid="button-view-timeline">
                          <Calendar className="w-4 h-4 mr-2" />
                          Timeline
                        </Button>
                      </Link>
                      <Link href={`/projects/${projectId}/export`}>
                        <Button variant="outline" data-testid="button-view-export">
                          <Package className="w-4 h-4 mr-2" />
                          Exportar Projeto
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {stages && stages.length > 0 ? (
                    <div className="space-y-4">
                      {stages.sort((a, b) => a.order - b.order).map((stage) => {
                        const approvalHistory = (stage.approvalHistory as any[]) || [];
                        const isApproved = stage.status === "approved";
                        const isRejected = stage.status === "rejected";
                        const canApprove = (stage.progress || 0) >= 100 && !isApproved;
                        
                        return (
                          <Card key={stage.id} data-testid={`stage-card-${stage.id}`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    isApproved ? "bg-green-500/10" :
                                    isRejected ? "bg-red-500/10" :
                                    stage.status === "in_progress" ? "bg-blue-500/10" :
                                    "bg-muted"
                                  }`}>
                                    {isApproved ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                                     isRejected ? <XCircle className="w-5 h-5 text-red-500" /> :
                                     stage.status === "in_progress" ? <Clock className="w-5 h-5 text-blue-500" /> :
                                     <ListChecks className="w-5 h-5 text-muted-foreground" />}
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{stage.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">Peso: {stage.weight}%</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="secondary"
                                    className={
                                      isApproved ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                      isRejected ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                                      stage.status === "in_progress" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                      ""
                                    }
                                  >
                                    {isApproved ? "Aprovado" : 
                                     isRejected ? "Rejeitado" :
                                     stage.status === "in_progress" ? "Em andamento" : 
                                     "Pendente"}
                                  </Badge>
                                  {canApprove && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => approveStage.mutate({ stageId: stage.id, approved: true })}
                                        disabled={approveStage.isPending}
                                        data-testid={`button-approve-${stage.id}`}
                                      >
                                        {approveStage.isPending ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Aprovar
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => approveStage.mutate({ stageId: stage.id, approved: false })}
                                        disabled={approveStage.isPending}
                                        data-testid={`button-reject-${stage.id}`}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Rejeitar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-medium text-foreground">{stage.progress}%</span>
                                  </div>
                                  <Progress value={stage.progress || 0} className="h-2" />
                                </div>

                                {isApproved && stage.approvedAt && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    Aprovado em {new Date(stage.approvedAt).toLocaleDateString("pt-BR")}
                                  </div>
                                )}

                                {approvalHistory.length > 0 && (
                                  <div className="pt-2 border-t border-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                      <History className="w-3 h-3" />
                                      Histórico de aprovações
                                    </div>
                                    <div className="space-y-1">
                                      {approvalHistory.slice(-3).reverse().map((entry: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          {entry.action === "approved" ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-red-500" />
                                          )}
                                          <span className="text-muted-foreground">
                                            {entry.action === "approved" ? "Aprovado" : "Rejeitado"} em{" "}
                                            {new Date(entry.timestamp).toLocaleDateString("pt-BR")}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="pt-3 border-t border-border">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      Responsáveis
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setAssignStageId(stage.id)}
                                      data-testid={`button-assign-${stage.id}`}
                                    >
                                      <UserPlus className="w-3 h-3 mr-1" />
                                      Atribuir
                                    </Button>
                                  </div>
                                  {((stage as any).assignments?.length > 0) && (
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {((stage as any).assignments as any[]).map((assignment: any) => (
                                        <Badge 
                                          key={assignment.id} 
                                          variant="secondary" 
                                          className="text-xs"
                                          data-testid={`badge-assignee-${assignment.id}`}
                                        >
                                          {assignment.member?.name || "Membro"}
                                          {assignment.member?.specialty && (
                                            <span className="ml-1 text-muted-foreground">
                                              ({assignment.member.specialty})
                                            </span>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <StageTasksList 
                                  stageId={stage.id}
                                  isExpanded={expandedStages[stage.id] || false}
                                  onToggleExpand={() => setExpandedStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                                  newTaskTitle={newTaskTitle[stage.id] || ""}
                                  onNewTaskTitleChange={(title) => setNewTaskTitle(prev => ({ ...prev, [stage.id]: title }))}
                                  onCreateTask={(title) => createTaskMutation.mutate({ stageId: stage.id, title })}
                                  onToggleTask={(taskId, completed) => toggleTaskMutation.mutate({ taskId, completed })}
                                  isCreating={createTaskMutation.isPending}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Estágios não criados</h3>
                        <p className="text-sm text-muted-foreground">
                          Os estágios serão criados após o briefing.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {checklists && checklists.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-foreground">Checklists</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {checklists.map((checklist) => (
                          <Card key={checklist.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base capitalize">{checklist.type}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {(checklist.items as any[])?.map((item: any, index: number) => (
                                  <li
                                    key={index}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover-elevate rounded p-1 -m-1"
                                    onClick={() => toggleChecklistItem(checklist, index)}
                                    data-testid={`checklist-item-${checklist.id}-${index}`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                        item.checked ? "bg-primary border-primary" : "border-muted-foreground"
                                      }`}
                                    >
                                      {item.checked && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    <span className={item.checked ? "line-through text-muted-foreground" : "text-foreground"}>
                                      {item.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai-command" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Comando para IA de Desenvolvimento</h2>
                      <p className="text-sm text-muted-foreground">
                        Use este comando com Cursor, Devin, Windsurf ou ChatGPT Dev
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => regenerateAiCommandMutation.mutate()}
                        disabled={regenerateAiCommandMutation.isPending}
                        data-testid="button-regenerate-command"
                      >
                        {regenerateAiCommandMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Regenerar
                      </Button>
                    </div>
                  </div>

                  {aiCommand ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                          <CardTitle className="text-base">Prompt Técnico</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(aiCommand.promptText || "")}
                            data-testid="button-copy-prompt"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                            {aiCommand.promptText}
                          </pre>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                          <CardTitle className="text-base">JSON Estruturado</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(JSON.stringify(aiCommand.jsonCommand, null, 2))}
                            data-testid="button-copy-json"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                            {JSON.stringify(aiCommand.jsonCommand, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Code className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Comando não gerado</h3>
                        <p className="text-sm text-muted-foreground">
                          O comando para IA será gerado após o briefing.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Documentações do Projeto</h2>
                      <p className="text-sm text-muted-foreground">
                        Documentações geradas automaticamente por IA
                      </p>
                    </div>
                    <Link href={`/projects/${projectId}/documents`}>
                      <Button data-testid="button-manage-docs">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Gerenciar Documentos
                      </Button>
                    </Link>
                  </div>

                  {documents && documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-base">{doc.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{doc.type}</Badge>
                                <AlertDialog open={deleteDocId === doc.id} onOpenChange={(open) => !open && setDeleteDocId(null)}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteDocId(doc.id)}
                                      data-testid={`button-delete-doc-${doc.id}`}
                                      className="h-6 w-6"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deletar Documento</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja deletar "{doc.title}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          apiRequest("DELETE", `/api/projects/${projectId}/documents/${doc.id}`)
                                            .then(() => {
                                              toast({
                                                title: "Documento Deletado",
                                                description: "Documento removido com sucesso.",
                                                variant: "success",
                                              });
                                              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
                                              setDeleteDocId(null);
                                            })
                                            .catch(() => {
                                              toast({
                                                title: "Erro",
                                                description: "Não foi possível deletar o documento.",
                                                variant: "destructive",
                                              });
                                              setDeleteDocId(null);
                                            });
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Deletar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {getDocumentSummary(doc.content)}
                            </p>
                            <Link href={`/projects/${projectId}/documents`}>
                              <Button variant="outline" size="sm" className="mt-3" data-testid={`button-view-doc-${doc.id}`}>
                                Ver Documento
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Nenhum documento gerado</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Os documentos serão gerados após o briefing ou podem ser criados manualmente.
                        </p>
                        <Link href={`/projects/${projectId}/documents`}>
                          <Button data-testid="button-create-docs">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Gerar Documentos
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="team" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Equipe do Projeto</h2>
                      <p className="text-sm text-muted-foreground">
                        Gerencie os profissionais e delegue tarefas
                      </p>
                    </div>
                    <Button onClick={() => setShowAddMemberModal(true)} data-testid="button-add-member">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Membro
                    </Button>
                  </div>

                  {members && members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.map((member) => (
                        <Card key={member.id} data-testid={`card-member-${member.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{member.name}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setEditingMember(member);
                                    setEditMemberData({
                                      name: member.name,
                                      role: member.role,
                                      specialty: member.specialty || "",
                                      password: ""
                                    });
                                    setShowEditPassword(false);
                                  }}
                                  data-testid={`button-edit-member-${member.id}`}
                                >
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-remove-member-${member.id}`}>
                                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação removerá {member.name} da equipe do projeto. As tarefas atribuídas a ele serão desvinculadas.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeMemberMutation.mutate(member.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={member.role === "manager" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {member.role === "owner" ? "Proprietário" : 
                                 member.role === "manager" ? "Gerente" : "Colaborador"}
                              </Badge>
                              {member.specialty && (
                                <Badge variant="outline" className="text-xs">
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  {member.specialty}
                                </Badge>
                              )}
                              <Badge 
                                variant={member.status === "active" ? "default" : "secondary"}
                                className={`text-xs ${member.status === "active" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}
                              >
                                {member.status === "active" ? "Ativo" : "Pendente"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Nenhum membro na equipe</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Adicione profissionais para delegar tarefas e acompanhar o progresso.
                        </p>
                        <Button onClick={() => setShowAddMemberModal(true)} data-testid="button-add-first-member">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Adicionar Primeiro Membro
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="proposal" className="mt-0">
                <ProposalTab projectId={projectId} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            <DialogDescription>
              Cadastre um profissional para participar do projeto. Se ele já tiver uma conta, será vinculado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome</Label>
              <Input
                id="member-name"
                placeholder="Nome do profissional"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                data-testid="input-member-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                data-testid="input-member-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Papel</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger id="member-role" data-testid="select-member-role">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">Colaborador (apenas suas tarefas)</SelectItem>
                  <SelectItem value="manager">Gerente (pode delegar tarefas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-specialty">Especialidade (opcional)</Label>
              <Input
                id="member-specialty"
                placeholder="Ex: Frontend, Backend, Design..."
                value={newMember.specialty}
                onChange={(e) => setNewMember({ ...newMember, specialty: e.target.value })}
                data-testid="input-member-specialty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">Senha Provisória</Label>
              <div className="relative">
                <Input
                  id="member-password"
                  type={showAddPassword ? "text" : "password"}
                  placeholder="Senha inicial para o membro"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  data-testid="input-member-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  data-testid="button-toggle-add-password"
                >
                  {showAddPassword ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                O membro usará esta senha para fazer login. Recomende que ele altere após o primeiro acesso.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => addMemberMutation.mutate(newMember)}
              disabled={!newMember.name || !newMember.email || !newMember.password || newMember.password.length < 6 || addMemberMutation.isPending}
              data-testid="button-confirm-add-member"
            >
              {addMemberMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignStageId} onOpenChange={(open) => !open && setAssignStageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Responsável</DialogTitle>
            <DialogDescription>
              Selecione um membro da equipe para ser responsável por este estágio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {members && members.length > 0 ? (
              <div className="space-y-2">
                <Label>Membro</Label>
                <Select
                  value={selectedMemberToAssign}
                  onValueChange={setSelectedMemberToAssign}
                >
                  <SelectTrigger data-testid="select-assign-member">
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {member.specialty && (
                            <span className="text-xs text-muted-foreground">({member.specialty})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum membro na equipe.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setAssignStageId(null);
                    setActiveTab("team");
                  }}
                >
                  Adicionar Membro
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignStageId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (assignStageId && selectedMemberToAssign) {
                  assignStageMutation.mutate({ stageId: assignStageId, memberId: selectedMemberToAssign });
                }
              }}
              disabled={!selectedMemberToAssign || assignStageMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignStageMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Atualize as informações do membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-member-name">Nome</Label>
              <Input
                id="edit-member-name"
                placeholder="Nome do profissional"
                value={editMemberData.name}
                onChange={(e) => setEditMemberData({ ...editMemberData, name: e.target.value })}
                data-testid="input-edit-member-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-member-role">Papel</Label>
              <Select
                value={editMemberData.role}
                onValueChange={(value) => setEditMemberData({ ...editMemberData, role: value })}
              >
                <SelectTrigger id="edit-member-role" data-testid="select-edit-member-role">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">Colaborador (apenas suas tarefas)</SelectItem>
                  <SelectItem value="manager">Gerente (pode delegar tarefas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-member-specialty">Especialidade (opcional)</Label>
              <Input
                id="edit-member-specialty"
                placeholder="Ex: Frontend, Backend, Design..."
                value={editMemberData.specialty}
                onChange={(e) => setEditMemberData({ ...editMemberData, specialty: e.target.value })}
                data-testid="input-edit-member-specialty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-member-password">Nova Senha (opcional)</Label>
              <div className="relative">
                <Input
                  id="edit-member-password"
                  type={showEditPassword ? "text" : "password"}
                  placeholder="Deixe em branco para manter a atual"
                  value={editMemberData.password}
                  onChange={(e) => setEditMemberData({ ...editMemberData, password: e.target.value })}
                  data-testid="input-edit-member-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  data-testid="button-toggle-edit-password"
                >
                  {showEditPassword ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Preencha apenas se desejar alterar a senha do membro.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (editingMember) {
                  updateMemberMutation.mutate({ 
                    memberId: editingMember.id, 
                    data: editMemberData 
                  });
                  setEditingMember(null);
                }
              }}
              disabled={!editMemberData.name || updateMemberMutation.isPending}
              data-testid="button-confirm-edit-member"
            >
              {updateMemberMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectDatesModal} onOpenChange={setShowProjectDatesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Cronograma do Projeto</DialogTitle>
            <DialogDescription>
              As datas foram calculadas automaticamente com base nas horas estimadas do WBS. Você pode ajustá-las conforme necessário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-9 !rounded-md"
                    data-testid="button-start-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {projectStartDate ? format(projectStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={projectStartDate}
                    onSelect={setProjectStartDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data de Término Previsto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-9 !rounded-md"
                    data-testid="button-end-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {projectEndDate ? format(projectEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={projectEndDate}
                    onSelect={setProjectEndDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDatesModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => updateProjectDatesMutation.mutate({ startDate: projectStartDate, estimatedEndDate: projectEndDate })}
              disabled={updateProjectDatesMutation.isPending}
              data-testid="button-save-dates"
            >
              {updateProjectDatesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InvestmentPhase {
  name: string;
  hours: number;
  value: number;
  deliverables?: string[];
}

interface InvestmentData {
  phases: InvestmentPhase[];
  totalHours: number;
  totalValue: number;
  hourlyRate: number;
}

interface SchedulePhase {
  phaseId?: string;
  phaseName: string;
  startDate: string;
  endDate: string;
  hours: number;
  workingDays: number;
  milestones: string[];
}

interface TechnicalInfo {
  stack: string[];
  architecture: string;
  integrations: string[];
  nonFunctionalRequirements: string[];
}

interface ScopeSection {
  objective: string;
  features: string[];
  exclusions: string[];
}

interface Proposal {
  id: string;
  projectId: string;
  version: number | null;
  status: string | null;
  executiveSummary: string | null;
  methodology: string | null;
  deliverables: unknown;
  timeline: unknown;
  investment: InvestmentData | null;
  paymentTerms: string | null;
  termsAndConditions: string | null;
  technicalInfo: TechnicalInfo | null;
  scopeSection: ScopeSection | null;
  schedule: SchedulePhase[] | null;
  startDate: Date | string | null;
  hoursPerDay: number | null;
  validity: number | null;
  totalHours: number | null;
  hourlyRate: number | null;
  totalValue: number | null;
  createdAt: Date | null;
}

function ProposalTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState<Partial<Proposal>>({});
  const [hourlyRateInput, setHourlyRateInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [hoursPerDayInput, setHoursPerDayInput] = useState("");

  const { data: proposals, isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/projects", projectId, "proposals"],
  });

  const proposal = proposals && proposals.length > 0 
    ? proposals.reduce((latest, current) => 
        (current.version || 0) > (latest.version || 0) ? current : latest
      ) 
    : null;

  useEffect(() => {
    if (proposal && !hourlyRateInput) {
      setHourlyRateInput(String((proposal.hourlyRate || 15000) / 100));
      setStartDateInput(proposal.startDate ? new Date(proposal.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      setHoursPerDayInput(String(proposal.hoursPerDay || 8));
    }
  }, [proposal]);

  const generateMutation = useMutation({
    mutationFn: async (data: { hourlyRate?: number; startDate?: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/proposals/generate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "proposals"] });
      toast({ title: "Proposta gerada com sucesso!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao gerar proposta", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/proposals/${proposal?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "proposals"] });
      toast({ title: "Proposta atualizada!", variant: "success" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar proposta", variant: "destructive" });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async (data: { hourlyRate?: number; startDate?: string; hoursPerDay?: number }) => {
      return apiRequest("POST", `/api/proposals/${proposal?.id}/recalculate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "proposals"] });
      toast({ title: "Valores recalculados!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao recalcular valores", variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    if (!proposal) return;
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta_v${proposal.version}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Download iniciado!", variant: "success" });
    } catch (e) {
      toast({ title: "Erro ao baixar documento", variant: "destructive" });
    }
  };

  const startEditing = () => {
    if (proposal) {
      setEditedProposal({
        executiveSummary: proposal.executiveSummary,
        methodology: proposal.methodology,
        deliverables: proposal.deliverables,
        timeline: proposal.timeline,
        paymentTerms: proposal.paymentTerms,
        termsAndConditions: proposal.termsAndConditions,
      });
      setHourlyRateInput(String((proposal.hourlyRate || 0) / 100));
      setStartDateInput(proposal.startDate ? new Date(proposal.startDate).toISOString().split("T")[0] : "");
      setHoursPerDayInput(String(proposal.hoursPerDay || 8));
      setIsEditing(true);
    }
  };

  const saveChanges = () => {
    const updates: any = { ...editedProposal };
    
    if (hourlyRateInput) {
      updates.hourlyRate = Math.round(parseFloat(hourlyRateInput) * 100);
    }
    if (startDateInput) {
      updates.startDate = startDateInput;
    }
    if (hoursPerDayInput) {
      updates.hoursPerDay = parseInt(hoursPerDayInput);
    }
    
    updateMutation.mutate(updates);
  };

  const handleRecalculate = () => {
    const data: any = {};
    if (hourlyRateInput) data.hourlyRate = parseFloat(hourlyRateInput);
    if (startDateInput) data.startDate = startDateInput;
    if (hoursPerDayInput) data.hoursPerDay = parseInt(hoursPerDayInput);
    recalculateMutation.mutate(data);
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const investment = proposal?.investment;
  const schedule = proposal?.schedule || [];
  const technicalInfo = proposal?.technicalInfo;
  const scopeSection = proposal?.scopeSection;
  const deliverables = Array.isArray(proposal?.deliverables) ? proposal.deliverables : [];

  if (proposalsLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground mb-2">Nenhuma proposta comercial</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Gere uma proposta comercial baseada no briefing e roadmap do projeto.
          </p>
          <Button 
            onClick={() => generateMutation.mutate({})}
            disabled={generateMutation.isPending}
            data-testid="button-generate-proposal"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Gerar Proposta com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proposta Comercial</h2>
          <p className="text-sm text-muted-foreground">
            Versão {proposal.version} | Status: {proposal.status === "draft" ? "Rascunho" : proposal.status}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={startEditing} data-testid="button-edit-proposal">
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" onClick={handleDownload} data-testid="button-download-proposal">
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
              <Button 
                onClick={() => generateMutation.mutate({})}
                disabled={generateMutation.isPending}
                data-testid="button-regenerate-proposal"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancelar
              </Button>
              <Button 
                onClick={saveChanges}
                disabled={updateMutation.isPending}
                data-testid="button-save-proposal"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedProposal.executiveSummary || ""}
                onChange={(e) => setEditedProposal({ ...editedProposal, executiveSummary: e.target.value })}
                rows={6}
                data-testid="textarea-executive-summary"
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">{proposal.executiveSummary}</p>
            )}
          </CardContent>
        </Card>

        {scopeSection && (
          <Card>
            <CardHeader>
              <CardTitle>Escopo do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scopeSection.objective && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Objetivo</h4>
                  <p className="text-sm text-muted-foreground">{scopeSection.objective}</p>
                </div>
              )}
              
              {scopeSection.features && scopeSection.features.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Funcionalidades Incluídas</h4>
                  <ul className="space-y-1.5">
                    {scopeSection.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {scopeSection.exclusions && scopeSection.exclusions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Fora do Escopo</h4>
                  <ul className="space-y-1.5">
                    {scopeSection.exclusions.map((exclusion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{exclusion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Metodologia</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedProposal.methodology || ""}
                onChange={(e) => setEditedProposal({ ...editedProposal, methodology: e.target.value })}
                rows={4}
                data-testid="textarea-methodology"
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">{proposal.methodology}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {deliverables.map((item: any, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div>
                    <span className="text-foreground font-medium">{typeof item === "string" ? item : item.name || item}</span>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {technicalInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Especificações Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Stack Tecnológico</h4>
                <div className="flex flex-wrap gap-2">
                  {technicalInfo.stack?.map((tech, index) => (
                    <Badge key={index} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
              
              {technicalInfo.architecture && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Arquitetura</h4>
                  <p className="text-sm text-muted-foreground">{technicalInfo.architecture}</p>
                </div>
              )}

              {technicalInfo.integrations && technicalInfo.integrations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Integrações</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {technicalInfo.integrations.map((integration, index) => (
                      <li key={index}>{integration}</li>
                    ))}
                  </ul>
                </div>
              )}

              {technicalInfo.nonFunctionalRequirements && technicalInfo.nonFunctionalRequirements.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Requisitos Não-Funcionais</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {technicalInfo.nonFunctionalRequirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Investimento</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
              data-testid="button-recalculate"
            >
              {recalculateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Recalcular Valores
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-md">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Valor/Hora (R$)</label>
                <Input
                  type="number"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(e.target.value)}
                  placeholder="150"
                  data-testid="input-hourly-rate"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Data de Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-9 !rounded-md"
                      data-testid="button-start-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateInput 
                        ? new Date(startDateInput + "T00:00:00").toLocaleDateString("pt-BR")
                        : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDateInput ? new Date(startDateInput + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setStartDateInput(date.toISOString().split("T")[0]);
                        }
                      }}
                      initialFocus
                      locale={undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Horas/Dia</label>
                <Input
                  type="number"
                  value={hoursPerDayInput}
                  onChange={(e) => setHoursPerDayInput(e.target.value)}
                  placeholder="8"
                  data-testid="input-hours-per-day"
                />
              </div>
            </div>

            {investment?.phases && investment.phases.length > 0 ? (
              <div className="space-y-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Fase</th>
                      <th className="text-center py-2">Horas</th>
                      <th className="text-right py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investment.phases.map((phase: InvestmentPhase, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">
                          <span className="font-medium">{phase.name}</span>
                          {phase.deliverables && phase.deliverables.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {phase.deliverables.slice(0, 2).join(", ")}
                              {phase.deliverables.length > 2 && ` +${phase.deliverables.length - 2}`}
                            </p>
                          )}
                        </td>
                        <td className="text-center py-2">{phase.hours}h</td>
                        <td className="text-right py-2">{formatCurrency(phase.value * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold bg-muted/50">
                      <td className="py-2">Total</td>
                      <td className="text-center py-2">{investment.totalHours}h</td>
                      <td className="text-right py-2">{formatCurrency((investment.totalValue || 0) * 100)}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="text-sm text-muted-foreground">
                  Valor hora: {formatCurrency((investment.hourlyRate || 0) * 100)}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Total: {formatCurrency(proposal.totalValue || 0)}</p>
                <p className="text-sm">{proposal.totalHours}h x {formatCurrency(proposal.hourlyRate || 0)}/h</p>
              </div>
            )}
          </CardContent>
        </Card>

        {schedule && schedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cronograma de Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedule.map((phase: SchedulePhase, index: number) => (
                  <div key={index} className="flex items-start gap-4 p-3 border rounded-md">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{phase.phaseName}</h4>
                        <Badge variant="outline">{phase.hours}h ({phase.workingDays} dias úteis)</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                      </p>
                      {phase.milestones && phase.milestones.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Marcos:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                            {phase.milestones.map((milestone, mIndex) => (
                              <li key={mIndex}>{milestone}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Condições de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedProposal.paymentTerms || ""}
                onChange={(e) => setEditedProposal({ ...editedProposal, paymentTerms: e.target.value })}
                rows={3}
                data-testid="textarea-payment-terms"
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">{proposal.paymentTerms}</p>
            )}
          </CardContent>
        </Card>

        {(proposal.termsAndConditions || isEditing) && (
          <Card>
            <CardHeader>
              <CardTitle>Termos e Condições</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editedProposal.termsAndConditions || ""}
                  onChange={(e) => setEditedProposal({ ...editedProposal, termsAndConditions: e.target.value })}
                  rows={4}
                  data-testid="textarea-terms-conditions"
                />
              ) : (
                <p className="text-foreground whitespace-pre-wrap">{proposal.termsAndConditions}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
