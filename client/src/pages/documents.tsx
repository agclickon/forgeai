import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  FileText,
  Code,
  Server,
  Download,
  RefreshCw,
  Loader2,
  Copy,
  BookOpen,
  Wrench,
  Palette,
  Trash2,
} from "lucide-react";
import type { Project, Document } from "@shared/schema";

const documentTypes = [
  { type: "technical", label: "Documentação Técnica", icon: FileText, description: "Especificação técnica completa do projeto" },
  { type: "architecture", label: "Arquitetura", icon: Server, description: "Diagramas e decisões arquiteturais" },
  { type: "api", label: "Documentação API", icon: Code, description: "Endpoints, parâmetros e exemplos" },
  { type: "installation", label: "Guia de Instalação", icon: Wrench, description: "Instruções de deploy e configuração" },
  { type: "styles", label: "Estilos", icon: Palette, description: "Guia de estilos e design system" },
  { type: "requirements", label: "Requisitos", icon: FileText, description: "Especificações funcionais e não-funcionais" },
  { type: "user-guide", label: "Guia do Usuário", icon: BookOpen, description: "Manual de uso para usuários finais" },
  { type: "testing", label: "Estratégia de Testes", icon: Code, description: "Plano de testes, casos e validações" },
] as const;

export default function Documents() {
  const [, params] = useRoute("/projects/:id/documents");
  const projectId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("technical");
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/projects", projectId, "documents"],
    enabled: !!projectId,
  });

  const generateDoc = useMutation({
    mutationFn: async (type: string) => {
      setGeneratingType(type);
      return await apiRequest("POST", `/api/projects/${projectId}/documents/generate`, { type });
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
      toast({
        title: "Documento Gerado",
        description: `${documentTypes.find(d => d.type === type)?.label} foi gerado com sucesso.`,
        variant: "success",
      });
      setGeneratingType(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o documento.",
        variant: "destructive",
      });
      setGeneratingType(null);
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (docId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
      toast({
        title: "Documento Deletado",
        description: "Documento removido com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível deletar o documento.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Conteúdo copiado para a área de transferência.",
      variant: "success",
    });
  };

  const downloadDocument = (doc: Document) => {
    const blob = new Blob([doc.content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (projectLoading || docsLoading) {
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

  const getDocument = (type: string) => documents?.find(d => d.type === type);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Documentação - {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gere e gerencie a documentação técnica do projeto
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">
          <div className="lg:col-span-1 space-y-3 overflow-y-auto pr-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Tipos de Documento</h2>
            {documentTypes.map((docType) => {
              const doc = getDocument(docType.type);
              const isGenerating = generatingType === docType.type;
              const Icon = docType.icon;
              
              return (
                <Card 
                  key={docType.type}
                  className={`cursor-pointer transition-colors ${activeTab === docType.type ? "border-primary" : ""}`}
                  onClick={() => setActiveTab(docType.type)}
                  data-testid={`card-doc-${docType.type}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{docType.label}</p>
                          {doc ? (
                            <Badge variant="secondary" className="text-xs">Gerado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pendente</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{docType.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateDoc.mutate(docType.type);
                      }}
                      disabled={isGenerating}
                      data-testid={`button-generate-${docType.type}`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : doc ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Regenerar
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 mr-2" />
                          Gerar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="lg:col-span-3 min-h-0 overflow-hidden">
            <Card className="h-full flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-2 pb-4">
                <CardTitle className="text-lg">
                  {documentTypes.find(d => d.type === activeTab)?.label}
                </CardTitle>
                {getDocument(activeTab) && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(getDocument(activeTab)?.content || "")}
                      data-testid="button-copy-doc"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadDocument(getDocument(activeTab)!)}
                      data-testid="button-download-doc"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <AlertDialog open={deleteDocId === getDocument(activeTab)?.id} onOpenChange={(open) => !open && setDeleteDocId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const doc = getDocument(activeTab);
                            if (doc) setDeleteDocId(doc.id);
                          }}
                          disabled={deleteDoc.isPending}
                          data-testid="button-delete-doc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar Documento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar "{getDocument(activeTab)?.title}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              const doc = getDocument(activeTab);
                              if (doc) {
                                deleteDoc.mutate(doc.id);
                                setDeleteDocId(null);
                              }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden p-4">
                <ScrollArea className="h-full pr-4">
                  {getDocument(activeTab) ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
                      <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted p-4 rounded-md overflow-x-auto">
                        {getDocument(activeTab)?.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-foreground mb-2">
                        Documento não gerado
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clique em "Gerar" para criar este documento automaticamente.
                      </p>
                      <Button
                        onClick={() => generateDoc.mutate(activeTab)}
                        disabled={generatingType === activeTab}
                        data-testid="button-generate-empty"
                      >
                        {generatingType === activeTab ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4 mr-2" />
                            Gerar Documento
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
