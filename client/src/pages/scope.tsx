import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Target,
  Package,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  RefreshCw,
  Download,
  FileText,
  Clock,
  Sparkles,
  GitBranch,
  ChevronDown,
  ChevronRight,
  History,
  RotateCcw,
  Workflow,
  Network,
  Share2,
  Box,
  Circle,
  Diamond,
  ArrowRight,
  Layers,
  Save,
  Pencil,
  Plus,
  Trash2,
  ChevronUp,
  MoveUp,
  MoveDown,
  Upload,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, Scope, Briefing, ScopeVersion, ProjectDiagram, ProjectWbs } from "@shared/schema";
import JSZip from "jszip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WBSItem {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  deliverables: string[];
  completed?: boolean;
}

interface WBSPhase {
  name: string;
  description: string;
  estimatedHours: number;
  items: WBSItem[];
}

export default function ScopePage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/scope");
  const projectId = params?.id;
  const { toast } = useToast();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("scope");
  const [generatingDiagram, setGeneratingDiagram] = useState<string | null>(null);

  // Editing state for scope cards
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editObjective, setEditObjective] = useState("");
  const [editDeliverables, setEditDeliverables] = useState<string[]>([]);
  const [editOutOfScope, setEditOutOfScope] = useState<string[]>([]);
  const [editAssumptions, setEditAssumptions] = useState<string[]>([]);
  const [editDependencies, setEditDependencies] = useState<string[]>([]);
  const [editRisks, setEditRisks] = useState<string[]>([]);

  // Diagram editing state
  const [editingFlowDiagram, setEditingFlowDiagram] = useState(false);
  const [editFlowNodes, setEditFlowNodes] = useState<any[]>([]);
  const [editingArchDiagram, setEditingArchDiagram] = useState(false);
  const [editArchComponents, setEditArchComponents] = useState<any[]>([]);
  const [editArchLayers, setEditArchLayers] = useState<any[]>([]);
  
  // Mind Map editing state
  const [editingMindMap, setEditingMindMap] = useState(false);
  const [editMindMapData, setEditMindMapData] = useState<any>(null);

  // Details editing state
  const [editingDetails, setEditingDetails] = useState(false);
  const [editProjectType, setEditProjectType] = useState("");
  const [editStack, setEditStack] = useState("");
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(undefined);
  const [editBudget, setEditBudget] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: scope, isLoading: scopeLoading } = useQuery<Scope>({
    queryKey: ["/api/projects", projectId, "scope"],
    enabled: !!projectId,
  });

  const { data: briefing } = useQuery<Briefing>({
    queryKey: ["/api/projects", projectId, "briefing"],
    enabled: !!projectId,
  });

  const { data: scopeVersions = [] } = useQuery<ScopeVersion[]>({
    queryKey: ["/api/projects", projectId, "scope", "versions"],
    enabled: !!projectId,
  });

  const { data: diagrams = [] } = useQuery<ProjectDiagram[]>({
    queryKey: ["/api/projects", projectId, "diagrams"],
    enabled: !!projectId,
  });

  const { data: wbsData } = useQuery<ProjectWbs>({
    queryKey: ["/api/projects", projectId, "wbs"],
    enabled: !!projectId,
  });

  // Parse WBS phases from database
  const wbs = wbsData ? {
    phases: (wbsData.phases as WBSPhase[]) || [],
    totalEstimatedHours: wbsData.totalEstimatedHours || 0,
    criticalPath: (wbsData.criticalPath as string[]) || [],
  } : null;

  const createVersionMutation = useMutation({
    mutationFn: async (changeNotes: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/scope/version`, { changeNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope", "versions"] });
      toast({
        title: "Versão salva",
        description: "Uma nova versão do escopo foi criada.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a versão.",
        variant: "destructive",
      });
    },
  });

  const updateScopeMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/scope`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope", "versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingSection(null);
      toast({
        title: "Escopo atualizado",
        description: "As alterações foram salvas com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const updateBriefingMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/briefing`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingDetails(false);
      toast({
        title: "Detalhes atualizados",
        description: "As alterações foram salvas com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const startEditingDetails = () => {
    setEditProjectType(briefing?.projectType || "");
    setEditStack(briefing?.stack || "");
    setEditDeadline(briefing?.deadline ? new Date(briefing.deadline) : undefined);
    setEditBudget(briefing?.budget || "");
    setEditingDetails(true);
  };

  const saveDetails = () => {
    const data: Record<string, any> = {
      projectType: editProjectType,
      stack: editStack,
      budget: editBudget,
    };
    if (editDeadline) {
      data.deadline = editDeadline.toISOString();
    }
    updateBriefingMutation.mutate(data);
  };

  const cancelEditingDetails = () => {
    setEditingDetails(false);
  };

  // Helper functions for editing
  const startEditing = (section: string) => {
    if (!scope) return;
    switch (section) {
      case "objective":
        setEditObjective(scope.objective || "");
        break;
      case "deliverables":
        setEditDeliverables((scope.deliverables as string[]) || []);
        break;
      case "outOfScope":
        setEditOutOfScope((scope.outOfScope as string[]) || []);
        break;
      case "assumptions":
        setEditAssumptions((scope.assumptions as string[]) || []);
        break;
      case "dependencies":
        setEditDependencies((scope.dependencies as string[]) || []);
        break;
      case "risks":
        setEditRisks((scope.risks as string[]) || []);
        break;
    }
    setEditingSection(section);
  };

  const saveSection = (section: string) => {
    let data: Record<string, any> = {};
    switch (section) {
      case "objective":
        data = { objective: editObjective };
        break;
      case "deliverables":
        data = { deliverables: editDeliverables.filter(item => item.trim()) };
        break;
      case "outOfScope":
        data = { outOfScope: editOutOfScope.filter(item => item.trim()) };
        break;
      case "assumptions":
        data = { assumptions: editAssumptions.filter(item => item.trim()) };
        break;
      case "dependencies":
        data = { dependencies: editDependencies.filter(item => item.trim()) };
        break;
      case "risks":
        data = { risks: editRisks.filter(item => item.trim()) };
        break;
    }
    updateScopeMutation.mutate(data);
  };

  const cancelEditing = () => {
    setEditingSection(null);
  };

  const updateListItem = (
    list: string[],
    setList: (items: string[]) => void,
    index: number,
    value: string
  ) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
  };

  const addListItem = (list: string[], setList: (items: string[]) => void) => {
    setList([...list, ""]);
  };

  const removeListItem = (
    list: string[],
    setList: (items: string[]) => void,
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/scope/restore/${versionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope", "versions"] });
      toast({
        title: "Versão restaurada",
        description: "O escopo foi restaurado para a versão selecionada.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível restaurar a versão.",
        variant: "destructive",
      });
    },
  });

  const generateDiagramMutation = useMutation({
    mutationFn: async (type: string) => {
      setGeneratingDiagram(type);
      const result = await apiRequest("POST", `/api/projects/${projectId}/diagrams/${type}/generate`);
      return result;
    },
    onSuccess: (_, type) => {
      setGeneratingDiagram(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "diagrams"] });
      const diagramNames: Record<string, string> = {
        flow: "Diagrama de Fluxo",
        architecture: "Diagrama de Arquitetura",
        mindmap: "Mapa Mental",
      };
      toast({
        title: "Diagrama gerado",
        description: `${diagramNames[type]} foi criado com sucesso.`,
        variant: "success",
      });
    },
    onError: () => {
      setGeneratingDiagram(null);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o diagrama.",
        variant: "destructive",
      });
    },
  });

  const updateDiagramMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      const result = await apiRequest("PATCH", `/api/projects/${projectId}/diagrams/${type}`, { data });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "diagrams"] });
      setEditingFlowDiagram(false);
      setEditingArchDiagram(false);
      setEditingMindMap(false);
      setEditMindMapData(null);
      toast({
        title: "Diagrama atualizado",
        description: "As alterações foram salvas com sucesso.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  // Diagram editing functions
  const startEditingFlowDiagram = () => {
    const flowDiagram = getDiagramByType("flow");
    if (flowDiagram?.data?.nodes) {
      setEditFlowNodes([...flowDiagram.data.nodes]);
      setEditingFlowDiagram(true);
    }
  };

  const cancelEditingFlowDiagram = () => {
    setEditingFlowDiagram(false);
    setEditFlowNodes([]);
  };

  const saveFlowDiagram = () => {
    const flowDiagram = getDiagramByType("flow");
    if (flowDiagram?.data) {
      // Rebuild connections based on new node order
      const newConnections = editFlowNodes.slice(0, -1).map((node, index) => ({
        from: node.id,
        to: editFlowNodes[index + 1]?.id,
        label: "",
      }));
      updateDiagramMutation.mutate({
        type: "flow",
        data: {
          ...flowDiagram.data,
          nodes: editFlowNodes,
          connections: newConnections,
        },
      });
    }
  };

  const moveFlowNode = (index: number, direction: "up" | "down") => {
    const newNodes = [...editFlowNodes];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newNodes.length) {
      [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
      setEditFlowNodes(newNodes);
    }
  };

  const updateFlowNode = (index: number, field: string, value: string) => {
    const newNodes = [...editFlowNodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    setEditFlowNodes(newNodes);
  };

  const startEditingArchDiagram = () => {
    const archDiagram = getDiagramByType("architecture");
    if (archDiagram?.data) {
      // Add technologiesString field for editing (preserves comma input)
      const componentsWithString = (archDiagram.data.components || []).map((c: any) => ({
        ...c,
        technologiesString: (c.technologies || []).join(", "),
      }));
      setEditArchComponents(componentsWithString);
      setEditArchLayers([...(archDiagram.data.layers || [])]);
      setEditingArchDiagram(true);
    }
  };

  const cancelEditingArchDiagram = () => {
    setEditingArchDiagram(false);
    setEditArchComponents([]);
    setEditArchLayers([]);
  };

  const saveArchDiagram = () => {
    const archDiagram = getDiagramByType("architecture");
    if (archDiagram?.data) {
      // Convert technologiesString back to technologies array
      const componentsToSave = editArchComponents.map((c: any) => ({
        ...c,
        technologies: c.technologiesString
          ? c.technologiesString.split(",").map((t: string) => t.trim()).filter(Boolean)
          : c.technologies || [],
      }));
      // Remove the temporary technologiesString field
      componentsToSave.forEach((c: any) => delete c.technologiesString);
      
      updateDiagramMutation.mutate({
        type: "architecture",
        data: {
          ...archDiagram.data,
          components: componentsToSave,
          layers: editArchLayers,
        },
      });
    }
  };

  const updateArchComponent = (index: number, field: string, value: any) => {
    const newComponents = [...editArchComponents];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setEditArchComponents(newComponents);
  };

  const addArchComponent = (layerId: string) => {
    const newId = `comp-${Date.now()}`;
    const newComponent = {
      id: newId,
      name: "Novo Componente",
      description: "Descrição do componente",
      type: "service",
      technologies: [],
      technologiesString: "",
    };
    setEditArchComponents([...editArchComponents, newComponent]);
    // Add to layer
    const newLayers = editArchLayers.map(layer => 
      layer.name === layerId || layer.id === layerId
        ? { ...layer, components: [...(layer.components || []), newId] }
        : layer
    );
    setEditArchLayers(newLayers);
  };

  const removeArchComponent = (componentId: string) => {
    setEditArchComponents(editArchComponents.filter(c => c.id !== componentId));
    // Remove from layers
    const newLayers = editArchLayers.map(layer => ({
      ...layer,
      components: (layer.components || []).filter((id: string) => id !== componentId),
    }));
    setEditArchLayers(newLayers);
  };

  // Mind Map editing functions
  const startEditingMindMap = () => {
    const mindMap = getDiagramByType("mindmap");
    if (mindMap?.data) {
      // Deep clone the data to avoid mutation
      setEditMindMapData(JSON.parse(JSON.stringify(mindMap.data)));
      setEditingMindMap(true);
    }
  };

  const cancelEditingMindMap = () => {
    setEditingMindMap(false);
    setEditMindMapData(null);
  };

  const saveMindMap = () => {
    if (editMindMapData) {
      updateDiagramMutation.mutate({
        type: "mindmap",
        data: editMindMapData,
      });
    }
  };

  // Helper to find a node and its parent in the tree
  const findNodeInTree = (root: any, targetId: string, parent: any = null): { node: any; parent: any; index: number } | null => {
    if (root.id === targetId) {
      return { node: root, parent, index: -1 };
    }
    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        if (root.children[i].id === targetId) {
          return { node: root.children[i], parent: root, index: i };
        }
        const found = findNodeInTree(root.children[i], targetId, root.children[i]);
        if (found) return found;
      }
    }
    return null;
  };

  const updateMindMapNode = (nodeId: string, field: string, value: any) => {
    if (!editMindMapData?.rootNode) return;
    
    const updateNodeRecursive = (node: any): any => {
      if (node.id === nodeId) {
        return { ...node, [field]: value };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map((child: any) => updateNodeRecursive(child)),
        };
      }
      return node;
    };

    setEditMindMapData({
      ...editMindMapData,
      rootNode: updateNodeRecursive(editMindMapData.rootNode),
    });
  };

  const addMindMapChild = (parentId: string) => {
    if (!editMindMapData?.rootNode) return;
    
    const newChild = {
      id: `node-${Date.now()}`,
      label: "Novo Nó",
      description: "Descrição do nó",
      children: [],
    };

    const addChildRecursive = (node: any): any => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newChild],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map((child: any) => addChildRecursive(child)),
        };
      }
      return node;
    };

    setEditMindMapData({
      ...editMindMapData,
      rootNode: addChildRecursive(editMindMapData.rootNode),
    });
  };

  const removeMindMapNode = (nodeId: string) => {
    if (!editMindMapData?.rootNode) return;
    // Can't remove root node
    if (editMindMapData.rootNode.id === nodeId) return;

    const removeNodeRecursive = (node: any): any => {
      if (node.children) {
        return {
          ...node,
          children: node.children
            .filter((child: any) => child.id !== nodeId)
            .map((child: any) => removeNodeRecursive(child)),
        };
      }
      return node;
    };

    setEditMindMapData({
      ...editMindMapData,
      rootNode: removeNodeRecursive(editMindMapData.rootNode),
    });
  };

  const moveMindMapNode = (nodeId: string, direction: "up" | "down") => {
    if (!editMindMapData?.rootNode) return;

    const moveNodeRecursive = (node: any): any => {
      if (node.children) {
        const idx = node.children.findIndex((c: any) => c.id === nodeId);
        if (idx !== -1) {
          const newChildren = [...node.children];
          const newIdx = direction === "up" ? idx - 1 : idx + 1;
          if (newIdx >= 0 && newIdx < newChildren.length) {
            [newChildren[idx], newChildren[newIdx]] = [newChildren[newIdx], newChildren[idx]];
          }
          return { ...node, children: newChildren };
        }
        return {
          ...node,
          children: node.children.map((child: any) => moveNodeRecursive(child)),
        };
      }
      return node;
    };

    setEditMindMapData({
      ...editMindMapData,
      rootNode: moveNodeRecursive(editMindMapData.rootNode),
    });
  };

  // Helper to get sanitized project name for filenames
  const getProjectFilename = (extension: string) => {
    const projectName = project?.name || "mapa-mental";
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, "").replace(/\s+/g, "_");
    return `${sanitizedName}.${extension}`;
  };

  // Mind Map Export Functions
  const exportMindMapAsText = (data: any) => {
    if (!data?.rootNode) return;
    
    const renderTextNode = (node: any, indent: string = ""): string => {
      let text = `${indent}${node.label}${node.description ? ` - ${node.description}` : ""}\n`;
      if (node.children) {
        node.children.forEach((child: any) => {
          text += renderTextNode(child, indent + "  ");
        });
      }
      return text;
    };

    const content = `${data.title || "Mapa Mental"}\n${"=".repeat(50)}\n\n${renderTextNode(data.rootNode)}`;
    downloadFile(content, "text/plain", getProjectFilename("txt"));
  };

  const exportMindMapAsFreemind = (data: any) => {
    if (!data?.rootNode) return;
    
    const escapeXml = (str: string) => {
      if (!str) return "";
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    let nodeCounter = 0;
    const generateId = () => `ID_${++nodeCounter}`;
    
    const renderFreemindNode = (node: any, position?: string): string => {
      const id = generateId();
      const text = escapeXml(node.label || "");
      const posAttr = position ? ` POSITION="${position}"` : "";
      
      // Alternate left/right positions for first level children
      const childNodes = node.children || [];
      let childrenXml = "";
      
      if (childNodes.length > 0) {
        childrenXml = childNodes.map((child: any, idx: number) => {
          // For root node, alternate positions; otherwise inherit
          const childPos = position === undefined 
            ? (idx % 2 === 0 ? "right" : "left") 
            : position;
          return renderFreemindNode(child, childPos);
        }).join("\n");
      }
      
      // Add note/richcontent if there's a description
      let noteXml = "";
      if (node.description) {
        noteXml = `
<richcontent TYPE="NOTE">
<html>
<head></head>
<body><p>${escapeXml(node.description)}</p></body>
</html>
</richcontent>`;
      }
      
      if (childrenXml || noteXml) {
        return `<node ID="${id}" TEXT="${text}"${posAttr}>${noteXml}
${childrenXml}
</node>`;
      }
      return `<node ID="${id}" TEXT="${text}"${posAttr}/>`;
    };

    const content = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
<!-- To view this file, download free mind mapping software FreeMind from http://freemind.sourceforge.net -->
${renderFreemindNode(data.rootNode)}
</map>`;
    downloadFile(content, "application/xml", getProjectFilename("mm"));
  };

  const exportMindMapAsXMind = (data: any) => {
    if (!data?.rootNode) return;
    
    // XMind uses JSON format internally
    const xmindData = {
      id: data.rootNode.id,
      class: "sheet",
      title: data.title || "Mapa Mental",
      rootTopic: convertToXMindTopic(data.rootNode),
    };

    function convertToXMindTopic(node: any): any {
      return {
        id: node.id,
        class: "topic",
        title: node.label,
        notes: node.description ? { plain: { content: node.description } } : undefined,
        children: node.children?.length ? {
          attached: node.children.map((c: any) => convertToXMindTopic(c)),
        } : undefined,
      };
    }

    const content = JSON.stringify([xmindData], null, 2);
    downloadFile(content, "application/json", getProjectFilename("xmind.json"));
  };

  const exportMindMapAsMind = async (data: any) => {
    if (!data?.rootNode) return;
    
    // Generate unique IDs for MindMeister format
    let idCounter = Math.floor(Date.now() / 1000);
    const generateId = () => idCounter++;
    
    // Convert our node format to MindMeister format
    const convertToMindMeisterNode = (node: any, rank: number = 1, pos?: [number, number]): any => {
      const nodeId = generateId();
      const now = new Date().toISOString();
      
      return {
        id: nodeId,
        title: node.label || "",
        rank: rank,
        pos: pos || [null, null],
        icon: null,
        style: null,
        created_at: now,
        updated_at: now,
        note: node.description || null,
        link: null,
        task: {
          from: null,
          until: null,
          resource: null,
          effort: null,
          notify: 1
        },
        external_task: null,
        attachments: [],
        image: null,
        children: (node.children || []).map((child: any, idx: number) => 
          convertToMindMeisterNode(child, idx + 1)
        ),
        boundary: null,
        video: null,
        property: null
      };
    };
    
    // Build the map.json structure
    const mapData = {
      map_version: "3.0",
      root: convertToMindMeisterNode(data.rootNode, null as any, [0, 0])
    };
    
    // Create ZIP file with map.json
    const zip = new JSZip();
    zip.file("map.json", JSON.stringify(mapData));
    
    const blob = await zip.generateAsync({ type: "blob" });
    
    // Use project name for filename
    const filename = getProjectFilename("mind");
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exportado com sucesso",
      description: `Arquivo ${filename} foi baixado. Compatível com MindMeister.`,
      variant: "success",
    });
  };

  const downloadFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exportado com sucesso",
      description: `Arquivo ${filename} foi baixado.`,
      variant: "success",
    });
  };

  // Mind Map Import Function
  const importMindMap = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedData: any;

        // Try to parse as JSON first (.mind, .xmind.json)
        try {
          const parsed = JSON.parse(content);
          
          // Handle .mind format
          if (parsed.format === "node-mind-map" && parsed.root) {
            importedData = {
              title: parsed.title || "Mapa Mental Importado",
              description: parsed.description || "",
              rootNode: parsed.root,
            };
          }
          // Handle XMind format
          else if (Array.isArray(parsed) && parsed[0]?.rootTopic) {
            const sheet = parsed[0];
            importedData = {
              title: sheet.title || "Mapa Mental Importado",
              description: "",
              rootNode: convertXMindToNode(sheet.rootTopic),
            };
          }
          // Handle simple JSON with rootNode
          else if (parsed.rootNode) {
            importedData = parsed;
          }
          else {
            throw new Error("Formato JSON não reconhecido");
          }
        } catch (jsonError) {
          // Try to parse as Freemind XML (.mm)
          if (content.includes("<map") && content.includes("<node")) {
            importedData = parseFreemindXML(content);
          } else {
            throw new Error("Formato de arquivo não suportado");
          }
        }

        if (importedData && importedData.rootNode) {
          // Save the imported mind map
          updateDiagramMutation.mutate({
            type: "mindmap",
            data: importedData,
          });
          toast({
            title: "Mapa mental importado",
            description: "O arquivo foi importado com sucesso.",
            variant: "success",
          });
        } else {
          throw new Error("Dados do mapa mental inválidos");
        }
      } catch (error: any) {
        toast({
          title: "Erro na importação",
          description: error.message || "Não foi possível importar o arquivo.",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erro na leitura",
        description: "Não foi possível ler o arquivo.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
    // Reset input so the same file can be imported again
    event.target.value = "";
  };

  const convertXMindToNode = (topic: any): any => {
    return {
      id: topic.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: topic.title || "Sem título",
      description: topic.notes?.plain?.content || "",
      children: topic.children?.attached?.map((c: any) => convertXMindToNode(c)) || [],
    };
  };

  const parseFreemindXML = (xmlContent: string): any => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");
    const mapNode = doc.querySelector("map > node");
    
    if (!mapNode) {
      throw new Error("Arquivo Freemind inválido");
    }

    const parseNode = (element: Element): any => {
      const children = Array.from(element.querySelectorAll(":scope > node"));
      return {
        id: element.getAttribute("ID") || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: element.getAttribute("TEXT") || "Sem título",
        description: "",
        children: children.map(parseNode),
      };
    };

    return {
      title: mapNode.getAttribute("TEXT") || "Mapa Mental Importado",
      description: "",
      rootNode: parseNode(mapNode),
    };
  };

  const regenerateScopeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/scope/regenerate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scope"] });
      toast({
        title: "Escopo regenerado",
        description: "O escopo foi atualizado com base no briefing.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível regenerar o escopo.",
        variant: "destructive",
      });
    },
  });

  const toggleWbsItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/wbs/items/${itemId}`, { completed });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "wbs"] });
    },
  });

  const generateWbsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/wbs/generate`);
      return await response.json() as ProjectWbs;
    },
    onSuccess: (data: ProjectWbs) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      const phases = (data.phases as WBSPhase[]) || [];
      setExpandedPhases(new Set(phases.map(p => p.name)));
      toast({
        title: "WBS gerada",
        description: `Estrutura com ${phases.length} fases e ${data.totalEstimatedHours || 0}h estimadas.`,
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar a WBS.",
        variant: "destructive",
      });
    },
  });

  const togglePhase = (phaseName: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseName)) {
      newExpanded.delete(phaseName);
    } else {
      newExpanded.add(phaseName);
    }
    setExpandedPhases(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getDiagramByType = (type: string) => {
    return diagrams.find(d => d.type === type);
  };

  const exportDiagramAsText = (type: string, data: any) => {
    if (!data || !project) return;
    
    const diagramNames: Record<string, string> = {
      flow: "diagrama-fluxo",
      architecture: "diagrama-arquitetura",
      mindmap: "mapa-mental",
    };
    
    let content = "";
    
    if (type === "flow" && data.nodes) {
      content = `${data.title || "Diagrama de Fluxo"}\n${project.name}\n${"=".repeat(60)}\n\n`;
      data.nodes.forEach((node: any, i: number) => {
        content += `${i + 1}. [${node.type.toUpperCase()}] ${node.label}\n`;
        if (node.description) content += `   ${node.description}\n`;
        if (i < data.nodes.length - 1) content += "\n";
      });
    } else if (type === "architecture" && data.components) {
      content = `${data.title || "Diagrama de Arquitetura"}\n${project.name}\n${"=".repeat(60)}\n\n`;
      const layers = data.layers || [];
      layers.forEach((layer: any) => {
        content += `${layer.name}:\n`;
        data.components
          ?.filter((c: any) => layer.components?.includes(c.id))
          .forEach((comp: any) => {
            content += `  - ${comp.name} [${comp.type}]\n`;
            if (comp.description) content += `    ${comp.description}\n`;
            if (comp.technologies?.length) content += `    Tecnologias: ${comp.technologies.join(", ")}\n`;
          });
        content += "\n";
      });
    }
    
    if (!content) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar o diagrama.",
        variant: "destructive",
      });
      return;
    }
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${diagramNames[type]}-${project.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Diagrama exportado",
      description: "O arquivo de texto foi baixado com sucesso.",
      variant: "success",
    });
  };

  const renderFlowDiagram = (data: any) => {
    if (!data || !data.nodes) return null;
    const nodes = data.nodes || [];
    const connections = data.connections || [];
    
    const nodeLabels: Record<string, string> = {};
    nodes.forEach((node: any) => {
      nodeLabels[node.id] = node.label || node.id;
    });
    
    const getNodeLabel = (nodeId: string) => nodeLabels[nodeId] || nodeId;
    
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm font-medium text-foreground mb-2">{data.title}</div>
        <p className="text-xs text-muted-foreground mb-4">{data.description}</p>
        <div className="space-y-2">
          {nodes.map((node: any, index: number) => (
            <div key={node.id} className="flex items-center gap-2">
              {node.type === 'start' && <Circle className="w-4 h-4 text-green-500" />}
              {node.type === 'end' && <Circle className="w-4 h-4 text-red-500 fill-current" />}
              {node.type === 'process' && <Box className="w-4 h-4 text-blue-500" />}
              {node.type === 'decision' && <Diamond className="w-4 h-4 text-amber-500" />}
              {node.type === 'connector' && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1 p-2 rounded border bg-background">
                <div className="text-sm font-medium">{node.label}</div>
                {node.description && <div className="text-xs text-muted-foreground">{node.description}</div>}
              </div>
              {index < nodes.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
        {connections.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Conexões:</div>
            <div className="flex flex-wrap gap-2">
              {connections.map((conn: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {getNodeLabel(conn.from)} → {getNodeLabel(conn.to)} {conn.label && `(${conn.label})`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArchitectureDiagram = (data: any) => {
    if (!data || !data.components) return null;
    const components = data.components || [];
    const layers = data.layers || [];
    
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm font-medium text-foreground mb-2">{data.title}</div>
        <p className="text-xs text-muted-foreground mb-4">{data.description}</p>
        
        {layers.map((layer: any, layerIndex: number) => (
          <div key={layerIndex} className="border rounded-lg p-3 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {layer.name}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {components.filter((c: any) => layer.components.includes(c.id)).map((comp: any) => (
                <div key={comp.id} className="p-2 rounded border bg-background">
                  <div className="flex items-center gap-2 mb-1">
                    {comp.type === 'frontend' && <Box className="w-3 h-3 text-blue-500" />}
                    {comp.type === 'backend' && <Network className="w-3 h-3 text-green-500" />}
                    {comp.type === 'database' && <Box className="w-3 h-3 text-purple-500" />}
                    {comp.type === 'service' && <Share2 className="w-3 h-3 text-amber-500" />}
                    {comp.type === 'external' && <Network className="w-3 h-3 text-gray-500" />}
                    <span className="text-xs font-medium">{comp.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{comp.description}</p>
                  {comp.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.technologies.slice(0, 3).map((tech: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMindMap = (data: any) => {
    if (!data || !data.rootNode) return null;
    
    const renderNode = (node: any, level: number = 0) => (
      <div key={node.id} className={`${level > 0 ? 'ml-4 border-l-2 border-muted pl-3' : ''}`}>
        <div 
          className="p-2 rounded-lg border bg-background mb-2"
          style={{ borderLeftColor: node.color || undefined, borderLeftWidth: node.color ? 3 : 1 }}
        >
          <div className="text-sm font-medium">{node.label}</div>
          {node.description && <div className="text-xs text-muted-foreground">{node.description}</div>}
        </div>
        {node.children?.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
    
    return (
      <div className="p-4">
        <div className="text-sm font-medium text-foreground mb-2">{data.title}</div>
        <p className="text-xs text-muted-foreground mb-4">{data.description}</p>
        {renderNode(data.rootNode)}
      </div>
    );
  };

  // Editable Mind Map node renderer
  const renderEditableMindMapNode = (node: any, level: number, parentNode: any, siblingIndex: number): JSX.Element => {
    const siblings = parentNode?.children || [];
    const isRoot = level === 0;
    const canMoveUp = siblingIndex > 0;
    const canMoveDown = siblingIndex >= 0 && siblingIndex < siblings.length - 1;

    return (
      <div key={node.id} className={`${level > 0 ? 'ml-4 border-l-2 border-muted pl-3' : ''} mb-2`}>
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                value={node.label || ""}
                onChange={(e) => updateMindMapNode(node.id, "label", e.target.value)}
                placeholder="Nome do nó"
                className="text-sm font-medium"
              />
              <Textarea
                value={node.description || ""}
                onChange={(e) => updateMindMapNode(node.id, "description", e.target.value)}
                placeholder="Descrição do nó"
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              {!isRoot && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveMindMapNode(node.id, "up")}
                    disabled={!canMoveUp}
                    className="h-7 w-7"
                    title="Mover para cima"
                  >
                    <MoveUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveMindMapNode(node.id, "down")}
                    disabled={!canMoveDown}
                    className="h-7 w-7"
                    title="Mover para baixo"
                  >
                    <MoveDown className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMindMapNode(node.id)}
                    className="h-7 w-7 text-destructive"
                    title="Remover nó"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addMindMapChild(node.id)}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar filho
          </Button>
        </div>
        {node.children?.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map((child: any, idx: number) => 
              renderEditableMindMapNode(child, level + 1, node, idx)
            )}
          </div>
        )}
      </div>
    );
  };

  const exportScope = () => {
    if (!scope || !project) return;

    const deliverables = (scope.deliverables as string[]) || [];
    const outOfScope = (scope.outOfScope as string[]) || [];
    const assumptions = (scope.assumptions as string[]) || [];
    const dependencies = (scope.dependencies as string[]) || [];
    const risks = (scope.risks as string[]) || [];

    let content = `
DOCUMENTO DE ESCOPO COMPLETO
============================

Projeto: ${project.name}
Data: ${new Date().toLocaleDateString("pt-BR")}

================================
PARTE 1: ESCOPO DO PROJETO
================================

OBJETIVO
--------
${scope.objective || "Não definido"}

---

ENTREGAS (DELIVERABLES)
-----------------------
${deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n") || "Nenhuma entrega definida"}

---

FORA DO ESCOPO
--------------
${outOfScope.map((d, i) => `${i + 1}. ${d}`).join("\n") || "Nenhuma exclusão definida"}

---

PREMISSAS
---------
${assumptions.map((d, i) => `${i + 1}. ${d}`).join("\n") || "Nenhuma premissa definida"}

---

DEPENDÊNCIAS
------------
${dependencies.map((d, i) => `${i + 1}. ${d}`).join("\n") || "Nenhuma dependência definida"}

---

RISCOS IDENTIFICADOS
--------------------
${risks.map((d, i) => `${i + 1}. ${d}`).join("\n") || "Nenhum risco identificado"}
`;

    // Add Flow Diagram if exists
    const flowDiagram = diagrams.find(d => d.type === "flow");
    if (flowDiagram?.data?.nodes) {
      content += `

================================
PARTE 2: DIAGRAMA DE FLUXO
================================

${flowDiagram.data.title || "Diagrama de Fluxo"}

${flowDiagram.data.description || ""}

`;
      flowDiagram.data.nodes.forEach((node: any, i: number) => {
        content += `${i + 1}. [${node.type.toUpperCase()}] ${node.label}\n`;
        if (node.description) content += `   ${node.description}\n`;
      });
    }

    // Add Architecture Diagram if exists
    const archDiagram = diagrams.find(d => d.type === "architecture");
    if (archDiagram?.data?.components) {
      content += `

================================
PARTE 3: DIAGRAMA DE ARQUITETURA
================================

${archDiagram.data.title || "Diagrama de Arquitetura"}

${archDiagram.data.description || ""}

Componentes por Camada:
`;
      const layers = archDiagram.data.layers || [];
      layers.forEach((layer: any) => {
        content += `\n${layer.name}:\n`;
        archDiagram.data.components
          ?.filter((c: any) => layer.components?.includes(c.id))
          .forEach((comp: any) => {
            content += `  - ${comp.name} [${comp.type}]\n`;
            if (comp.description) content += `    ${comp.description}\n`;
            if (comp.technologies?.length) content += `    Tecnologias: ${comp.technologies.join(", ")}\n`;
          });
      });
    }

    // Add Mind Map if exists
    const mindmapDiagram = diagrams.find(d => d.type === "mindmap");
    if (mindmapDiagram?.data?.rootNode) {
      content += `

================================
PARTE 4: MAPA MENTAL
================================

${mindmapDiagram.data.title || "Mapa Mental"}

${mindmapDiagram.data.description || ""}

Estrutura Hierárquica:

`;
      const renderMindMapText = (node: any, indent: string = ""): string => {
        let text = `${indent}• ${node.label}`;
        if (node.description) text += ` - ${node.description}`;
        text += "\n";
        if (node.children?.length) {
          node.children.forEach((child: any) => {
            text += renderMindMapText(child, indent + "  ");
          });
        }
        return text;
      };
      content += renderMindMapText(mindmapDiagram.data.rootNode);
    }

    content += `

================================
FIM DO DOCUMENTO
================================

Gerado por ForgeAI em ${new Date().toLocaleString("pt-BR")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `documento-escopo-completo-${project.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Documento completo exportado",
      description: "Escopo + Diagramas foram baixados com sucesso.",
      variant: "success",
    });
  };

  const isLoading = projectLoading || scopeLoading;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  const deliverables = (scope?.deliverables as string[]) || [];
  const outOfScope = (scope?.outOfScope as string[]) || [];
  const assumptions = (scope?.assumptions as string[]) || [];
  const dependencies = (scope?.dependencies as string[]) || [];
  const risks = (scope?.risks as string[]) || [];

  const hasScope = scope && scope.objective;
  const briefingComplete = briefing?.status === "complete";

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b border-border bg-background flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/projects/${projectId}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  Documento de Escopo
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasScope && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createVersionMutation.mutate("Versão manual")}
                  disabled={createVersionMutation.isPending}
                  data-testid="button-save-version"
                >
                  {createVersionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Versão
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportScope}
                  data-testid="button-export-scope"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => regenerateScopeMutation.mutate()}
              disabled={regenerateScopeMutation.isPending || !briefingComplete}
              data-testid="button-regenerate-scope"
            >
              {regenerateScopeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {hasScope ? "Regenerar" : "Gerar Escopo"}
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="scope" data-testid="tab-scope">
              <FileText className="w-4 h-4 mr-2" />
              Escopo
            </TabsTrigger>
            <TabsTrigger value="diagrams" data-testid="tab-diagrams">
              <Workflow className="w-4 h-4 mr-2" />
              Diagramas
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid="tab-versions">
              <History className="w-4 h-4 mr-2" />
              Versões ({scopeVersions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scope">
        {!hasScope ? (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-medium text-foreground mb-2">
              Nenhum escopo gerado ainda
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {briefingComplete
                ? "Clique em 'Gerar Escopo' para criar automaticamente o documento de escopo baseado no briefing do projeto."
                : "Complete o briefing do projeto primeiro para poder gerar o escopo automaticamente."}
            </p>
            {!briefingComplete && (
              <Button
                onClick={() => navigate(`/projects/${projectId}/briefing`)}
                data-testid="button-go-to-briefing"
              >
                Ir para Briefing
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <CardTitle>Objetivo</CardTitle>
                    </div>
                    {editingSection === "objective" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          data-testid="button-cancel-objective"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("objective")}
                          disabled={updateScopeMutation.isPending}
                          data-testid="button-save-objective"
                        >
                          {updateScopeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing("objective")}
                        data-testid="button-edit-objective"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    Meta principal do projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editingSection === "objective" ? (
                    <Textarea
                      value={editObjective}
                      onChange={(e) => setEditObjective(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-objective"
                    />
                  ) : (
                    <p className="text-foreground" data-testid="text-scope-objective">
                      {scope.objective}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">Detalhes</CardTitle>
                    {editingDetails ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditingDetails}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveDetails}
                          disabled={updateBriefingMutation.isPending}
                        >
                          {updateBriefingMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={startEditingDetails}
                        data-testid="button-edit-details"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingDetails ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo de Projeto</label>
                        <Input
                          value={editProjectType}
                          onChange={(e) => setEditProjectType(e.target.value)}
                          placeholder="Ex: plataforma web..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Stack</label>
                        <Input
                          value={editStack}
                          onChange={(e) => setEditStack(e.target.value)}
                          placeholder="Ex: React, Node.js..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Prazo</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-1 h-9 !rounded-md"
                              data-testid="button-deadline-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editDeadline ? format(editDeadline, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={editDeadline}
                              onSelect={setEditDeadline}
                              locale={ptBR}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Orçamento</label>
                        <Input
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          placeholder="Ex: R$ 30.000,00"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de Projeto</p>
                        <p className="text-sm font-medium text-foreground">{briefing?.projectType || "Não definido"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stack</p>
                        <p className="text-sm font-medium text-foreground">{briefing?.stack || "Não definida"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="text-sm font-medium text-foreground">
                          {project?.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString("pt-BR") : (briefing?.deadline ? new Date(briefing.deadline).toLocaleDateString("pt-BR") : "Não definido")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Orçamento</p>
                        <p className="text-sm font-medium text-foreground">{briefing?.budget || "Não definido"}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-500" />
                      <CardTitle className="text-base">Entregas</CardTitle>
                    </div>
                    {editingSection === "deliverables" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("deliverables")}
                          disabled={updateScopeMutation.isPending}
                        >
                          {updateScopeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing("deliverables")}
                        data-testid="button-edit-deliverables"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    O que será entregue no projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editingSection === "deliverables" ? (
                    <div className="space-y-2">
                      {editDeliverables.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem(editDeliverables, setEditDeliverables, index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeListItem(editDeliverables, setEditDeliverables, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addListItem(editDeliverables, setEditDeliverables)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar item
                      </Button>
                    </div>
                  ) : deliverables.length > 0 ? (
                    <ul className="space-y-2">
                      {deliverables.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`deliverable-${index}`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma entrega definida</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <CardTitle className="text-base">Fora do Escopo</CardTitle>
                    </div>
                    {editingSection === "outOfScope" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("outOfScope")}
                          disabled={updateScopeMutation.isPending}
                        >
                          {updateScopeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing("outOfScope")}
                        data-testid="button-edit-outofscope"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    O que NÃO está incluído
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editingSection === "outOfScope" ? (
                    <div className="space-y-2">
                      {editOutOfScope.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem(editOutOfScope, setEditOutOfScope, index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeListItem(editOutOfScope, setEditOutOfScope, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addListItem(editOutOfScope, setEditOutOfScope)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar item
                      </Button>
                    </div>
                  ) : outOfScope.length > 0 ? (
                    <ul className="space-y-2">
                      {outOfScope.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`out-of-scope-${index}`}
                        >
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma exclusão definida</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-base">Premissas</CardTitle>
                    </div>
                    {editingSection === "assumptions" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("assumptions")}
                          disabled={updateScopeMutation.isPending}
                        >
                          {updateScopeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing("assumptions")}
                        data-testid="button-edit-assumptions"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    Condições assumidas para o projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editingSection === "assumptions" ? (
                    <div className="space-y-2">
                      {editAssumptions.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem(editAssumptions, setEditAssumptions, index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeListItem(editAssumptions, setEditAssumptions, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addListItem(editAssumptions, setEditAssumptions)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar item
                      </Button>
                    </div>
                  ) : assumptions.length > 0 ? (
                    <ul className="space-y-2">
                      {assumptions.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`assumption-${index}`}
                        >
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma premissa definida</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-purple-500" />
                      <CardTitle className="text-base">Dependências</CardTitle>
                    </div>
                    {editingSection === "dependencies" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveSection("dependencies")}
                          disabled={updateScopeMutation.isPending}
                        >
                          {updateScopeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing("dependencies")}
                        data-testid="button-edit-dependencies"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    Dependências externas do projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editingSection === "dependencies" ? (
                    <div className="space-y-2">
                      {editDependencies.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateListItem(editDependencies, setEditDependencies, index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeListItem(editDependencies, setEditDependencies, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addListItem(editDependencies, setEditDependencies)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar item
                      </Button>
                    </div>
                  ) : dependencies.length > 0 ? (
                    <ul className="space-y-2">
                      {dependencies.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`dependency-${index}`}
                        >
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma dependência definida</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <CardTitle className="text-base">Riscos Identificados</CardTitle>
                  </div>
                  {editingSection === "risks" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEditing}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveSection("risks")}
                        disabled={updateScopeMutation.isPending}
                      >
                        {updateScopeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditing("risks")}
                      data-testid="button-edit-risks"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Potenciais riscos e pontos de atenção
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingSection === "risks" ? (
                  <div className="space-y-2">
                    {editRisks.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateListItem(editRisks, setEditRisks, index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeListItem(editRisks, setEditRisks, index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addListItem(editRisks, setEditRisks)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar item
                    </Button>
                  </div>
                ) : risks.length > 0 ? (
                  <ul className="space-y-3">
                    {risks.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        data-testid={`risk-${index}`}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum risco identificado</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Work Breakdown Structure (WBS)</CardTitle>
                      <CardDescription>
                        Decomposição hierárquica do trabalho
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateWbsMutation.mutate()}
                    disabled={generateWbsMutation.isPending}
                    data-testid="button-generate-wbs"
                  >
                    {generateWbsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {wbs ? "Regenerar WBS" : "Gerar WBS"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wbs && wbs.phases && wbs.phases.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{wbs.totalEstimatedHours || 0}h estimadas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{wbs.phases?.length || 0} fases</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {wbs.phases?.map((phase, phaseIndex) => (
                        <Collapsible
                          key={phase.name}
                          open={expandedPhases.has(phase.name)}
                          onOpenChange={() => togglePhase(phase.name)}
                        >
                          <CollapsibleTrigger asChild>
                            <div
                              className="flex items-center justify-between p-3 rounded-lg bg-card border cursor-pointer hover-elevate"
                              data-testid={`wbs-phase-${phaseIndex}`}
                            >
                              <div className="flex items-center gap-3">
                                {expandedPhases.has(phase.name) ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <div>
                                  <div className="font-medium text-foreground">{phaseIndex + 1}. {phase.name}</div>
                                  <div className="text-xs text-muted-foreground">{phase.description}</div>
                                </div>
                              </div>
                              <Badge variant="secondary">{phase.estimatedHours}h</Badge>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-8 mt-2 space-y-2">
                              {phase.items.map((item, itemIndex) => (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-lg border bg-background ${item.completed ? 'opacity-60' : ''}`}
                                  data-testid={`wbs-item-${phaseIndex}-${itemIndex}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 flex-1">
                                      <Checkbox
                                        checked={item.completed || false}
                                        onCheckedChange={(checked) => {
                                          toggleWbsItemMutation.mutate({ itemId: item.id, completed: !!checked });
                                        }}
                                        className="mt-1"
                                        data-testid={`checkbox-wbs-item-${item.id}`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`font-medium text-sm text-foreground ${item.completed ? 'line-through' : ''}`}>
                                            {item.id}. {item.title}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${getPriorityColor(item.priority)}`}
                                          >
                                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baixa'}
                                          </Badge>
                                          {item.completed && (
                                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                                              Concluído
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                        {item.deliverables.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {item.deliverables.map((d, di) => (
                                              <Badge key={di} variant="secondary" className="text-xs">
                                                {d}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-sm font-medium text-foreground">{item.estimatedHours}h</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>

                    {wbs.criticalPath.length > 0 && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="text-sm font-medium text-foreground mb-1">Caminho Crítico</div>
                        <div className="flex flex-wrap gap-1">
                          {wbs.criticalPath.map((itemId, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {itemId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GitBranch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Gere a WBS para visualizar a decomposição do trabalho
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground pt-4">
              Escopo gerado automaticamente por ForgeAI
              {scope.updatedAt && (
                <span> - Última atualização: {new Date(scope.updatedAt).toLocaleDateString("pt-BR")}</span>
              )}
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="diagrams" className="space-y-6">
            {!hasScope ? (
              <div className="text-center py-16">
                <Workflow className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Gere o escopo primeiro para criar diagramas visuais.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Workflow className="w-5 h-5 text-blue-500" />
                        <CardTitle className="text-base">Diagrama de Fluxo</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDiagramByType("flow") && !editingFlowDiagram && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={startEditingFlowDiagram}
                              data-testid="button-edit-flow"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportDiagramAsText("flow", getDiagramByType("flow")?.data)}
                              data-testid="button-export-flow"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Texto
                            </Button>
                          </>
                        )}
                        {editingFlowDiagram ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={cancelEditingFlowDiagram}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveFlowDiagram}
                              disabled={updateDiagramMutation.isPending}
                            >
                              {updateDiagramMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateDiagramMutation.mutate("flow")}
                            disabled={generatingDiagram === "flow"}
                            data-testid="button-generate-flow"
                          >
                            {generatingDiagram === "flow" ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {getDiagramByType("flow") ? "Regenerar" : "Gerar"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>Fluxo do processo e jornada do usuário - Reorganize a ordem dos passos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingFlowDiagram ? (
                      <div className="p-4 space-y-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Use as setas para reorganizar a ordem dos passos
                        </div>
                        <div className="space-y-2">
                          {editFlowNodes.map((node: any, index: number) => (
                            <div key={node.id} className="flex items-center gap-2 p-2 rounded border bg-background">
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => moveFlowNode(index, "up")}
                                  disabled={index === 0}
                                >
                                  <MoveUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => moveFlowNode(index, "down")}
                                  disabled={index === editFlowNodes.length - 1}
                                >
                                  <MoveDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {node.type === 'start' && <Circle className="w-4 h-4 text-green-500" />}
                                {node.type === 'end' && <Circle className="w-4 h-4 text-red-500 fill-current" />}
                                {node.type === 'process' && <Box className="w-4 h-4 text-blue-500" />}
                                {node.type === 'decision' && <Diamond className="w-4 h-4 text-amber-500" />}
                                {node.type === 'connector' && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 space-y-1">
                                <Input
                                  value={node.label || ""}
                                  onChange={(e) => updateFlowNode(index, "label", e.target.value)}
                                  placeholder="Nome do passo"
                                  className="text-sm"
                                />
                                <Input
                                  value={node.description || ""}
                                  onChange={(e) => updateFlowNode(index, "description", e.target.value)}
                                  placeholder="Descrição (opcional)"
                                  className="text-xs"
                                />
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {index + 1}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : getDiagramByType("flow") ? (
                      renderFlowDiagram(getDiagramByType("flow")?.data)
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Clique em "Gerar" para criar o diagrama de fluxo
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-green-500" />
                        <CardTitle className="text-base">Diagrama de Arquitetura</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDiagramByType("architecture") && !editingArchDiagram && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={startEditingArchDiagram}
                              data-testid="button-edit-architecture"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportDiagramAsText("architecture", getDiagramByType("architecture")?.data)}
                              data-testid="button-export-architecture"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Texto
                            </Button>
                          </>
                        )}
                        {editingArchDiagram ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={cancelEditingArchDiagram}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveArchDiagram}
                              disabled={updateDiagramMutation.isPending}
                            >
                              {updateDiagramMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateDiagramMutation.mutate("architecture")}
                            disabled={generatingDiagram === "architecture"}
                            data-testid="button-generate-architecture"
                          >
                            {generatingDiagram === "architecture" ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {getDiagramByType("architecture") ? "Regenerar" : "Gerar"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>Estrutura do sistema e componentes - Edite ou adicione novos cards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingArchDiagram ? (
                      <div className="p-4 space-y-4">
                        {editArchLayers.map((layer: any, layerIndex: number) => (
                          <div key={layerIndex} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {layer.name}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addArchComponent(layer.name)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {editArchComponents
                                .filter((c: any) => (layer.components || []).includes(c.id))
                                .map((comp: any) => {
                                  const compIndex = editArchComponents.findIndex((c: any) => c.id === comp.id);
                                  return (
                                    <div key={comp.id} className="p-2 rounded border bg-background space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <Input
                                          value={comp.name || ""}
                                          onChange={(e) => updateArchComponent(compIndex, "name", e.target.value)}
                                          placeholder="Nome do componente"
                                          className="text-xs font-medium flex-1"
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => removeArchComponent(comp.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <Input
                                        value={comp.description || ""}
                                        onChange={(e) => updateArchComponent(compIndex, "description", e.target.value)}
                                        placeholder="Descrição"
                                        className="text-xs"
                                      />
                                      <Input
                                        value={comp.technologiesString ?? (comp.technologies || []).join(", ")}
                                        onChange={(e) => updateArchComponent(compIndex, "technologiesString", e.target.value)}
                                        placeholder="Tecnologias (separadas por vírgula)"
                                        className="text-xs"
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : getDiagramByType("architecture") ? (
                      renderArchitectureDiagram(getDiagramByType("architecture")?.data)
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Clique em "Gerar" para criar o diagrama de arquitetura
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-purple-500" />
                        <CardTitle className="text-base">Mapa Mental</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Hidden file input for mind map import */}
                        <input
                          type="file"
                          id="mindmap-import"
                          accept=".mind,.json,.xmind.json,.mm"
                          onChange={importMindMap}
                          className="hidden"
                        />
                        {!editingMindMap && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => document.getElementById("mindmap-import")?.click()}
                            data-testid="button-import-mindmap"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                          </Button>
                        )}
                        {getDiagramByType("mindmap") && !editingMindMap && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={startEditingMindMap}
                              data-testid="button-edit-mindmap"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" data-testid="button-export-mindmap">
                                  <Download className="w-4 h-4 mr-2" />
                                  Exportar
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => exportDiagramAsText("mindmap", getDiagramByType("mindmap")?.data)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Resumo (Texto)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportMindMapAsText(getDiagramByType("mindmap")?.data)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Texto Simples (.txt)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportMindMapAsMind(getDiagramByType("mindmap")?.data)}>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  MindMeister (.mind)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportMindMapAsXMind(getDiagramByType("mindmap")?.data)}>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  XMind (.xmind.json)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportMindMapAsFreemind(getDiagramByType("mindmap")?.data)}>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Freemind (.mm)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                        {editingMindMap && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditingMindMap}
                              data-testid="button-cancel-mindmap"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={saveMindMap}
                              disabled={updateDiagramMutation.isPending}
                              data-testid="button-save-mindmap"
                            >
                              {updateDiagramMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Salvar
                            </Button>
                          </>
                        )}
                        {!editingMindMap && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateDiagramMutation.mutate("mindmap")}
                            disabled={generatingDiagram === "mindmap"}
                            data-testid="button-generate-mindmap"
                          >
                            {generatingDiagram === "mindmap" ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {getDiagramByType("mindmap") ? "Regenerar" : "Gerar"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>Hierarquia de features e módulos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingMindMap && editMindMapData ? (
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Título do Mapa</label>
                          <Input
                            value={editMindMapData.title || ""}
                            onChange={(e) => setEditMindMapData({ ...editMindMapData, title: e.target.value })}
                            placeholder="Título do mapa mental"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Descrição</label>
                          <Textarea
                            value={editMindMapData.description || ""}
                            onChange={(e) => setEditMindMapData({ ...editMindMapData, description: e.target.value })}
                            placeholder="Descrição do mapa mental"
                            rows={2}
                          />
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-xs font-medium mb-3 text-muted-foreground">Estrutura do Mapa</p>
                          {editMindMapData.rootNode && renderEditableMindMapNode(editMindMapData.rootNode, 0, null, -1)}
                        </div>
                      </div>
                    ) : getDiagramByType("mindmap") ? (
                      renderMindMap(getDiagramByType("mindmap")?.data)
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Clique em "Gerar" para criar o mapa mental
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            {scopeVersions.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhuma versão salva ainda
                </p>
                <p className="text-xs text-muted-foreground">
                  Versões são criadas automaticamente quando o escopo é modificado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scopeVersions.slice().reverse().map((version) => (
                  <Card key={version.id} className="hover-elevate">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">v{version.version}</span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {version.changeNotes || `Versão ${version.version}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(version.createdAt!).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreVersionMutation.mutate(version.id)}
                          disabled={restoreVersionMutation.isPending}
                          data-testid={`button-restore-version-${version.id}`}
                        >
                          {restoreVersionMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          Restaurar
                        </Button>
                      </div>
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                        <p className="line-clamp-2">{version.objective}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
