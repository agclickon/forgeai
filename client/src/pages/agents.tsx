import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  Code,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  Target,
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  PlayCircle,
  RefreshCw,
  Gauge,
  Eye,
  Save,
  HelpCircle,
  Ban,
  Shield,
  Zap,
  ListChecks,
} from "lucide-react";
import type { Project, AgentAnalysis, OrchestratorSession, Scope } from "@shared/schema";

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
}

const agentConfigs: AgentConfig[] = [
  {
    id: "scope",
    name: "Agente de Escopo",
    description: "Analisa completude do escopo, gaps e dependências entre entregáveis.",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "technical",
    name: "Agente Técnico",
    description: "Avalia viabilidade técnica, arquitetura e complexidade de implementação.",
    icon: Code,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "timeline",
    name: "Agente de Prazos",
    description: "Analisa estimativas de tempo, caminho crítico e riscos de atraso.",
    icon: Clock,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "risks",
    name: "Agente de Riscos",
    description: "Identifica riscos técnicos, de negócio e operacionais com mitigações.",
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "financial",
    name: "Agente Financeiro",
    description: "Estima custos de desenvolvimento, manutenção e ROI do projeto.",
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "documentation",
    name: "Agente de Documentação",
    description: "Avalia necessidades de documentação e gera estrutura de docs.",
    icon: FileText,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

const readinessLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  excellent: { label: "Excelente", color: "text-green-500", icon: CheckCircle },
  ready: { label: "Pronto", color: "text-blue-500", icon: CheckCircle },
  needs_work: { label: "Precisa de Trabalho", color: "text-yellow-500", icon: AlertCircle },
  not_ready: { label: "Não Pronto", color: "text-red-500", icon: XCircle },
};

export default function Agents() {
  const [, params] = useRoute("/projects/:id/agents");
  const [, navigate] = useLocation();
  const projectId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAgent, setSelectedAgent] = useState<AgentAnalysis | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<AgentConfig | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState("");
  const [showApplyModeModal, setShowApplyModeModal] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery<AgentAnalysis[]>({
    queryKey: ["/api/projects", projectId, "agents"],
    enabled: !!projectId,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<OrchestratorSession[]>({
    queryKey: ["/api/projects", projectId, "orchestrator-sessions"],
    enabled: !!projectId,
  });

  const { data: scope } = useQuery<Scope>({
    queryKey: ["/api/projects", projectId, "scope"],
    enabled: !!projectId,
  });

  const getAppliedRecommendations = (): string[] => {
    const scopeData = scope as any;
    const metadata = scopeData?.metadata;
    if (!metadata?.appliedRecommendations) return [];
    return metadata.appliedRecommendations.flatMap((entry: any) => entry.recommendations || []);
  };

  const appliedRecommendationsList = getAppliedRecommendations();

  const runOrchestrator = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/agents/orchestrate`, {
        agentTypes: ["scope", "technical", "timeline", "risks", "financial", "documentation"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "orchestrator-sessions"] });
      toast({
        title: "Análise concluída",
        description: "Todos os agentes especializados finalizaram suas análises.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível executar a análise orquestrada.",
        variant: "destructive",
      });
    },
  });

  const runSingleAgent = useMutation({
    mutationFn: async (agentType: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/agents/${agentType}`, {});
    },
    onSuccess: (_, agentType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "agents"] });
      const config = agentConfigs.find(a => a.id === agentType);
      toast({
        title: "Agente concluiu",
        description: `${config?.name || agentType} finalizou a análise.`,
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível executar o agente.",
        variant: "destructive",
      });
    },
  });

  const applyRecommendations = useMutation({
    mutationFn: async (data: { agentType: string; recommendations: string[]; notes: string; mode?: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/agents/apply-recommendations`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "checklists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      const appliedCount = variables.recommendations.length;
      toast({
        title: `${appliedCount} recomendação${appliedCount > 1 ? 'ões' : ''} aplicada${appliedCount > 1 ? 's' : ''}`,
        description: "As recomendações foram adicionadas ao projeto.",
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}`)}
            data-testid="button-view-improvements"
          >
            Ver Melhorias
          </Button>
        ),
      });
      closeAgentModal();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aplicar as recomendações.",
        variant: "destructive",
      });
    },
  });

  const openAgentModal = (analysis: AgentAnalysis, config: AgentConfig) => {
    setSelectedRecommendations([]);
    setUserNotes("");
    setSelectedAgent(analysis);
    setSelectedAgentConfig(config);
  };

  const closeAgentModal = () => {
    setSelectedAgent(null);
    setSelectedAgentConfig(null);
    setSelectedRecommendations([]);
    setUserNotes("");
  };

  const toggleRecommendation = (rec: string) => {
    setSelectedRecommendations(prev => 
      prev.includes(rec) ? prev.filter(r => r !== rec) : [...prev, rec]
    );
  };

  const handleApplyRecommendations = () => {
    if (!selectedAgent || !selectedAgentConfig) return;
    if (selectedRecommendations.length === 0 && !userNotes) return;
    setShowApplyModeModal(true);
  };

  const handleApplyDirect = () => {
    if (!selectedAgent || !selectedAgentConfig) return;
    applyRecommendations.mutate({
      agentType: selectedAgentConfig.id,
      recommendations: selectedRecommendations,
      notes: userNotes,
      mode: "direct",
    });
    setShowApplyModeModal(false);
  };

  const handleApplyWithTracking = () => {
    if (!selectedAgent || !selectedAgentConfig) return;
    const pendingRecommendations = {
      agentType: selectedAgentConfig.id,
      recommendations: selectedRecommendations,
      notes: userNotes,
    };
    sessionStorage.setItem("pendingRecommendations", JSON.stringify(pendingRecommendations));
    setShowApplyModeModal(false);
    closeAgentModal();
    navigate(`/projects/${projectId}/briefing?applyRecommendations=true`);
  };

  const latestSession = sessions?.[0];
  const latestConsolidated = latestSession?.consolidatedResult as any;

  const getAgentAnalysis = (agentType: string) => {
    return analyses?.find(a => a.agentType === agentType);
  };

  const renderFormattedAnalysis = (result: any) => {
    if (typeof result === 'string') {
      return (
        <div className="text-sm text-foreground bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
          {result}
        </div>
      );
    }

    if (!result || typeof result !== 'object') {
      return (
        <div className="text-sm text-muted-foreground italic">
          Nenhuma análise disponível
        </div>
      );
    }

    const sections = [];

    if (result.clarity !== undefined || result.completeness !== undefined) {
      sections.push(
        <div key="metrics" className="grid grid-cols-2 gap-4">
          {result.clarity !== undefined && (
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-foreground">Clareza</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{result.clarity}%</div>
              <Progress value={result.clarity} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {result.clarity >= 80 ? 'Ótimo nível de clareza' : result.clarity >= 60 ? 'Clareza adequada, mas pode melhorar' : 'Precisa de mais detalhamento'}
              </p>
            </div>
          )}
          {result.completeness !== undefined && (
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">Completude</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{result.completeness}%</div>
              <Progress value={result.completeness} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {result.completeness >= 80 ? 'Escopo bem definido' : result.completeness >= 60 ? 'Alguns pontos podem ser adicionados' : 'Vários itens faltando'}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (result.ambiguities?.length > 0) {
      sections.push(
        <div key="ambiguities">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            Pontos que precisam de esclarecimento ({result.ambiguities.length})
          </h4>
          <ul className="space-y-2">
            {result.ambiguities.map((item: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm bg-yellow-500/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (result.outOfScopeItems?.length > 0) {
      sections.push(
        <div key="outOfScope">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Ban className="w-4 h-4 text-muted-foreground" />
            Itens fora do escopo ({result.outOfScopeItems.length})
          </h4>
          <ul className="space-y-2">
            {result.outOfScopeItems.map((item: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-md">
                <XCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (result.risks?.length > 0) {
      sections.push(
        <div key="risks">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            Riscos Identificados ({result.risks.length})
          </h4>
          <ul className="space-y-2">
            {result.risks.map((risk: any, index: number) => (
              <li key={index} className="bg-red-500/10 p-3 rounded-md">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-foreground font-medium">{typeof risk === 'string' ? risk : risk.description || risk.name}</span>
                    {risk.mitigation && (
                      <p className="text-xs text-muted-foreground mt-1">Mitigação: {risk.mitigation}</p>
                    )}
                    {risk.severity && (
                      <Badge variant="outline" className="mt-2 text-xs">{risk.severity}</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (result.costs || result.estimatedCost || result.totalCost) {
      const cost = result.costs || result.estimatedCost || result.totalCost;
      sections.push(
        <div key="costs" className="bg-emerald-500/10 p-4 rounded-md">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Estimativa de Custos
          </h4>
          {typeof cost === 'object' ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {cost.development && <div><span className="text-muted-foreground">Desenvolvimento:</span> <span className="font-medium text-foreground">{cost.development}</span></div>}
              {cost.maintenance && <div><span className="text-muted-foreground">Manutenção:</span> <span className="font-medium text-foreground">{cost.maintenance}</span></div>}
              {cost.infrastructure && <div><span className="text-muted-foreground">Infraestrutura:</span> <span className="font-medium text-foreground">{cost.infrastructure}</span></div>}
              {cost.total && <div className="col-span-2 pt-2 border-t"><span className="text-muted-foreground">Total:</span> <span className="font-bold text-foreground text-lg">{cost.total}</span></div>}
            </div>
          ) : (
            <div className="text-xl font-bold text-foreground">{cost}</div>
          )}
        </div>
      );
    }

    if (result.timeline || result.estimatedDuration || result.realistic || result.optimistic || result.pessimistic) {
      const estimatedDur = result.estimatedDuration;
      const hasEstimatedDurationScenarios = estimatedDur && typeof estimatedDur === 'object' && (estimatedDur.realistic || estimatedDur.optimistic || estimatedDur.pessimistic);
      const hasRootScenarios = result.realistic || result.optimistic || result.pessimistic;
      const scenarios = hasEstimatedDurationScenarios ? estimatedDur : (hasRootScenarios ? result : null);
      
      sections.push(
        <div key="timeline" className="bg-purple-500/10 p-4 rounded-md">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            Cronograma Estimado
          </h4>
          {scenarios ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.optimistic && (
                <div className="bg-green-500/10 p-3 rounded-md">
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Otimista</div>
                  <div className="text-lg font-bold text-foreground">{typeof scenarios.optimistic === 'object' ? (scenarios.optimistic.duration || scenarios.optimistic.estimate || JSON.stringify(scenarios.optimistic)) : scenarios.optimistic}</div>
                </div>
              )}
              {scenarios.realistic && (
                <div className="bg-blue-500/10 p-3 rounded-md">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Realista</div>
                  <div className="text-lg font-bold text-foreground">{typeof scenarios.realistic === 'object' ? (scenarios.realistic.duration || scenarios.realistic.estimate || JSON.stringify(scenarios.realistic)) : scenarios.realistic}</div>
                </div>
              )}
              {scenarios.pessimistic && (
                <div className="bg-orange-500/10 p-3 rounded-md">
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Pessimista</div>
                  <div className="text-lg font-bold text-foreground">{typeof scenarios.pessimistic === 'object' ? (scenarios.pessimistic.duration || scenarios.pessimistic.estimate || JSON.stringify(scenarios.pessimistic)) : scenarios.pessimistic}</div>
                </div>
              )}
            </div>
          ) : typeof result.timeline === 'object' ? (
            <div className="space-y-2 text-sm">
              {Object.entries(result.timeline).map(([phase, duration]: [string, any]) => (
                <div key={phase} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{phase}:</span>
                  <span className="font-medium text-foreground">{typeof duration === 'object' ? JSON.stringify(duration) : duration}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-lg font-medium text-foreground">{typeof result.timeline === 'string' ? result.timeline : (typeof result.estimatedDuration === 'string' ? result.estimatedDuration : '')}</div>
          )}
        </div>
      );
    }

    if (result.technicalRequirements?.length > 0) {
      sections.push(
        <div key="techReqs">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" />
            Requisitos Técnicos ({result.technicalRequirements.length})
          </h4>
          <ul className="space-y-2">
            {result.technicalRequirements.map((req: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm bg-cyan-500/10 p-3 rounded-md">
                <Code className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (result.summary) {
      sections.unshift(
        <div key="summary" className="bg-muted/50 p-4 rounded-md">
          <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Resumo da Análise
          </h4>
          <p className="text-sm text-foreground">{result.summary}</p>
        </div>
      );
    }

    if (sections.length === 0) {
      const knownKeys = ['clarity', 'completeness', 'ambiguities', 'outOfScopeItems', 'risks', 'costs', 'estimatedCost', 'totalCost', 'timeline', 'estimatedDuration', 'technicalRequirements', 'summary', 'recommendations', 'realistic', 'optimistic', 'pessimistic', 'warnings'];
      const otherKeys = Object.keys(result).filter(k => !knownKeys.includes(k));
      
      if (otherKeys.length > 0) {
        sections.push(
          <div key="other" className="space-y-4">
            {otherKeys.map(key => {
              const value = result[key];
              if (Array.isArray(value) && value.length > 0) {
                return (
                  <div key={key}>
                    <h4 className="font-medium text-foreground mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <ul className="space-y-2">
                      {value.map((item: any, index: number) => (
                        <li key={index} className="text-sm bg-muted/50 p-3 rounded-md text-foreground">
                          {typeof item === 'string' ? item : JSON.stringify(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              } else if (typeof value === 'string' || typeof value === 'number') {
                return (
                  <div key={key} className="bg-muted/50 p-3 rounded-md">
                    <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                    <span className="text-sm font-medium text-foreground">{value}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
    }

    return sections.length > 0 ? <div className="space-y-6">{sections}</div> : (
      <div className="text-sm text-muted-foreground italic">
        Nenhum dado estruturado disponível
      </div>
    );
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agentes IA Especializados
              </h1>
              <p className="text-sm text-muted-foreground">
                {project.name} - Análise inteligente do projeto
              </p>
            </div>
          </div>
          <Button
            onClick={() => runOrchestrator.mutate()}
            disabled={runOrchestrator.isPending}
            data-testid="button-run-orchestrator"
          >
            {runOrchestrator.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Executar Todos os Agentes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 md:px-6 flex-shrink-0">
          <TabsList className="h-12 bg-transparent gap-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted" data-testid="tab-overview">
              <Gauge className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-muted" data-testid="tab-agents">
              <Bot className="w-4 h-4 mr-2" />
              Análises dos Agentes
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted" data-testid="tab-history">
              <Clock className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              {latestConsolidated ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Saúde Geral</p>
                            <p className="text-2xl font-bold text-foreground">{latestConsolidated.overallHealth}%</p>
                          </div>
                          <div className={`p-3 rounded-full ${latestConsolidated.overallHealth >= 80 ? 'bg-green-500/10' : latestConsolidated.overallHealth >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                            <Gauge className={`w-6 h-6 ${latestConsolidated.overallHealth >= 80 ? 'text-green-500' : latestConsolidated.overallHealth >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                          </div>
                        </div>
                        <Progress value={latestConsolidated.overallHealth} className="mt-3 h-2" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Status do Projeto</p>
                            {(() => {
                              const status = readinessLabels[latestConsolidated.projectReadiness] || readinessLabels.not_ready;
                              const StatusIcon = status.icon;
                              return (
                                <div className="flex items-center gap-2 mt-1">
                                  <StatusIcon className={`w-5 h-5 ${status.color}`} />
                                  <span className={`text-lg font-semibold ${status.color}`}>{status.label}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                            <p className="text-2xl font-bold text-foreground">{latestConsolidated.criticalIssues?.length || 0}</p>
                          </div>
                          <div className="p-3 rounded-full bg-orange-500/10">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {latestConsolidated.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Brain className="w-5 h-5" />
                          Resumo Executivo
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-foreground">{latestConsolidated.summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {latestConsolidated.criticalIssues?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          Problemas Críticos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {latestConsolidated.criticalIssues.map((issue: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-foreground">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {latestConsolidated.topRecommendations?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                          Recomendações Principais
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {latestConsolidated.topRecommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-foreground">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">Nenhuma análise realizada</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Execute os agentes especializados para obter uma análise completa do projeto.
                    </p>
                    <Button onClick={() => runOrchestrator.mutate()} disabled={runOrchestrator.isPending} data-testid="button-start-analysis">
                      {runOrchestrator.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Iniciar Análise Completa
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="agents" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentConfigs.map((agent) => {
                  const analysis = getAgentAnalysis(agent.id);
                  const Icon = agent.icon;
                  const hasAnalysis = analysis && analysis.status === "completed";

                  return (
                    <Card key={agent.id} data-testid={`card-agent-${agent.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-md ${agent.bgColor}`}>
                              <Icon className={`w-5 h-5 ${agent.color}`} />
                            </div>
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                          </div>
                          {hasAnalysis && (
                            <Badge variant="secondary" className="text-xs">
                              {analysis.confidence}%
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">{agent.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {hasAnalysis ? (
                          <>
                            <div className="text-sm text-foreground line-clamp-3">
                              {typeof analysis.result === 'string' 
                                ? analysis.result.substring(0, 150) + '...'
                                : JSON.stringify(analysis.result).substring(0, 150) + '...'}
                            </div>
                            {(analysis.warnings as string[])?.length > 0 && (
                              <button
                                onClick={() => openAgentModal(analysis, agent)}
                                className="flex items-center gap-1 text-xs text-orange-500 hover:underline cursor-pointer"
                                data-testid={`button-alerts-${agent.id}`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {(analysis.warnings as string[]).length} alerta(s)
                              </button>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openAgentModal(analysis, agent)}
                                data-testid={`button-details-${agent.id}`}
                              >
                                <Eye className="w-3 h-3 mr-2" />
                                Ver Detalhes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => runSingleAgent.mutate(agent.id)}
                                disabled={runSingleAgent.isPending}
                                data-testid={`button-rerun-${agent.id}`}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Análise não executada ainda.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => runSingleAgent.mutate(agent.id)}
                              disabled={runSingleAgent.isPending}
                              data-testid={`button-run-${agent.id}`}
                            >
                              {runSingleAgent.isPending ? (
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              ) : (
                                <PlayCircle className="w-3 h-3 mr-2" />
                              )}
                              Executar
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-4">
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session) => {
                  const consolidated = session.consolidatedResult as any;
                  const execLog = session.executionLog as any[];

                  return (
                    <Card key={session.id} data-testid={`card-session-${session.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            Sessão de Análise
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === "completed" ? "secondary" : "outline"}>
                              {session.status === "completed" ? "Concluída" : session.status}
                            </Badge>
                            {consolidated?.overallHealth && (
                              <Badge variant="secondary">
                                {consolidated.overallHealth}% Saúde
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {session.createdAt ? new Date(session.createdAt).toLocaleString('pt-BR') : 'Data desconhecida'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {execLog && execLog.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {execLog.map((log: any, i: number) => {
                              const config = agentConfigs.find(a => a.id === log.agent);
                              return (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {config?.name || log.agent}: {log.confidence}%
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">Nenhum histórico</h3>
                    <p className="text-sm text-muted-foreground">
                      Execute uma análise orquestrada para ver o histórico de sessões.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      <Dialog open={!!selectedAgent} onOpenChange={() => closeAgentModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedAgent && selectedAgentConfig && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${selectedAgentConfig.bgColor}`}>
                    {(() => {
                      const Icon = selectedAgentConfig.icon;
                      return <Icon className={`w-5 h-5 ${selectedAgentConfig.color}`} />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedAgentConfig.name}
                      <Badge variant="secondary">{selectedAgent.confidence}%</Badge>
                    </DialogTitle>
                    <DialogDescription>{selectedAgentConfig.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
                <div className="space-y-6 pr-2">
                  {renderFormattedAnalysis(selectedAgent.result)}

                  {(selectedAgent.warnings as string[])?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Alertas ({(selectedAgent.warnings as string[]).length})
                      </h4>
                      <ul className="space-y-2">
                        {(selectedAgent.warnings as string[]).map((warning, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm bg-orange-500/10 p-3 rounded-md">
                            <XCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(selectedAgent.recommendations as string[])?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Recomendações - Selecione para aplicar
                      </h4>
                      <div className="space-y-2">
                        {(selectedAgent.recommendations as string[]).map((rec, index) => {
                          const isAlreadyApplied = appliedRecommendationsList.includes(rec);
                          const isSelected = selectedRecommendations.includes(rec);
                          
                          return (
                            <div 
                              key={index} 
                              className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
                                isAlreadyApplied
                                  ? 'bg-green-500/10 border border-green-500/30 cursor-default'
                                  : isSelected 
                                    ? 'bg-primary/10 border border-primary/30 cursor-pointer' 
                                    : 'bg-muted/50 cursor-pointer'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAlreadyApplied) {
                                  toggleRecommendation(rec);
                                }
                              }}
                            >
                              <Checkbox 
                                checked={isAlreadyApplied || isSelected}
                                disabled={isAlreadyApplied}
                                onCheckedChange={() => {
                                  if (!isAlreadyApplied) {
                                    toggleRecommendation(rec);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`checkbox-rec-${index}`}
                                className={isAlreadyApplied ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' : ''}
                              />
                              <div className="flex-1">
                                <span className={`text-sm ${isAlreadyApplied ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {rec}
                                </span>
                                {isAlreadyApplied && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-600 dark:text-green-400">Aplicada ao projeto</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="user-notes" className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Notas e Decisões
                    </Label>
                    <Textarea
                      id="user-notes"
                      placeholder="Adicione notas, contexto ou decisões sobre as recomendações selecionadas..."
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-user-notes"
                    />
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-md">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                      O que acontece após aplicar?
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>As recomendações selecionadas serão salvas no histórico do projeto</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>O escopo será atualizado com as melhorias sugeridas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Você poderá revisar e editar no Briefing ou Escopo do projeto</span>
                      </li>
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/projects/${projectId}/briefing`}>
                        <Button variant="outline" size="sm" data-testid="link-briefing">
                          <FileText className="w-3 h-3 mr-2" />
                          Ir para Briefing
                        </Button>
                      </Link>
                      <Link href={`/projects/${projectId}/scope`}>
                        <Button variant="outline" size="sm" data-testid="link-scope">
                          <Target className="w-3 h-3 mr-2" />
                          Ir para Escopo
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 pt-4 border-t gap-2">
                <Button variant="outline" onClick={closeAgentModal} data-testid="button-close-modal">
                  Fechar
                </Button>
                <Button
                  onClick={handleApplyRecommendations}
                  disabled={applyRecommendations.isPending || (selectedRecommendations.length === 0 && !userNotes)}
                  data-testid="button-apply-recommendations"
                >
                  {applyRecommendations.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Aplicar ao Projeto
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de escolha do modo de aplicação */}
      <Dialog open={showApplyModeModal} onOpenChange={setShowApplyModeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Como deseja aplicar as recomendações?
            </DialogTitle>
            <DialogDescription>
              Você selecionou {selectedRecommendations.length} recomendação{selectedRecommendations.length !== 1 ? 'ões' : ''} para aplicar ao projeto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Card 
              className="cursor-pointer hover-elevate border-2 border-transparent hover:border-primary/50 transition-all"
              onClick={handleApplyDirect}
              data-testid="card-apply-direct"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Aplicar Diretamente</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Todas as recomendações serão aplicadas simultaneamente ao projeto. 
                      O escopo, roadmap e estágios serão atualizados automaticamente.
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Rápido
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate border-2 border-transparent hover:border-primary/50 transition-all"
              onClick={handleApplyWithTracking}
              data-testid="card-apply-tracking"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Acompanhar Modificações</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você será direcionado para o Briefing onde cada recomendação será 
                      aplicada uma por vez, permitindo revisar e ajustar cada mudança.
                    </p>
                    <Badge variant="outline" className="mt-2">
                      Passo a passo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModeModal(false)} data-testid="button-cancel-apply-mode">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
