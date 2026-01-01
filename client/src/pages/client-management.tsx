import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  FolderKanban,
  Phone,
  Mail,
  MapPin,
  FileText,
  Key,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Clock
} from "lucide-react";
import { Link } from "wouter";

interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  userId: string;
  documentType: string | null;
  document: string | null;
  razaoSocial: string | null;
  address: Address | null;
  hasPortalAccess: boolean | null;
  portalEmail: string | null;
  portalLastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  clientId: string;
  createdAt: string;
}

interface ClientFeedback {
  id: string;
  clientId: string;
  projectId: string | null;
  type: string;
  content: string;
  images: string[];
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
}

function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(numbers[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(numbers[13])) return false;
  
  return true;
}

export default function ClientManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    documentType: "cpf" as "cpf" | "cnpj",
    document: "",
    razaoSocial: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: ""
    } as Address,
    hasPortalAccess: false,
    portalEmail: "",
    portalPassword: ""
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: clientProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects/client", selectedClient?.id],
    enabled: !!selectedClient,
  });

  const { data: clientFeedbacks } = useQuery<ClientFeedback[]>({
    queryKey: ["/api/clients", selectedClient?.id, "feedbacks"],
    enabled: !!selectedClient,
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return apiRequest("PUT", `/api/clients/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Cliente atualizado",
        description: "Os dados do cliente foram atualizados com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      setSelectedClient(null);
      setIsViewDialogOpen(false);
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; reviewNotes?: string }) => {
      return apiRequest("PUT", `/api/feedbacks/${data.id}`, {
        status: data.status,
        reviewNotes: data.reviewNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClient?.id, "feedbacks"] });
      toast({
        title: "Feedback atualizado",
        description: "O status do feedback foi atualizado.",
        variant: "success",
      });
    },
  });

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document?.includes(searchTerm)
  ) || [];

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setEditForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      notes: client.notes || "",
      documentType: (client.documentType as "cpf" | "cnpj") || "cpf",
      document: client.document || "",
      razaoSocial: client.razaoSocial || "",
      address: (client.address as Address) || {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: ""
      },
      hasPortalAccess: client.hasPortalAccess || false,
      portalEmail: client.portalEmail || "",
      portalPassword: ""
    });
    setIsEditDialogOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setActiveTab("info");
    setIsViewDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;

    if (editForm.documentType === "cpf" && editForm.document && !validateCPF(editForm.document)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    if (editForm.documentType === "cnpj" && editForm.document && !validateCNPJ(editForm.document)) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, insira um CNPJ válido.",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      company: editForm.company || null,
      notes: editForm.notes || null,
      documentType: editForm.documentType,
      document: editForm.document.replace(/\D/g, '') || null,
      razaoSocial: editForm.documentType === "cnpj" ? editForm.razaoSocial : null,
      address: editForm.address,
      hasPortalAccess: editForm.hasPortalAccess,
      portalEmail: editForm.hasPortalAccess ? editForm.portalEmail : null,
    };

    if (editForm.hasPortalAccess && editForm.portalPassword) {
      const bcrypt = await import('bcrypt');
      updates.portalPassword = await bcrypt.hash(editForm.portalPassword, 10);
    }

    updateClientMutation.mutate({ id: selectedClient.id, updates });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "reviewed": return "bg-blue-500/10 text-blue-500";
      case "resolved": return "bg-green-500/10 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendente";
      case "reviewed": return "Revisado";
      case "resolved": return "Resolvido";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "observation": return "Observação";
      case "suggestion": return "Sugestão";
      case "issue": return "Problema";
      default: return type;
    }
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
            <p className="text-muted-foreground">Gerencie todos os clientes da plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-clients"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover-elevate" data-testid={`card-client-${client.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold truncate">{client.name}</h3>
                      {client.hasPortalAccess && (
                        <Badge variant="outline" className="text-xs">
                          <Key className="h-3 w-3 mr-1" />
                          Portal
                        </Badge>
                      )}
                      {client.documentType && (
                        <Badge variant="secondary" className="text-xs uppercase">
                          {client.documentType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                      {client.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {client.company}
                        </span>
                      )}
                      {client.document && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {client.documentType === "cpf" 
                            ? formatCPF(client.document) 
                            : formatCNPJ(client.document)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewClient(client)}
                      data-testid={`button-view-client-${client.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditClient(client)}
                      data-testid={`button-edit-client-${client.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteClientMutation.mutate(client.id)}
                      data-testid={`button-delete-client-${client.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedClient?.name}
            </DialogTitle>
            <DialogDescription>
              Visualize os detalhes do cliente, projetos e feedbacks
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" data-testid="tab-client-info">
                <Users className="h-4 w-4 mr-2" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="projects" data-testid="tab-client-projects">
                <FolderKanban className="h-4 w-4 mr-2" />
                Projetos
              </TabsTrigger>
              <TabsTrigger value="feedbacks" data-testid="tab-client-feedbacks">
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedbacks
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[500px] mt-4">
              <TabsContent value="info" className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedClient?.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedClient?.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedClient?.phone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Empresa</Label>
                    <p className="font-medium">{selectedClient?.company || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo de Documento</Label>
                    <p className="font-medium uppercase">{selectedClient?.documentType || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Documento</Label>
                    <p className="font-medium">
                      {selectedClient?.document 
                        ? (selectedClient.documentType === "cpf" 
                            ? formatCPF(selectedClient.document) 
                            : formatCNPJ(selectedClient.document))
                        : "-"}
                    </p>
                  </div>
                  {selectedClient?.documentType === "cnpj" && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Razão Social</Label>
                      <p className="font-medium">{selectedClient?.razaoSocial || "-"}</p>
                    </div>
                  )}
                </div>
                
                {selectedClient?.address && Object.values(selectedClient.address).some(v => v) && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </Label>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      {(selectedClient.address as Address).street && (
                        <p>
                          {(selectedClient.address as Address).street}, {(selectedClient.address as Address).number}
                          {(selectedClient.address as Address).complement && ` - ${(selectedClient.address as Address).complement}`}
                        </p>
                      )}
                      {(selectedClient.address as Address).neighborhood && (
                        <p>{(selectedClient.address as Address).neighborhood}</p>
                      )}
                      {((selectedClient.address as Address).city || (selectedClient.address as Address).state) && (
                        <p>
                          {(selectedClient.address as Address).city}{(selectedClient.address as Address).state && ` - ${(selectedClient.address as Address).state}`}
                        </p>
                      )}
                      {(selectedClient.address as Address).zipCode && (
                        <p>CEP: {(selectedClient.address as Address).zipCode}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedClient?.notes && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm mt-1">{selectedClient.notes}</p>
                  </div>
                )}
                
                {selectedClient?.hasPortalAccess && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4" />
                      Acesso ao Portal do Cliente
                    </Label>
                    <p>Email do portal: {selectedClient.portalEmail}</p>
                    {selectedClient.portalLastLoginAt && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Último acesso: {new Date(selectedClient.portalLastLoginAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="projects" className="space-y-4 pr-4">
                {!clientProjects || clientProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum projeto encontrado para este cliente</p>
                  </div>
                ) : (
                  clientProjects.map((project) => (
                    <Card key={project.id} data-testid={`card-project-${project.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{project.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{project.status}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {project.progress}% concluído
                              </span>
                            </div>
                          </div>
                          <Link href={`/project/${project.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-open-project-${project.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Projeto
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="feedbacks" className="space-y-4 pr-4">
                {!clientFeedbacks || clientFeedbacks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum feedback encontrado</p>
                  </div>
                ) : (
                  clientFeedbacks.map((feedback) => (
                    <Card key={feedback.id} data-testid={`card-feedback-${feedback.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{getTypeLabel(feedback.type)}</Badge>
                              <Badge className={getStatusColor(feedback.status)}>
                                {getStatusLabel(feedback.status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm">{feedback.content}</p>
                            {feedback.images && (feedback.images as string[]).length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {(feedback.images as string[]).map((img, idx) => (
                                  <img 
                                    key={idx} 
                                    src={img} 
                                    alt={`Anexo ${idx + 1}`} 
                                    className="h-16 w-16 object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                            {feedback.reviewNotes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                                <span className="font-medium">Notas da revisão:</span> {feedback.reviewNotes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {feedback.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateFeedbackMutation.mutate({ 
                                    id: feedback.id, 
                                    status: "reviewed" 
                                  })}
                                  data-testid={`button-review-feedback-${feedback.id}`}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateFeedbackMutation.mutate({ 
                                    id: feedback.id, 
                                    status: "resolved" 
                                  })}
                                  data-testid={`button-resolve-feedback-${feedback.id}`}
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedClient) handleEditClient(selectedClient);
            }} data-testid="button-edit-from-view">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    data-testid="input-edit-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    data-testid="input-edit-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    data-testid="input-edit-phone"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    data-testid="input-edit-company"
                  />
                </div>
                
                <div>
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <Select
                    value={editForm.documentType}
                    onValueChange={(value: "cpf" | "cnpj") => setEditForm({ ...editForm, documentType: value })}
                  >
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="document">
                    {editForm.documentType === "cpf" ? "CPF" : "CNPJ"}
                  </Label>
                  <Input
                    id="document"
                    value={editForm.documentType === "cpf" 
                      ? formatCPF(editForm.document) 
                      : formatCNPJ(editForm.document)}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      document: e.target.value.replace(/\D/g, '')
                    })}
                    placeholder={editForm.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    data-testid="input-edit-document"
                  />
                </div>
                
                {editForm.documentType === "cnpj" && (
                  <div className="col-span-2">
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      value={editForm.razaoSocial}
                      onChange={(e) => setEditForm({ ...editForm, razaoSocial: e.target.value })}
                      data-testid="input-edit-razao-social"
                    />
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={editForm.address.street || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, street: e.target.value }
                      })}
                      data-testid="input-edit-street"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={editForm.address.number || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, number: e.target.value }
                      })}
                      data-testid="input-edit-number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={editForm.address.complement || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, complement: e.target.value }
                      })}
                      data-testid="input-edit-complement"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={editForm.address.neighborhood || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, neighborhood: e.target.value }
                      })}
                      data-testid="input-edit-neighborhood"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={editForm.address.zipCode || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, zipCode: e.target.value }
                      })}
                      data-testid="input-edit-zipcode"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={editForm.address.city || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, city: e.target.value }
                      })}
                      data-testid="input-edit-city"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={editForm.address.state || ""}
                      onChange={(e) => setEditForm({ 
                        ...editForm, 
                        address: { ...editForm.address, state: e.target.value }
                      })}
                      data-testid="input-edit-state"
                    />
                  </div>
                </div>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-edit-notes"
                />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Acesso ao Portal do Cliente
                </h4>
                
                <div className="flex items-center gap-4 mb-4">
                  <Switch
                    checked={editForm.hasPortalAccess}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, hasPortalAccess: checked })}
                    data-testid="switch-portal-access"
                  />
                  <Label>Habilitar acesso ao portal do cliente</Label>
                </div>
                
                {editForm.hasPortalAccess && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="portalEmail">Email do Portal</Label>
                      <Input
                        id="portalEmail"
                        type="email"
                        value={editForm.portalEmail}
                        onChange={(e) => setEditForm({ ...editForm, portalEmail: e.target.value })}
                        data-testid="input-portal-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="portalPassword">Nova Senha do Portal</Label>
                      <Input
                        id="portalPassword"
                        type="password"
                        value={editForm.portalPassword}
                        onChange={(e) => setEditForm({ ...editForm, portalPassword: e.target.value })}
                        placeholder="Deixe em branco para manter a atual"
                        data-testid="input-portal-password"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveClient}
              disabled={updateClientMutation.isPending}
              data-testid="button-save-client"
            >
              {updateClientMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
