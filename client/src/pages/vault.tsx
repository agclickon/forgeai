import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Key,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  Lock,
  Shield,
  Loader2,
} from "lucide-react";
import type { Project, VaultItem } from "@shared/schema";

const typeLabels: Record<string, string> = {
  api_key: "Chave de API",
  password: "Senha",
  token: "Token",
  certificate: "Certificado",
  connection_string: "String de Conexão",
  other: "Outro",
};

const typeIcons: Record<string, typeof Key> = {
  api_key: Key,
  password: Lock,
  token: Shield,
  certificate: Shield,
  connection_string: Key,
  other: Key,
};

const environmentLabels: Record<string, string> = {
  development: "Desenvolvimento",
  staging: "Staging",
  production: "Produção",
};

const environmentColors: Record<string, string> = {
  development: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  staging: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  production: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export default function Vault() {
  const [, params] = useRoute("/projects/:id/vault");
  const projectId = params?.id;
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    type: "api_key",
    value: "",
    description: "",
    environment: "production",
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: vaultItems, isLoading: vaultLoading } = useQuery<VaultItem[]>({
    queryKey: ["/api/projects", projectId, "vault"],
    enabled: !!projectId,
  });

  const createItem = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", `/api/projects/${projectId}/vault`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vault"] });
      toast({
        title: "Credencial Salva",
        description: "A credencial foi adicionada ao cofre com segurança.",
        variant: "success",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a credencial.",
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/vault/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vault"] });
      toast({
        title: "Credencial Atualizada",
        description: "A credencial foi atualizada.",
        variant: "success",
      });
      resetForm();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a credencial.",
        variant: "destructive",
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vault/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vault"] });
      toast({
        title: "Credencial Removida",
        description: "A credencial foi removida do cofre.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a credencial.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "api_key",
      value: "",
      description: "",
      environment: "production",
    });
  };

  const handleEdit = (item: VaultItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      value: item.value,
      description: item.description || "",
      environment: item.environment || "production",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.value) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o valor da credencial.",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: formData });
    } else {
      createItem.mutate(formData);
    }
  };

  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});

  const toggleVisibility = async (id: string) => {
    if (visibleValues.has(id)) {
      setVisibleValues((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      try {
        const res = await fetch(`/api/projects/${projectId}/vault/${id}/reveal`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setRevealedValues((prev) => ({ ...prev, [id]: data.value }));
          setVisibleValues((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível revelar o valor.",
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/vault/${id}/reveal`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        navigator.clipboard.writeText(data.value);
        toast({
          title: "Copiado",
          description: "Valor copiado para a área de transferência.",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o valor.",
        variant: "destructive",
      });
    }
  };

  if (projectLoading || vaultLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
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
                <Shield className="w-5 h-5" />
                Cofre de Credenciais
              </h1>
              <p className="text-sm text-muted-foreground">
                {project.name} - Gerencie chaves de API, senhas e tokens
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-credential">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Credencial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Credencial" : "Nova Credencial"}
                </DialogTitle>
                <DialogDescription>
                  Armazene suas credenciais de forma segura
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: OpenAI API Key"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-vault-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger data-testid="select-vault-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">Chave de API</SelectItem>
                        <SelectItem value="password">Senha</SelectItem>
                        <SelectItem value="token">Token</SelectItem>
                        <SelectItem value="certificate">Certificado</SelectItem>
                        <SelectItem value="connection_string">String de Conexão</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select
                      value={formData.environment}
                      onValueChange={(value) => setFormData({ ...formData, environment: value })}
                    >
                      <SelectTrigger data-testid="select-vault-environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Desenvolvimento</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <Textarea
                    id="value"
                    placeholder="Insira a chave, senha ou token"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="font-mono text-sm"
                    data-testid="input-vault-value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Descrição ou observações"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-vault-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createItem.isPending || updateItem.isPending}
                  data-testid="button-save-credential"
                >
                  {(createItem.isPending || updateItem.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? "Salvar Alterações" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          {vaultItems && vaultItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vaultItems.map((item) => {
                const Icon = typeIcons[item.type] || Key;
                const isVisible = visibleValues.has(item.id);

                return (
                  <Card key={item.id} data-testid={`card-vault-item-${item.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-2 rounded-md bg-muted flex-shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm truncate">{item.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {typeLabels[item.type]}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={environmentColors[item.environment || "production"]}
                          variant="secondary"
                        >
                          {environmentLabels[item.environment || "production"]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-muted p-2 rounded font-mono truncate">
                          {isVisible && revealedValues[item.id] ? revealedValues[item.id] : "••••••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(item.id)}
                          data-testid={`button-toggle-visibility-${item.id}`}
                        >
                          {isVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(item.id)}
                          data-testid={`button-copy-${item.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{item.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteItem.mutate(item.id)}
                                data-testid={`button-confirm-delete-${item.id}`}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">Cofre vazio</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione suas chaves de API, senhas e tokens de forma segura.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Credencial
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
