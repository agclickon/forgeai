import { useState, useRef, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitBranch,
  Target,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  Users,
} from "lucide-react";
import type { Project, Scope, Roadmap, Briefing } from "@shared/schema";

interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  color?: string;
  icon?: string;
}

export default function MindMap() {
  const [, params] = useRoute("/projects/:id/mindmap");
  const projectId = params?.id;
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root", "scope", "roadmap", "briefing"]));

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
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

  const { data: briefing } = useQuery<Briefing>({
    queryKey: ["/api/projects", projectId, "briefing"],
    enabled: !!projectId,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const buildMindMapData = useCallback((): MindMapNode => {
    const deliverables = (scope?.deliverables as string[]) || [];
    const risks = (scope?.risks as string[]) || [];
    const phases = (roadmap?.phases as any[]) || [];
    const milestones = (roadmap?.milestones as any[]) || [];
    const assumptions = (scope?.assumptions as string[]) || [];

    return {
      id: "root",
      label: project?.name || "Projeto",
      color: "hsl(var(--primary))",
      children: [
        {
          id: "briefing",
          label: "Briefing",
          color: "hsl(210, 70%, 50%)",
          icon: "briefing",
          children: [
            { id: "b-type", label: `Tipo: ${briefing?.projectType || "N/A"}` },
            { id: "b-audience", label: `Público: ${briefing?.targetAudience || "N/A"}` },
            { id: "b-stack", label: `Stack: ${briefing?.stack || "N/A"}` },
            { id: "b-budget", label: `Orçamento: ${briefing?.budget || "N/A"}` },
          ],
        },
        {
          id: "scope",
          label: "Escopo",
          color: "hsl(150, 70%, 40%)",
          icon: "scope",
          children: [
            {
              id: "deliverables",
              label: `Entregáveis (${deliverables.length})`,
              children: deliverables.map((d, i) => ({
                id: `d-${i}`,
                label: d,
              })),
            },
            {
              id: "risks",
              label: `Riscos (${risks.length})`,
              children: risks.map((r, i) => ({
                id: `r-${i}`,
                label: r,
              })),
            },
            {
              id: "assumptions",
              label: `Premissas (${assumptions.length})`,
              children: assumptions.map((a, i) => ({
                id: `a-${i}`,
                label: a,
              })),
            },
          ],
        },
        {
          id: "roadmap",
          label: "Roadmap",
          color: "hsl(280, 70%, 50%)",
          icon: "roadmap",
          children: [
            {
              id: "phases",
              label: `Fases (${phases.length})`,
              children: phases.map((p, i) => ({
                id: `p-${i}`,
                label: p.name,
                children: p.tasks?.map((t: string, j: number) => ({
                  id: `p-${i}-t-${j}`,
                  label: t,
                })),
              })),
            },
            {
              id: "milestones",
              label: `Marcos (${milestones.length})`,
              children: milestones.map((m, i) => ({
                id: `m-${i}`,
                label: m.name,
              })),
            },
          ],
        },
      ],
    };
  }, [project, scope, roadmap, briefing]);

  const downloadSVG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${project?.name || "mindmap"}-mindmap.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
    toast({
      title: "Download iniciado",
      description: "O mapa mental foi exportado como SVG.",
      variant: "success",
    });
  };

  const downloadPNG = async () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${project?.name || "mindmap"}-mindmap.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    toast({
      title: "Download iniciado",
      description: "O mapa mental foi exportado como PNG.",
      variant: "success",
    });
  };

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
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

  const mindMapData = buildMindMapData();

  const renderNode = (node: MindMapNode, depth: number = 0, parentExpanded: boolean = true): React.ReactNode => {
    if (!parentExpanded) return null;

    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const bgColor = depth === 0 
      ? "bg-primary text-primary-foreground" 
      : depth === 1 
        ? "bg-muted" 
        : "bg-background border border-border";

    const iconMap: Record<string, typeof Target> = {
      briefing: Users,
      scope: Target,
      roadmap: GitBranch,
    };

    const Icon = node.icon ? iconMap[node.icon] : null;

    return (
      <div key={node.id} className="flex flex-col" style={{ marginLeft: depth > 0 ? 24 : 0 }}>
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${bgColor} hover-elevate`}
          onClick={() => hasChildren && toggleNode(node.id)}
          data-testid={`node-${node.id}`}
        >
          {hasChildren && (
            <span className="text-xs text-muted-foreground w-4">
              {isExpanded ? "-" : "+"}
            </span>
          )}
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span className={`text-sm ${depth === 0 ? "font-semibold" : depth === 1 ? "font-medium" : ""}`}>
            {node.label}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 mt-1 border-l border-border pl-2 space-y-1">
            {node.children!.map((child) => renderNode(child, depth + 1, isExpanded))}
          </div>
        )}
      </div>
    );
  };

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
                <GitBranch className="w-5 h-5" />
                Mapa Mental
              </h1>
              <p className="text-sm text-muted-foreground">
                {project.name} - Visualização hierárquica do projeto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setZoom(1);
                setExpandedNodes(new Set(["root", "scope", "roadmap", "briefing"]));
              }}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={downloadSVG} data-testid="button-download-svg">
              <Download className="w-4 h-4 mr-2" />
              SVG
            </Button>
            <Button variant="outline" onClick={downloadPNG} data-testid="button-download-png">
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Estrutura do Projeto</CardTitle>
              </CardHeader>
              <CardContent style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                <div className="space-y-2">
                  {renderNode(mindMapData)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Resumo do Escopo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Entregáveis</span>
                  <Badge variant="secondary">{((scope?.deliverables as string[]) || []).length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Riscos</span>
                  <Badge variant="secondary">{((scope?.risks as string[]) || []).length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Premissas</span>
                  <Badge variant="secondary">{((scope?.assumptions as string[]) || []).length}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Resumo do Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fases</span>
                  <Badge variant="secondary">{((roadmap?.phases as any[]) || []).length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Marcos</span>
                  <Badge variant="secondary">{((roadmap?.milestones as any[]) || []).length}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Legenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-sm">Projeto (raiz)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span className="text-sm">Categoria principal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-border" />
                  <span className="text-sm">Itens</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <svg ref={svgRef} style={{ position: "absolute", left: "-9999px" }} width="800" height="600">
        <rect fill="hsl(var(--background))" width="100%" height="100%" />
        <text x="400" y="50" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="bold">
          {project.name}
        </text>
        <text x="400" y="80" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="14">
          Mapa Mental do Projeto
        </text>
      </svg>
    </div>
  );
}
