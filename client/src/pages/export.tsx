import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Loader2,
  Package,
  Code,
  FileCode,
  FolderTree,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Lock,
  Globe,
} from "lucide-react";
import { SiReact, SiNextdotjs, SiNodedotjs, SiPython, SiGithub, SiGitlab } from "react-icons/si";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, ProjectExport } from "@shared/schema";

const stackIcons: Record<string, typeof SiReact> = {
  "react-vite": SiReact,
  "nextjs": SiNextdotjs,
  "express": SiNodedotjs,
  "node": SiNodedotjs,
  "python-flask": SiPython,
  "python-fastapi": SiPython,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  generating: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  generating: "Gerando...",
  completed: "Concluído",
  failed: "Falhou",
};

export default function ExportPage() {
  const [, params] = useRoute("/projects/:id/export");
  const projectId = params?.id;
  const { toast } = useToast();
  
  const [selectedStack, setSelectedStack] = useState("react-vite");
  const [deleteExportId, setDeleteExportId] = useState<string | null>(null);
  
  const [gitExportDialog, setGitExportDialog] = useState<{
    open: boolean;
    platform: "github" | "gitlab";
    exportId: string;
  } | null>(null);
  const [gitToken, setGitToken] = useState("");
  const [gitRepoName, setGitRepoName] = useState("");
  const [gitIsPrivate, setGitIsPrivate] = useState(false);
  const [showImportInstructions, setShowImportInstructions] = useState(false);

  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: options } = useQuery<{
    stacks: Array<{ id: string; name: string; icon: string }>;
    platforms: Array<{ id: string; name: string; icon: string; description: string }>;
  }>({
    queryKey: ["/api/export/options"],
  });

  const { data: exports, isLoading: isLoadingExports } = useQuery<ProjectExport[]>({
    queryKey: ["/api/projects", projectId, "exports"],
    enabled: !!projectId,
    refetchInterval: (query) => {
      const hasGenerating = query.state.data?.some((e: ProjectExport) => e.status === "generating");
      return hasGenerating ? 3000 : false;
    },
  });

  const createExportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/exports`, {
        platform: "zip",
        stack: selectedStack,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "exports"] });
      toast({
        title: "Exportação iniciada",
        description: "A estrutura do projeto está sendo gerada. Aguarde alguns instantes.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a exportação.",
        variant: "destructive",
      });
    },
  });

  const deleteExportMutation = useMutation({
    mutationFn: async (exportId: string) => {
      return await apiRequest("DELETE", `/api/exports/${exportId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "exports"] });
      toast({
        title: "Exportação excluída",
        description: "A exportação foi removida com sucesso.",
        variant: "success",
      });
      setDeleteExportId(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a exportação.",
        variant: "destructive",
      });
    },
  });

  const gitExportMutation = useMutation({
    mutationFn: async ({ exportId, platform, token, repoName, isPrivate }: {
      exportId: string;
      platform: "github" | "gitlab";
      token: string;
      repoName: string;
      isPrivate: boolean;
    }) => {
      return await apiRequest("POST", `/api/exports/${exportId}/${platform}`, {
        token,
        repoName,
        isPrivate,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "exports"] });
      toast({
        title: "Repositório criado",
        description: `O projeto foi exportado com sucesso para ${gitExportDialog?.platform === "github" ? "GitHub" : "GitLab"}.`,
        variant: "success",
      });
      setGitExportDialog(null);
      setGitToken("");
      setGitRepoName("");
      setGitIsPrivate(false);
      if (data.repoUrl) {
        window.open(data.repoUrl, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível exportar para o repositório.",
        variant: "destructive",
      });
    },
  });

  const handleGitExport = () => {
    if (!gitExportDialog || !gitToken || !gitRepoName) return;
    gitExportMutation.mutate({
      exportId: gitExportDialog.exportId,
      platform: gitExportDialog.platform,
      token: gitToken,
      repoName: gitRepoName,
      isPrivate: gitIsPrivate,
    });
  };

  const openGitExportDialog = (exportId: string, platform: "github" | "gitlab") => {
    const exp = exports?.find(e => e.id === exportId);
    const sanitizedName = project?.name?.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50) || "projeto";
    setGitRepoName(`${sanitizedName}-${exp?.stack || "export"}`);
    setGitExportDialog({ open: true, platform, exportId });
  };

  const handleDownload = async (exportId: string, stack: string) => {
    try {
      const response = await fetch(`/api/exports/${exportId}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stack || "project"}-export.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download iniciado",
        description: "O arquivo ZIP está sendo baixado.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Projeto não encontrado</p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4" data-testid="link-back-projects">
                Voltar aos Projetos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      case "generating":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Exportar Projeto
            </h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Gerar Estrutura de Projeto
            </CardTitle>
            <CardDescription>
              Gere uma estrutura de projeto completa e executável com base no briefing, escopo e roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stack de Tecnologia</label>
                <Select value={selectedStack} onValueChange={setSelectedStack}>
                  <SelectTrigger data-testid="select-stack">
                    <SelectValue placeholder="Selecione a stack" />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.stacks.map((stack) => {
                      const Icon = stackIcons[stack.id] || Code;
                      return (
                        <SelectItem key={stack.id} value={stack.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{stack.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Formatos Disponíveis</label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="text-sm py-1 px-3">
                    <Download className="w-3 h-3 mr-1" />
                    Download ZIP
                  </Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    <SiGithub className="w-3 h-3 mr-1" />
                    GitHub
                  </Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    <SiGitlab className="w-3 h-3 mr-1" />
                    GitLab
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Após gerar a estrutura, você pode baixar como ZIP ou enviar para GitHub/GitLab.
                </p>
              </div>
            </div>

            <Button
              onClick={() => createExportMutation.mutate()}
              disabled={createExportMutation.isPending}
              className="w-full md:w-auto"
              data-testid="button-generate-export"
            >
              {createExportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Code className="w-4 h-4 mr-2" />
                  Gerar Estrutura do Projeto
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Exportações Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExports ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : exports && exports.length > 0 ? (
              <div className="space-y-3">
                {exports.map((exp) => {
                  const Icon = stackIcons[exp.stack || "react-vite"] || Code;
                  const stackOption = options?.stacks.find((s) => s.id === exp.stack);
                  
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-4 border rounded-md bg-card"
                      data-testid={`export-item-${exp.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-muted rounded-md flex-shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {stackOption?.name || exp.stack || "Projeto"}
                            </span>
                            <Badge variant="secondary" className={statusColors[exp.status || "pending"]}>
                              <StatusIcon status={exp.status || "pending"} />
                              <span className="ml-1">{statusLabels[exp.status || "pending"]}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {exp.createdAt && format(new Date(exp.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {exp.status === "failed" && exp.errorMessage && (
                            <p className="text-sm text-destructive mt-1" data-testid={`error-message-${exp.id}`}>
                              Erro: {exp.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {exp.status === "completed" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(exp.id, exp.stack || "project")}
                              data-testid={`button-download-${exp.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              ZIP
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGitExportDialog(exp.id, "github")}
                              data-testid={`button-github-${exp.id}`}
                            >
                              <SiGithub className="w-4 h-4 mr-1" />
                              GitHub
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGitExportDialog(exp.id, "gitlab")}
                              data-testid={`button-gitlab-${exp.id}`}
                            >
                              <SiGitlab className="w-4 h-4 mr-1" />
                              GitLab
                            </Button>
                            {exp.externalUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(exp.externalUrl as string, "_blank")}
                                data-testid={`button-external-${exp.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                        {exp.status === "generating" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Gerando...
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteExportId(exp.id)}
                          data-testid={`button-delete-${exp.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma exportação realizada ainda.</p>
                <p className="text-sm">Gere sua primeira estrutura de projeto acima.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Como funciona?</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportInstructions(true)}
              data-testid="button-import-instructions"
            >
              <FileCode className="w-4 h-4 mr-2" />
              Instruções de Importação
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Escolha a Stack</p>
                  <p className="text-sm text-muted-foreground">
                    Selecione a tecnologia que deseja usar no projeto.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Geração Inteligente</p>
                  <p className="text-sm text-muted-foreground">
                    A IA analisa seu briefing e escopo para gerar código real.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Baixe e Execute</p>
                  <p className="text-sm text-muted-foreground">
                    Baixe o ZIP, extraia e execute npm install para começar.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteExportId} onOpenChange={(open) => !open && setDeleteExportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exportação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A exportação será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteExportId && deleteExportMutation.mutate(deleteExportId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteExportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog 
        open={!!gitExportDialog?.open} 
        onOpenChange={(open) => {
          if (!open) {
            setGitExportDialog(null);
            setGitToken("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {gitExportDialog?.platform === "github" ? (
                <SiGithub className="w-5 h-5" />
              ) : (
                <SiGitlab className="w-5 h-5" />
              )}
              Exportar para {gitExportDialog?.platform === "github" ? "GitHub" : "GitLab"}
            </DialogTitle>
            <DialogDescription>
              Crie um novo repositório com o código gerado. Seu token é usado apenas para esta operação e não é armazenado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="git-token">
                {gitExportDialog?.platform === "github" ? "Personal Access Token (GitHub)" : "Private Token (GitLab)"}
              </Label>
              <Input
                id="git-token"
                type="password"
                placeholder={gitExportDialog?.platform === "github" ? "ghp_xxxxxxxxxxxx" : "glpat-xxxxxxxxxxxx"}
                value={gitToken}
                onChange={(e) => setGitToken(e.target.value)}
                data-testid="input-git-token"
              />
              <p className="text-xs text-muted-foreground">
                {gitExportDialog?.platform === "github" ? (
                  <>Crie em GitHub Settings → Developer settings → Personal access tokens. Permissões: repo.</>
                ) : (
                  <>Crie em GitLab → Preferences → Access Tokens. Permissões: api, write_repository.</>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo-name">Nome do Repositório</Label>
              <Input
                id="repo-name"
                placeholder="meu-projeto"
                value={gitRepoName}
                onChange={(e) => setGitRepoName(e.target.value)}
                data-testid="input-repo-name"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visibilidade</Label>
                <p className="text-xs text-muted-foreground">
                  {gitIsPrivate ? "Repositório privado" : "Repositório público"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Switch
                  checked={gitIsPrivate}
                  onCheckedChange={setGitIsPrivate}
                  data-testid="switch-visibility"
                />
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGitExportDialog(null);
                setGitToken("");
              }}
              data-testid="button-cancel-git-export"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGitExport}
              disabled={!gitToken || !gitRepoName || gitExportMutation.isPending}
              data-testid="button-confirm-git-export"
            >
              {gitExportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Criar Repositório
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showImportInstructions} 
        onOpenChange={setShowImportInstructions}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Instruções de Importação
            </DialogTitle>
            <DialogDescription>
              Siga os passos específicos para sua plataforma de desenvolvimento.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-auto pr-4">
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="default">Replit</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <p className="text-foreground font-medium">✓ Projeto pronto para usar (com código completo gerado)</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Baixe o arquivo ZIP do seu projeto exportado</li>
                    <li>Extraia o ZIP em sua máquina local</li>
                    <li>Acesse <code className="bg-background px-2 py-1 rounded text-foreground">replit.com</code> e crie um novo Replit</li>
                    <li>Selecione "Import from GitHub" ou faça upload dos arquivos</li>
                    <li>Se usar upload: arraste a pasta extraída para o Replit</li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm install</code> no terminal</li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm run dev</code> para iniciar o servidor</li>
                    <li>Seu projeto estará disponível no navegador (porta padrão 5000)</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Cursor / IDE Local</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Baixe o arquivo ZIP do seu projeto</li>
                    <li>Extraia em uma pasta local (ex: <code className="bg-background px-2 py-1 rounded text-foreground">~/projetos/meu-projeto</code>)</li>
                    <li>Abra a pasta no Cursor: <code className="bg-background px-2 py-1 rounded text-foreground">cursor ~/projetos/meu-projeto</code></li>
                    <li>Abra o terminal integrado (Ctrl+`)</li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm install</code></li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm run dev</code></li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">VS Code / Windsurf</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Baixe e extraia o ZIP em sua máquina</li>
                    <li>No terminal, navegue até a pasta: <code className="bg-background px-2 py-1 rounded text-foreground">cd caminho/para/projeto</code></li>
                    <li>Abra no VS Code: <code className="bg-background px-2 py-1 rounded text-foreground">code .</code></li>
                    <li>Ou no Windsurf: <code className="bg-background px-2 py-1 rounded text-foreground">windsurf .</code></li>
                    <li>Instale dependências: <code className="bg-background px-2 py-1 rounded text-foreground">npm install</code></li>
                    <li>Inicie o desenvolvimento: <code className="bg-background px-2 py-1 rounded text-foreground">npm run dev</code></li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">GitHub Codespaces</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Primeiro, envie o projeto para GitHub usando a opção "GitHub" na exportação</li>
                    <li>Vá para o seu repositório no GitHub</li>
                    <li>Clique em "Code" → "Codespaces" → "Create codespace on main"</li>
                    <li>Aguarde o ambiente carregar</li>
                    <li>No terminal, execute <code className="bg-background px-2 py-1 rounded text-foreground">npm install</code></li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm run dev</code></li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Agentes de IA (Cursor, Devin, Windsurf, ChatGPT Dev)</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <p className="text-foreground font-medium">O projeto inclui um arquivo `.agent-instructions.md` com contexto completo</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Baixe e extraia o ZIP em sua máquina</li>
                    <li>Abra a pasta no seu agente de IA (Cursor, Windsurf, etc)</li>
                    <li>Leia o arquivo <code className="bg-background px-2 py-1 rounded text-foreground">.agent-instructions.md</code> no diretório raiz</li>
                    <li>Siga as instruções específicas incluídas para contexto do projeto</li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm install</code> para instalar dependências</li>
                    <li>Execute <code className="bg-background px-2 py-1 rounded text-foreground">npm run dev</code> para iniciar o projeto</li>
                    <li>Peça ao agente para implementar melhorias ou novos recursos com base no arquivo de instruções</li>
                  </ol>
                  <p className="text-xs bg-background/50 p-2 rounded mt-2">
                    <strong>Dica:</strong> O arquivo de instruções contém briefing completo, escopo, roadmap e guias técnicos para auxiliar o agente de IA a entender o projeto.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Dicas Importantes</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
                  <p>✓ <strong>Projeto completo:</strong> O ZIP contém código funcional gerado por IA, pronto para executar</p>
                  <p>✓ Certifique-se de ter <code className="bg-background px-2 py-1 rounded text-foreground">Node.js</code> instalado (versão 16+)</p>
                  <p>✓ O arquivo <code className="bg-background px-2 py-1 rounded text-foreground">package.json</code> contém todas as dependências necessárias</p>
                  <p>✓ As variáveis de ambiente estão documentadas em <code className="bg-background px-2 py-1 rounded text-foreground">.env.example</code></p>
                  <p>✓ Se encontrar erros, verifique a versão do Node.js: <code className="bg-background px-2 py-1 rounded text-foreground">node -v</code></p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportInstructions(false)}
              data-testid="button-close-instructions"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
