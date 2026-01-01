import { useAuth } from "@/hooks/useAuth";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, Camera, Mail, Phone, Instagram, Facebook, 
  Linkedin, Youtube, X, ArrowLeft, Check, Shield, User as UserIcon,
  Pencil, Trash2, Plus, Twitter, Eye, EyeOff
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SafeUser = Omit<User, "password">;

const getRoleBadgeInfo = (role: string) => {
  switch (role) {
    case "platform_admin":
      return { label: "Super Administrador", variant: "default" as const, color: "bg-purple-600" };
    case "admin":
      return { label: "Administrador", variant: "secondary" as const, color: "bg-blue-600" };
    default:
      return { label: "Usuário", variant: "outline" as const, color: "" };
  }
};

const getRoleDescription = (role: string) => {
  switch (role) {
    case "platform_admin":
      return "Super Administrador - Controle total do sistema";
    case "admin":
      return "Administrador - Acesso administrativo";
    default:
      return "Usuário - Acesso padrão";
  }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({ isPrivate: false });

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [youtube, setYoutube] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Admin modal state
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [selectedRole, setSelectedRole] = useState("user");

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setJobTitle((user as any).jobTitle || "");
      setPhone((user as any).phone || "");
      setInstagram((user as any).instagram || "");
      setFacebook((user as any).facebook || "");
      setXHandle((user as any).xHandle || "");
      setLinkedin((user as any).linkedin || "");
      setYoutube((user as any).youtube || "");
    }
  }, [user]);

  // Fetch all users for admin section
  const { data: allUsers } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/all-users"],
    enabled: user?.role === "platform_admin",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await apiRequest("PUT", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Perfil atualizado com sucesso!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("PATCH", "/api/users/profile/password", data);
      return response.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Senha alterada com sucesso!", variant: "success" });
    },
    onError: (error: any) => {
      toast({ 
        title: error?.message || "Erro ao alterar senha", 
        variant: "destructive" 
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-users"] });
      setEditingUser(null);
      toast({ title: "Role do usuário atualizado!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar role", variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      const objectPath = await uploadFile(file);
      if (objectPath) {
        updateProfileMutation.mutate({ profileImageUrl: objectPath });
      }
    } catch (error) {
      toast({ title: "Erro ao fazer upload da foto", variant: "destructive" });
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      firstName,
      lastName,
      jobTitle,
      phone,
      instagram,
      facebook,
      xHandle,
      linkedin,
      youtube,
    } as any);
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "A nova senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const roleBadge = getRoleBadgeInfo(user.role);
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Usuário";
  const admins = allUsers?.filter(u => u.role === "admin" || u.role === "platform_admin") || [];

  // Helper to get proper image URL from object storage path
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `/api/files/${path}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-primary/20">
                  <AvatarImage src={getImageUrl(user.profileImageUrl)} className="object-cover" />
                  <AvatarFallback className="text-3xl bg-muted">
                    {firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="cursor-pointer"
                data-testid="button-upload-photo"
              >
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <span>
                    <Camera className="w-4 h-4" />
                    Alterar Foto
                  </span>
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  data-testid="input-photo"
                />
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-fullname">{fullName}</h1>
                <p className="text-muted-foreground" data-testid="text-jobtitle">
                  {jobTitle || "Sem cargo definido"}
                </p>
                <div className="mt-2">
                  <Badge className={`${roleBadge.color}`} data-testid="badge-role">
                    {roleBadge.label}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span data-testid="text-email">{user.email}</span>
                </div>
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span data-testid="text-phone">{phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancel/Back Button */}
            <div>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="gap-2"
                data-testid="button-back"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Networks Display */}
      {(instagram || facebook || xHandle || linkedin || youtube) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {instagram && (
                <a 
                  href={`https://instagram.com/${instagram.replace("@", "")}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-pink-500 hover:underline"
                  data-testid="link-instagram"
                >
                  <Instagram className="w-5 h-5" />
                  @{instagram.replace("@", "")}
                </a>
              )}
              {facebook && (
                <a 
                  href={`https://facebook.com/${facebook}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                  data-testid="link-facebook"
                >
                  <Facebook className="w-5 h-5" />
                  {facebook}
                </a>
              )}
              {xHandle && (
                <a 
                  href={`https://x.com/${xHandle.replace("@", "")}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                  data-testid="link-x"
                >
                  <Twitter className="w-5 h-5" />
                  @{xHandle.replace("@", "")}
                </a>
              )}
              {linkedin && (
                <a 
                  href={linkedin.startsWith("http") ? linkedin : `https://linkedin.com/in/${linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-700 hover:underline"
                  data-testid="link-linkedin"
                >
                  <Linkedin className="w-5 h-5" />
                  {linkedin}
                </a>
              )}
              {youtube && (
                <a 
                  href={youtube.startsWith("http") ? youtube : `https://youtube.com/@${youtube}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-red-600 hover:underline"
                  data-testid="link-youtube"
                >
                  <Youtube className="w-5 h-5" />
                  {youtube}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome Completo</label>
              <div className="flex gap-2">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Primeiro nome"
                  data-testid="input-first-name"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sobrenome"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cargo</label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex: Diretor de Tecnologia"
                data-testid="input-job-title"
              />
            </div>
          </div>

          {/* Phone and Instagram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Telefone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 48 999820640"
                data-testid="input-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Instagram</label>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="lucke.pereira.ia"
                data-testid="input-instagram"
              />
            </div>
          </div>

          {/* Facebook and X */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Facebook</label>
              <Input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="nome.perfil"
                data-testid="input-facebook"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">X (Twitter)</label>
              <Input
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="usuário (sem @)"
                data-testid="input-x-handle"
              />
            </div>
          </div>

          {/* LinkedIn and YouTube */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">LinkedIn</label>
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="nome-perfil"
                data-testid="input-linkedin"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">YouTube</label>
              <Input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="agclickon@gmail.com"
                data-testid="input-youtube"
              />
            </div>
          </div>

          <Separator />

          {/* Password Change */}
          <div className="space-y-4">
            <h3 className="font-medium">Alterar Senha</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Senha Atual (para alterar senha)</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="********"
                    className="pr-10"
                    data-testid="input-current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="toggle-current-password"
                  >
                    {showCurrentPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Nova Senha (opcional)</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha (min. 6 caracteres)"
                    className="pr-10"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="toggle-new-password"
                  >
                    {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="max-w-[calc(50%-0.5rem)]">
              <label className="text-sm font-medium mb-2 block">Confirmar Nova Senha</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="pr-10"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-confirm-password"
                >
                  {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="flex-1 bg-primary"
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
            {currentPassword && newPassword && (
              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                variant="secondary"
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Alterar Senha
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tipo de Conta</p>
              <p className="font-medium" data-testid="text-account-type">
                {getRoleDescription(user.role)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge 
                variant={user.isBlocked ? "destructive" : "default"}
                className={user.isBlocked ? "" : "bg-green-600"}
                data-testid="badge-status"
              >
                {user.isBlocked ? "Conta Bloqueada" : "Conta Ativa"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Management Section (platform_admin only) */}
      {user.role === "platform_admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gerenciar Administradores
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowAddAdminDialog(true)}
              data-testid="button-add-admin"
            >
              <Plus className="w-4 h-4" />
              Adicionar Administrador
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {admins.map((admin) => (
                <div 
                  key={admin.id} 
                  className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                  data-testid={`admin-card-${admin.id}`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getImageUrl(admin.profileImageUrl)} className="object-cover" />
                    <AvatarFallback>
                      {admin.firstName?.[0] || admin.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {[admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email}
                      </p>
                      <Badge className={getRoleBadgeInfo(admin.role).color} variant="secondary">
                        {getRoleBadgeInfo(admin.role).label}
                      </Badge>
                      <Badge variant={admin.isBlocked ? "destructive" : "default"} className={admin.isBlocked ? "" : "bg-green-600"}>
                        {admin.isBlocked ? "Bloqueado" : "Ativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    {(admin as any).jobTitle && (
                      <p className="text-xs text-muted-foreground mt-1">{(admin as any).jobTitle}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(admin);
                        setSelectedRole(admin.role);
                      }}
                      data-testid={`button-edit-admin-${admin.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}

              {admins.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum administrador cadastrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={getImageUrl(editingUser.profileImageUrl)} />
                  <AvatarFallback>
                    {editingUser.firstName?.[0] || editingUser.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {[editingUser.firstName, editingUser.lastName].filter(Boolean).join(" ") || editingUser.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Conta</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="platform_admin">Super Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingUser) {
                  updateUserRoleMutation.mutate({ userId: editingUser.id, role: selectedRole });
                }
              }}
              disabled={updateUserRoleMutation.isPending}
              data-testid="button-save-role"
            >
              {updateUserRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog - shows list of users to promote */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Administrador</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {allUsers?.filter(u => u.role === "user").map((u) => (
              <div 
                key={u.id} 
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={getImageUrl(u.profileImageUrl)} />
                    <AvatarFallback>
                      {u.firstName?.[0] || u.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    updateUserRoleMutation.mutate({ userId: u.id, role: "admin" });
                    setShowAddAdminDialog(false);
                  }}
                  data-testid={`button-promote-${u.id}`}
                >
                  Promover a Admin
                </Button>
              </div>
            ))}
            {allUsers?.filter(u => u.role === "user").length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Todos os usuários já são administradores.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
