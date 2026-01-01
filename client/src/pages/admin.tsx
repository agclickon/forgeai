import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Bot, 
  Shield, 
  BarChart3, 
  Plus, 
  Trash2, 
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  AlertTriangle,
  Clock,
  Activity,
  Pencil,
  FolderKanban,
  Building2,
  Filter,
  UserPlus,
  Search,
  Star,
  ExternalLink,
  Settings,
  DollarSign,
  Save
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface AiProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKeyEnvVar: string | null;
  baseUrlEnvVar: string | null;
  isActive: boolean;
  priority: number;
  maxTokens: number;
  temperature: number;
  description: string | null;
  hasApiKey?: boolean;
  hasBaseUrl?: boolean;
  createdAt: string;
}

interface UserProject {
  id: string;
  name: string;
  clientId: string | null;
}

interface UserClient {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  projects?: UserProject[];
  clients?: UserClient[];
}

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  previousValue: any;
  newValue: any;
  createdAt: string;
}

interface PlatformStats {
  totalUsers: number;
  totalProjects: number;
  totalClients: number;
  activeProviders: number;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId: string | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState({}, "", `/admin?tab=${tab}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || "overview";
      setActiveTab(tab);
    };

    const checkUrlChange = setInterval(() => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") || "overview";
      if (urlTab !== activeTab) {
        setActiveTab(urlTab);
      }
    }, 100);

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(checkUrlChange);
    };
  }, [activeTab]);

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: providers, isLoading: providersLoading } = useQuery<AiProvider[]>({
    queryKey: ["/api/admin/ai-providers"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const { data: allClients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: allProjects } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-admin-title">
              Administração da Plataforma
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie configurações, usuários e provedores de IA
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="ai-providers" className="gap-2" data-testid="tab-ai-providers">
              <Bot className="h-4 w-4" />
              Provedores IA
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2" data-testid="tab-clients">
              <Building2 className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2" data-testid="tab-audit">
              <Activity className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab stats={stats} isLoading={statsLoading} />
          </TabsContent>

          <TabsContent value="ai-providers" className="space-y-6">
            <AIProvidersTab providers={providers || []} isLoading={providersLoading} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab 
              users={users || []} 
              isLoading={usersLoading} 
              allClients={allClients || []}
              allProjects={allProjects || []}
            />
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gerenciamento de Clientes
                </CardTitle>
                <CardDescription>
                  Gerencie os clientes da plataforma, configure acesso ao portal e visualize feedbacks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground">
                    Acesse a área completa de gerenciamento de clientes para:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Criar e editar clientes com dados completos (CPF/CNPJ, endereço)</li>
                    <li>Configurar acesso ao portal do cliente</li>
                    <li>Visualizar projetos vinculados a cada cliente</li>
                    <li>Gerenciar feedbacks recebidos pelo portal</li>
                  </ul>
                  <Link href="/admin/clients">
                    <Button className="gap-2" data-testid="button-go-to-clients">
                      <ExternalLink className="h-4 w-4" />
                      Acessar Gerenciamento de Clientes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ConfigTab />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditTab logs={auditLogs || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ stats, isLoading }: { stats?: PlatformStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { label: "Usuários", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { label: "Projetos", value: stats?.totalProjects || 0, icon: BarChart3, color: "text-green-500" },
    { label: "Clientes", value: stats?.totalClients || 0, icon: Users, color: "text-purple-500" },
    { label: "Provedores IA Ativos", value: stats?.activeProviders || 0, icon: Bot, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo à Área Administrativa</CardTitle>
          <CardDescription>
            Use as abas acima para gerenciar diferentes aspectos da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Provedores de IA
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure modelos de LLM, defina ordem de fallback e gerencie API keys via variáveis de ambiente
              </p>
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gerenciamento de Usuários
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize usuários, altere permissões e bloqueie/desbloqueie contas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIProvidersTab({ providers, isLoading }: { providers: AiProvider[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);

  const defaultFormData = {
    name: "",
    provider: "anthropic",
    model: "",
    apiKeyEnvVar: "",
    baseUrlEnvVar: "",
    maxTokens: 4096,
    temperature: 70,
    description: "",
  };

  const [formData, setFormData] = useState(defaultFormData);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/ai-providers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] });
      setIsAddDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Provedor criado com sucesso!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao criar provedor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AiProvider> }) => {
      return apiRequest("PUT", `/api/admin/ai-providers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] });
      setEditingProvider(null);
      setFormData(defaultFormData);
      toast({ title: "Provedor atualizado com sucesso!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar provedor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/ai-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] });
      toast({ title: "Provedor excluído com sucesso!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir provedor", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (providerIds: string[]) => {
      return apiRequest("POST", "/api/admin/ai-providers/reorder", { providerIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] });
      toast({ title: "Ordem atualizada!", variant: "success" });
    },
  });

  const handleSubmit = () => {
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (provider: AiProvider) => {
    setFormData({
      name: provider.name,
      provider: provider.provider,
      model: provider.model,
      apiKeyEnvVar: provider.apiKeyEnvVar || "",
      baseUrlEnvVar: provider.baseUrlEnvVar || "",
      maxTokens: provider.maxTokens,
      temperature: provider.temperature,
      description: provider.description || "",
    });
    setEditingProvider(provider);
  };

  const moveProvider = (index: number, direction: "up" | "down") => {
    const newProviders = [...providers];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newProviders.length) return;
    
    [newProviders[index], newProviders[targetIndex]] = [newProviders[targetIndex], newProviders[index]];
    reorderMutation.mutate(newProviders.map(p => p.id));
  };

  const setAsPrimary = (providerId: string) => {
    const otherProviders = providers.filter(p => p.id !== providerId);
    const newOrder = [providerId, ...otherProviders.map(p => p.id)];
    reorderMutation.mutate(newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ProviderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome de Exibição</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Claude Sonnet 4.5"
          data-testid="input-provider-name"
        />
      </div>
      <div className="space-y-2">
        <Label>Provedor</Label>
        <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v })}>
          <SelectTrigger data-testid="select-provider-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
            <SelectItem value="openai">OpenAI (GPT)</SelectItem>
            <SelectItem value="google">Google (Gemini)</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Modelo</Label>
        <Input
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          placeholder="Ex: claude-sonnet-4-20250514"
          data-testid="input-provider-model"
        />
      </div>
      <div className="space-y-2">
        <Label>Nome da Variável de Ambiente (API Key)</Label>
        <Input
          value={formData.apiKeyEnvVar}
          onChange={(e) => setFormData({ ...formData, apiKeyEnvVar: e.target.value })}
          placeholder="Ex: ANTHROPIC_API_KEY"
          data-testid="input-provider-env-var"
        />
        <p className="text-xs text-muted-foreground">
          O sistema busca o valor desta variável nos Secrets do Replit. Configure o secret com este nome na aba Secrets do seu projeto.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Base URL (opcional)</Label>
        <Input
          value={formData.baseUrlEnvVar}
          onChange={(e) => setFormData({ ...formData, baseUrlEnvVar: e.target.value })}
          placeholder="Ex: AI_INTEGRATIONS_OPENAI_BASE_URL"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Max Tokens</Label>
          <Input
            type="number"
            value={formData.maxTokens}
            onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Temperature (%)</Label>
          <Input
            type="number"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseInt(e.target.value) })}
            min={0}
            max={100}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional do provedor..."
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Provedores de IA</h2>
          <p className="text-sm text-muted-foreground">
            Configure modelos de LLM e ordem de fallback. API keys são gerenciadas via variáveis de ambiente.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-provider">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Provedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Provedor de IA</DialogTitle>
              <DialogDescription>
                Configure um novo modelo de LLM. A API key deve ser configurada nas variáveis de ambiente do sistema.
              </DialogDescription>
            </DialogHeader>
            <ProviderForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-provider">
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingProvider} onOpenChange={(open) => !open && setEditingProvider(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Provedor de IA</DialogTitle>
            <DialogDescription>
              Atualize as configurações do provedor.
            </DialogDescription>
          </DialogHeader>
          <ProviderForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProvider(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-provider">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordem de Prioridade (Fallback)</CardTitle>
          <CardDescription>
            O primeiro provedor ativo será usado. Se falhar, o sistema tenta o próximo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum provedor configurado</p>
              <p className="text-sm">Adicione um provedor para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((provider, index) => (
                <div
                  key={provider.id}
                  className={`flex items-center gap-4 p-4 border rounded-md ${
                    !provider.isActive ? "opacity-50" : ""
                  }`}
                  data-testid={`provider-item-${provider.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveProvider(index, "up")}
                      disabled={index === 0}
                      data-testid={`button-move-up-${provider.id}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveProvider(index, "down")}
                      disabled={index === providers.length - 1}
                      data-testid={`button-move-down-${provider.id}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{provider.name}</span>
                      {index === 0 && provider.isActive && (
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primário
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {provider.provider}
                      </Badge>
                      {provider.hasApiKey ? (
                        <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          <Check className="h-3 w-3 mr-1" />
                          API Key OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sem API Key
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {provider.model} | {provider.apiKeyEnvVar || "N/A"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {index !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAsPrimary(provider.id)}
                        disabled={reorderMutation.isPending}
                        data-testid={`button-set-primary-${provider.id}`}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Tornar Primário
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(provider)}
                      data-testid={`button-edit-provider-${provider.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={provider.isActive}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          id: provider.id,
                          data: { isActive: checked },
                        });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(provider.id)}
                      data-testid={`button-delete-provider-${provider.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ 
  users, 
  isLoading, 
  allClients, 
  allProjects 
}: { 
  users: User[]; 
  isLoading: boolean;
  allClients: Client[];
  allProjects: Project[];
}) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const defaultUserForm = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  };

  const [userForm, setUserForm] = useState(defaultUserForm);

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof defaultUserForm) => {
      return apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsAddDialogOpen(false);
      setUserForm(defaultUserForm);
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar usuário", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar role", variant: "destructive" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}/block`, { blocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Usuário atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "platform_admin":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Admin Plataforma</Badge>;
      case "admin":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Admin</Badge>;
      default:
        return <Badge variant="outline">Usuário</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.projects?.some(p => p.name.toLowerCase().includes(query)) ||
        user.clients?.some(c => c.name.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    // Client filter
    if (filterClient !== "all") {
      const hasClient = user.clients?.some(c => c.id === filterClient);
      if (!hasClient) return false;
    }
    // Project filter
    if (filterProject !== "all") {
      const hasProject = user.projects?.some(p => p.id === filterProject);
      if (!hasProject) return false;
    }
    return true;
  });

  const handleEditUser = (user: User) => {
    setUserForm({
      email: user.email,
      password: "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role,
    });
    setEditingUser(user);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
        },
      });
    } else {
      createUserMutation.mutate(userForm);
    }
  };

  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={userForm.firstName}
            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
            placeholder="Nome"
            data-testid="input-user-firstname"
          />
        </div>
        <div className="space-y-2">
          <Label>Sobrenome</Label>
          <Input
            value={userForm.lastName}
            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
            placeholder="Sobrenome"
            data-testid="input-user-lastname"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={userForm.email}
          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          placeholder="email@exemplo.com"
          data-testid="input-user-email"
        />
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            placeholder="Senha inicial"
            data-testid="input-user-password"
          />
        </div>
      )}
      {!isEdit && (
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
            <SelectTrigger data-testid="select-user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="platform_admin">Admin Plataforma</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Gerenciamento de Usuários</h2>
          <p className="text-sm text-muted-foreground">
            {filteredUsers.length} de {users.length} usuários
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo usuário na plataforma.
              </DialogDescription>
            </DialogHeader>
            <UserForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} disabled={createUserMutation.isPending} data-testid="button-save-user">
                {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <UserForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending} data-testid="button-update-user">
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuários..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-users"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-48" data-testid="select-filter-client">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {allClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48" data-testid="select-filter-project">
                <FolderKanban className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {allProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between p-4 gap-4"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      {getRoleBadge(user.role)}
                      {user.isBlocked && (
                        <Badge variant="destructive">Bloqueado</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      Criado em: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                    
                    {(user.projects && user.projects.length > 0) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <FolderKanban className="h-3 w-3 text-muted-foreground" />
                        {user.projects.slice(0, 3).map(p => (
                          <Badge key={p.id} variant="secondary" className="text-xs">
                            {p.name}
                          </Badge>
                        ))}
                        {user.projects.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{user.projects.length - 3} mais
                          </span>
                        )}
                      </div>
                    )}
                    
                    {(user.clients && user.clients.length > 0) && (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {user.clients.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Select
                      value={user.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: user.id, role })}
                    >
                      <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="platform_admin">Admin Plataforma</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Bloqueado</Label>
                      <Switch
                        checked={user.isBlocked}
                        onCheckedChange={(blocked) => blockMutation.mutate({ id: user.id, blocked })}
                        data-testid={`switch-block-${user.id}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab({ logs }: { logs: AuditLog[] }) {
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_ai_provider: "Criou provedor de IA",
      update_ai_provider: "Atualizou provedor de IA",
      delete_ai_provider: "Excluiu provedor de IA",
      reorder_ai_providers: "Reordenou provedores",
      create_user: "Criou usuário",
      update_user: "Atualizou usuário",
      update_user_role: "Alterou role de usuário",
      block_user: "Bloqueou usuário",
      unblock_user: "Desbloqueou usuário",
      update_platform_setting: "Alterou configuração",
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Logs de Auditoria</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de ações administrativas na plataforma
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum log de auditoria</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="p-4" data-testid={`audit-log-${log.id}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                        {log.targetType && (
                          <span className="text-sm text-muted-foreground">
                            | {log.targetType}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {log.newValue && (
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface ProposalConfig {
  hourlyRate: number;
  companyName: string;
  companyDescription: string;
  defaultPaymentTerms: string;
  defaultTermsAndConditions: string;
  proposalValidity: number;
}

function ConfigTab() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [config, setConfig] = useState<ProposalConfig>({
    hourlyRate: 150,
    companyName: "",
    companyDescription: "",
    defaultPaymentTerms: "50% na aprovação, 50% na entrega",
    defaultTermsAndConditions: "",
    proposalValidity: 30,
  });

  const { data: settings, isLoading } = useQuery<{ key: string; value: any }[]>({
    queryKey: ["/api/admin/platform-settings"],
  });

  useEffect(() => {
    if (settings) {
      const proposalConfig = settings.find(s => s.key === "proposal_config");
      if (proposalConfig?.value) {
        setConfig(prev => ({ ...prev, ...proposalConfig.value }));
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProposalConfig) => {
      return apiRequest("PUT", "/api/admin/platform-settings/proposal_config", {
        value: data,
        description: "Configurações para geração de propostas comerciais",
        category: "proposals",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
      setIsSaving(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações da Plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Configure parâmetros globais para geração de propostas comerciais
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valores e Precificação
            </CardTitle>
            <CardDescription>
              Configure os valores padrão para cálculo de propostas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Valor da Hora (R$)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="10"
                value={config.hourlyRate}
                onChange={(e) => setConfig(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                data-testid="input-hourly-rate"
              />
              <p className="text-xs text-muted-foreground">
                Valor utilizado para calcular o investimento baseado nas horas estimadas do roadmap
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposalValidity">Validade da Proposta (dias)</Label>
              <Input
                id="proposalValidity"
                type="number"
                min="1"
                max="180"
                value={config.proposalValidity}
                onChange={(e) => setConfig(prev => ({ ...prev, proposalValidity: parseInt(e.target.value) || 30 }))}
                data-testid="input-proposal-validity"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Informações exibidas nas propostas comerciais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={config.companyName}
                onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Nome que aparecerá na proposta"
                data-testid="input-company-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyDescription">Sobre a Empresa</Label>
              <Textarea
                id="companyDescription"
                rows={4}
                value={config.companyDescription}
                onChange={(e) => setConfig(prev => ({ ...prev, companyDescription: e.target.value }))}
                placeholder="Breve descrição da empresa para incluir nas propostas..."
                data-testid="input-company-description"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Termos Padrão</CardTitle>
            <CardDescription>
              Textos padrão utilizados nas propostas comerciais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTerms">Condições de Pagamento</Label>
              <Textarea
                id="defaultPaymentTerms"
                rows={3}
                value={config.defaultPaymentTerms}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultPaymentTerms: e.target.value }))}
                placeholder="Ex: 50% na aprovação, 50% na entrega"
                data-testid="input-payment-terms"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTermsAndConditions">Termos e Condições</Label>
              <Textarea
                id="defaultTermsAndConditions"
                rows={6}
                value={config.defaultTermsAndConditions}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultTermsAndConditions: e.target.value }))}
                placeholder="Termos e condições padrão para inclusão nas propostas..."
                data-testid="input-terms-conditions"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2" data-testid="button-save-config">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
