import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FolderKanban, 
  LogIn, 
  LogOut,
  Eye,
  FileText,
  Target,
  Calendar,
  MessageSquare,
  Send,
  Upload,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Building2
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  clientId: string;
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  status: string;
  progress: number;
  order: number;
}

interface ProjectDetails {
  project: Project;
  briefing: any;
  scope: any;
  roadmap: any;
  stages: Stage[];
}

export default function ClientPortal() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "observation" as "observation" | "suggestion" | "issue",
    content: "",
    images: [] as string[]
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/portal/projects", portalToken],
    queryFn: async () => {
      if (!portalToken) return [];
      const response = await fetch(`/api/portal/projects`, {
        headers: {
          'Authorization': `Bearer ${portalToken}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: !!portalToken,
  });

  const { data: projectDetails, isLoading: detailsLoading } = useQuery<ProjectDetails>({
    queryKey: ["/api/portal/project", selectedProject?.id, portalToken],
    queryFn: async () => {
      if (!selectedProject || !portalToken) return null;
      const response = await fetch(`/api/portal/project/${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${portalToken}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch project details");
      return response.json();
    },
    enabled: !!selectedProject && !!portalToken,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { projectId: string; type: string; content: string; images: string[] }) => {
      const response = await fetch('/api/portal/feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${portalToken}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to submit feedback');
      return response.json();
    },
    onSuccess: () => {
      setIsFeedbackOpen(false);
      setFeedbackForm({ type: "observation", content: "", images: [] });
      toast({
        title: "Feedback enviado",
        description: "Sua sugestão foi enviada com sucesso. A equipe irá revisar em breve.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Credenciais inválidas");
      }

      const data = await response.json();
      setClient(data.client);
      setPortalToken(data.token);
      setIsLoggedIn(true);
      toast({
        title: "Bem-vindo!",
        description: `Olá, ${data.client.name}. Você está conectado ao portal.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setClient(null);
    setPortalToken(null);
    setIsLoggedIn(false);
    setSelectedProject(null);
    setLoginEmail("");
    setLoginPassword("");
  };

  const handleSubmitFeedback = () => {
    if (!selectedProject || !portalToken) return;
    
    submitFeedbackMutation.mutate({
      projectId: selectedProject.id,
      type: feedbackForm.type,
      content: feedbackForm.content,
      images: feedbackForm.images
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "briefing": return "bg-blue-500/10 text-blue-500";
      case "scoping": return "bg-purple-500/10 text-purple-500";
      case "planning": return "bg-yellow-500/10 text-yellow-500";
      case "in_progress": return "bg-orange-500/10 text-orange-500";
      case "review": return "bg-cyan-500/10 text-cyan-500";
      case "completed": return "bg-green-500/10 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "briefing": return "Briefing";
      case "scoping": return "Definição de Escopo";
      case "planning": return "Planejamento";
      case "in_progress": return "Em Desenvolvimento";
      case "review": return "Em Revisão";
      case "completed": return "Concluído";
      default: return status;
    }
  };

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-orange-500" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Portal do Cliente</span>
          </div>
          <ThemeToggle />
        </header>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5" />
                Acesso ao Portal
              </CardTitle>
              <CardDescription>
                Entre com suas credenciais para acompanhar seus projetos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    data-testid="input-portal-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    data-testid="input-portal-login-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginLoading}
                  data-testid="button-portal-login"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Portal do Cliente</span>
          </div>
          {client && (
            <span className="text-sm text-muted-foreground">
              Olá, {client.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-portal-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-80 border-r p-4 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Meus Projetos
          </h2>
          
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum projeto encontrado
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2 pr-4">
                {projects.map((project) => (
                  <Card 
                    key={project.id}
                    className={`cursor-pointer hover-elevate ${selectedProject?.id === project.id ? 'border-primary' : ''}`}
                    onClick={() => setSelectedProject(project)}
                    data-testid={`card-portal-project-${project.id}`}
                  >
                    <CardContent className="p-3">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <Progress value={project.progress} className="h-1.5" />
                        <span className="text-xs text-muted-foreground mt-1">
                          {project.progress}% concluído
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>

        <main className="flex-1 p-6 overflow-auto">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderKanban className="h-16 w-16 mb-4" />
              <p className="text-lg">Selecione um projeto para visualizar os detalhes</p>
            </div>
          ) : detailsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projectDetails ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{projectDetails.project.name}</h1>
                  {projectDetails.project.description && (
                    <p className="text-muted-foreground mt-1">{projectDetails.project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(projectDetails.project.status)}>
                    {getStatusLabel(projectDetails.project.status)}
                  </Badge>
                  <Button onClick={() => setIsFeedbackOpen(true)} data-testid="button-open-feedback">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar Feedback
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Progresso Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Progress value={projectDetails.project.progress} className="flex-1" />
                    <span className="font-semibold">{projectDetails.project.progress}%</span>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="stages">
                <TabsList>
                  <TabsTrigger value="stages" data-testid="tab-portal-stages">
                    <Calendar className="h-4 w-4 mr-2" />
                    Etapas
                  </TabsTrigger>
                  <TabsTrigger value="scope" data-testid="tab-portal-scope">
                    <Target className="h-4 w-4 mr-2" />
                    Escopo
                  </TabsTrigger>
                  <TabsTrigger value="briefing" data-testid="tab-portal-briefing">
                    <FileText className="h-4 w-4 mr-2" />
                    Briefing
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stages" className="mt-4">
                  {!projectDetails.stages || projectDetails.stages.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nenhuma etapa definida ainda</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {projectDetails.stages.sort((a, b) => a.order - b.order).map((stage) => (
                        <Card key={stage.id} data-testid={`card-portal-stage-${stage.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStageStatusIcon(stage.status)}
                                <div>
                                  <h4 className="font-medium">{stage.name}</h4>
                                  <span className="text-sm text-muted-foreground">
                                    {stage.status === "completed" ? "Concluída" : 
                                     stage.status === "in_progress" ? "Em andamento" : "Pendente"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={stage.progress} className="w-24" />
                                <span className="text-sm text-muted-foreground">{stage.progress}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scope" className="mt-4">
                  {!projectDetails.scope ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Escopo ainda não definido</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Escopo do Projeto</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {projectDetails.scope.objectives && (
                          <div>
                            <h4 className="font-medium mb-2">Objetivos</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {projectDetails.scope.objectives}
                            </p>
                          </div>
                        )}
                        {projectDetails.scope.features && Array.isArray(projectDetails.scope.features) && (
                          <div>
                            <h4 className="font-medium mb-2">Funcionalidades</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {(projectDetails.scope.features as any[]).map((feature, idx) => (
                                <li key={idx}>{feature.name || feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {projectDetails.scope.outOfScope && (
                          <div>
                            <h4 className="font-medium mb-2">Fora do Escopo</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {projectDetails.scope.outOfScope}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="briefing" className="mt-4">
                  {!projectDetails.briefing ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Briefing ainda não disponível</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Briefing do Projeto</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {projectDetails.briefing.businessObjective && (
                          <div>
                            <h4 className="font-medium mb-2">Objetivo do Negócio</h4>
                            <p className="text-sm text-muted-foreground">
                              {projectDetails.briefing.businessObjective}
                            </p>
                          </div>
                        )}
                        {projectDetails.briefing.targetAudience && (
                          <div>
                            <h4 className="font-medium mb-2">Público-alvo</h4>
                            <p className="text-sm text-muted-foreground">
                              {projectDetails.briefing.targetAudience}
                            </p>
                          </div>
                        )}
                        {projectDetails.briefing.desiredScope && (
                          <div>
                            <h4 className="font-medium mb-2">Escopo Desejado</h4>
                            <p className="text-sm text-muted-foreground">
                              {projectDetails.briefing.desiredScope}
                            </p>
                          </div>
                        )}
                        {projectDetails.briefing.stack && (
                          <div>
                            <h4 className="font-medium mb-2">Stack Tecnológica</h4>
                            <p className="text-sm text-muted-foreground">
                              {projectDetails.briefing.stack}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Enviar Feedback
            </DialogTitle>
            <DialogDescription>
              Compartilhe suas observações, sugestões ou reporte problemas sobre o projeto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Feedback</Label>
              <Select
                value={feedbackForm.type}
                onValueChange={(value: "observation" | "suggestion" | "issue") => 
                  setFeedbackForm({ ...feedbackForm, type: value })
                }
              >
                <SelectTrigger data-testid="select-feedback-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observation">Observação</SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                  <SelectItem value="issue">Problema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={feedbackForm.content}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                placeholder="Descreva sua observação, sugestão ou problema..."
                rows={5}
                data-testid="textarea-feedback-content"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeedbackOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitFeedback}
              disabled={!feedbackForm.content || submitFeedbackMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {submitFeedbackMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
