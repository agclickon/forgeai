import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import ActivityHistory from "@/pages/activity-history";
import KanbanPage from "@/pages/kanban";
import TimelinePage from "@/pages/timeline";
import DocumentsPage from "@/pages/documents";
import VaultPage from "@/pages/vault";
import MindMapPage from "@/pages/mindmap";
import AgentsPage from "@/pages/agents";
import ClientForm from "@/pages/client-form";
import ProjectForm from "@/pages/project-form";
import ProjectDetail from "@/pages/project-detail";
import BriefingPage from "@/pages/briefing";
import ScopePage from "@/pages/scope";
import StylesPage from "@/pages/styles";
import MyTasks from "@/pages/my-tasks";
import AcceptInvite from "@/pages/accept-invite";
import AdminPage from "@/pages/admin";
import ExportPage from "@/pages/export";
import ClientManagement from "@/pages/client-management";
import ClientPortal from "@/pages/client-portal";
import ProfilePage from "@/pages/profile";
import { Loader2 } from "lucide-react";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b border-border bg-background h-14 flex-shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRouter() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/activity-history" component={ActivityHistory} />
        <Route path="/my-tasks" component={MyTasks} />
        <Route path="/kanban" component={KanbanPage} />
        <Route path="/clients/new" component={ClientForm} />
        <Route path="/clients/:id" component={ClientForm} />
        <Route path="/clients/:id/edit" component={ClientForm} />
        <Route path="/projects/new" component={ProjectForm} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/briefing" component={BriefingPage} />
        <Route path="/projects/:id/scope" component={ScopePage} />
        <Route path="/projects/:id/styles" component={StylesPage} />
        <Route path="/projects/:id/timeline" component={TimelinePage} />
        <Route path="/projects/:id/documents" component={DocumentsPage} />
        <Route path="/projects/:id/vault" component={VaultPage} />
        <Route path="/projects/:id/mindmap" component={MindMapPage} />
        <Route path="/projects/:id/agents" component={AgentsPage} />
        <Route path="/projects/:id/export" component={ExportPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/clients" component={ClientManagement} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/convite/:token" component={AcceptInvite} />
        <Route path="/portal" component={ClientPortal} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="project-ai-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
