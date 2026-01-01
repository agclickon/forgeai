import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";

import {
  ArrowLeft,
  Send,
  Loader2,
  Brain,
  CheckCircle2,
  MessageSquare,
  User,
  Sparkles,
  Paperclip,
  FileText,
  X,
  Mic,
  Square,
  Palette,
  Check,
  ImagePlus,
  Trash2,
  Download,
  Globe,
  ShoppingCart,
  Smartphone,
  Layout,
  Megaphone,
  Lightbulb,
  Puzzle,
  Figma,
  Play,
  Pause,
  ListMusic,
  Calendar,
} from "lucide-react";
import type { Project, Briefing } from "@shared/schema";
import { projectTemplates, type ProjectTemplate } from "@shared/briefingTemplates";

function AudioWaveform({ isActive }: { isActive: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frequencyHistoryRef = useRef<number[]>([]);
  const analysisPeriodRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      frequencyHistoryRef.current = [];
      return;
    }

    const startVisualization = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const svg = svgRef.current;
        if (!svg) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const history = frequencyHistoryRef.current;
        
        const draw = () => {
          if (!isActive) return;
          
          animationRef.current = requestAnimationFrame(draw);
          
          const barWidth = 2;
          const fixedSpacing = 1;
          const maxHeight = svg.clientHeight;
          const containerWidth = svg.clientWidth;
          
          // Calcular quantas barras cabem na largura total
          const maxBars = Math.floor((containerWidth + fixedSpacing) / (barWidth + fixedSpacing));
          
          analysisPeriodRef.current++;
          
          // Analisar frequência a cada 2 frames para preencher mais rápido
          if (analysisPeriodRef.current >= 2) {
            analysisPeriodRef.current = 0;
            analyser.getByteFrequencyData(dataArray);
            
            // Calcular média de frequências para representar amplitude geral
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength / 255;
            
            // Adicionar à história
            history.push(average);
            
            // Manter histórico igual ao número de barras que cabem no container
            while (history.length > maxBars) {
              history.shift();
            }
          }
          
          // Limpar SVG
          while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
          }
          
          // Sempre desenhar maxBars barras para preencher todo o card
          for (let i = 0; i < maxBars; i++) {
            // Calcular índice no histórico (barras mais à direita são mais recentes)
            const historyIndex = i - (maxBars - history.length);
            const value = historyIndex >= 0 && historyIndex < history.length ? history[historyIndex] : 0;
            
            // Multiplicador 3x para barras maiores no SVG mais compacto
            const height = Math.max(2, Math.min(value * maxHeight * 3, maxHeight));
            const x = i * (barWidth + fixedSpacing);
            const y = maxHeight - height;
            
            // Aplicar gradiente: barras antigas mais transparentes, novas mais opacas
            const opacity = 0.3 + (i / maxBars) * 0.7;
            
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x.toString());
            rect.setAttribute("y", y.toString());
            rect.setAttribute("width", barWidth.toString());
            rect.setAttribute("height", height.toString());
            rect.setAttribute("fill", `rgba(255, 255, 255, ${opacity})`);
            rect.setAttribute("rx", "1");
            
            svg.appendChild(rect);
          }
        };
        
        draw();
      } catch (error) {
        console.error("Error accessing microphone for visualization:", error);
      }
    };

    startVisualization();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-0.5 p-1 rounded-xl bg-primary/10 border border-primary/20">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-medium text-primary">Gravando...</span>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height="48"
        className="w-full"
      />
    </div>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isReadyToFinalize?: boolean;
}

interface ExtractedStyles {
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    serifFont: string;
    monospaceFont: string;
    baseFontSize: number;
    headingScale: number;
  };
  spacing: {
    borderRadius: number;
    cardPadding: number;
    buttonPadding: number;
  };
  styleDescription: string;
}

interface VisualReference {
  id: string;
  filename: string;
  objectPath: string;
  mimeType: string;
  uploadedAt: string;
  extractedStyles?: ExtractedStyles;
  styleDescription?: string;
}

interface AudioRecording {
  id: string;
  filename: string;
  objectPath: string;
  uploadedAt: string;
  audioUrl: string;
  title?: string;
  transcription?: string;
  transcriptionPreview?: string;
}

interface AudioRecordingsModalProps {
  recordings: AudioRecording[];
  onDownload: (audioUrl: string, filename: string) => void;
  onDownloadTranscription: (audioId: string, title: string) => void;
  onDelete: (audioId: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

function AudioRecordingsModal({ recordings, onDownload, onDownloadTranscription, onDelete, isOpen, onOpenChange, projectId }: AudioRecordingsModalProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const togglePlay = (recordingId: string, audioUrl: string) => {
    const currentAudio = audioRefs.current.get(recordingId);
    
    if (playingId === recordingId && currentAudio) {
      currentAudio.pause();
      setPlayingId(null);
    } else {
      // Pause any currently playing audio
      if (playingId) {
        const prevAudio = audioRefs.current.get(playingId);
        if (prevAudio) prevAudio.pause();
      }
      
      if (!currentAudio) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingId(null);
        audioRefs.current.set(recordingId, audio);
        audio.play();
      } else {
        currentAudio.play();
      }
      setPlayingId(recordingId);
    }
  };

  // Cleanup audio elements when modal closes
  useEffect(() => {
    if (!isOpen) {
      audioRefs.current.forEach((audio) => audio.pause());
      setPlayingId(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="w-5 h-5" />
            Áudios das Transcrições
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum áudio gravado ainda.</p>
              <p className="text-sm">Use o microfone para gravar transcrições.</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {recordings.map((recording, index) => (
                <div
                  key={recording.id}
                  className="p-3 rounded-lg bg-muted"
                  data-testid={`audio-recording-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => togglePlay(recording.id, recording.audioUrl)}
                      data-testid={`button-play-audio-${index}`}
                    >
                      {playingId === recording.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {recording.title || `Áudio ${recordings.length - index}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(recording.uploadedAt)}
                      </p>
                      {recording.transcriptionPreview && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {recording.transcriptionPreview}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1 shrink-0">
                      {recording.transcription && recording.transcription.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownloadTranscription(recording.id, recording.title || 'transcricao')}
                          title="Baixar transcrição"
                          data-testid={`button-download-transcription-${index}`}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(recording.audioUrl, recording.filename)}
                        title="Baixar áudio"
                        data-testid={`button-download-audio-${index}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(recording.id)}
                        className="text-destructive"
                        title="Excluir áudio"
                        data-testid={`button-delete-audio-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const templateIcons: Record<string, any> = {
  Globe,
  ShoppingCart,
  Smartphone,
  Layout,
  Megaphone,
  Palette,
  Lightbulb,
  Puzzle,
  Figma,
};

function getTemplateIcon(iconName: string) {
  return templateIcons[iconName] || Puzzle;
}

const requiredFields = [
  { key: "projectType", label: "Tipo de Projeto" },
  { key: "businessObjective", label: "Objetivo de Negócio" },
  { key: "targetAudience", label: "Público-Alvo" },
  { key: "marketNiche", label: "Nicho de Mercado" },
  { key: "desiredScope", label: "Escopo Desejado" },
  { key: "successCriteria", label: "Critérios de Sucesso" },
  { key: "stack", label: "Stack Tecnológica" },
  { key: "visualIdentity", label: "Identidade Visual" },
  { key: "deadlineText", label: "Prazo" },
  { key: "budget", label: "Orçamento" },
];

const visualStyles = [
  {
    id: "modern-minimal",
    name: "Moderno Minimalista",
    description: "Clean, espaçoso, tons neutros",
    colors: ["#FFFFFF", "#F8FAFC", "#3B82F6", "#1E293B"],
    preview: "bg-gradient-to-br from-slate-50 to-blue-50",
  },
  {
    id: "dark-elegant",
    name: "Dark Elegante",
    description: "Sofisticado, fundo escuro, detalhes dourados",
    colors: ["#0F172A", "#1E293B", "#F59E0B", "#FBBF24"],
    preview: "bg-gradient-to-br from-slate-900 to-slate-800",
  },
  {
    id: "vibrant-creative",
    name: "Vibrante Criativo",
    description: "Cores vivas, gradientes, energético",
    colors: ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981"],
    preview: "bg-gradient-to-br from-purple-500 to-pink-500",
  },
  {
    id: "corporate-professional",
    name: "Corporativo Profissional",
    description: "Formal, azul corporativo, confiável",
    colors: ["#1E40AF", "#3B82F6", "#F1F5F9", "#0F172A"],
    preview: "bg-gradient-to-br from-blue-700 to-blue-900",
  },
  {
    id: "nature-organic",
    name: "Natural Orgânico",
    description: "Tons terrosos, verde, sustentável",
    colors: ["#166534", "#22C55E", "#FEF3C7", "#78350F"],
    preview: "bg-gradient-to-br from-green-600 to-emerald-700",
  },
  {
    id: "tech-futuristic",
    name: "Tech Futurista",
    description: "Neon, cyber, alta tecnologia",
    colors: ["#0F0F23", "#00D9FF", "#BD00FF", "#39FF14"],
    preview: "bg-gradient-to-br from-indigo-950 to-purple-950",
  },
];

// Helper to get proper image URL from object storage path
const getImageUrl = (path: string | null | undefined) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `/api/files/${path}`;
};

export default function BriefingPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/briefing");
  const projectId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recordedText, setRecordedText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [audioRecordingsList, setAudioRecordingsList] = useState<AudioRecording[]>([]);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isPlayingLatest, setIsPlayingLatest] = useState(false);
  const latestAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setRecordedText(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast({
            title: "Microfone bloqueado",
            description: "Por favor, permita o acesso ao microfone nas configurações do navegador.",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startRecording = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    setRecordedText("");
    audioChunksRef.current = [];
    
    try {
      // Start speech recognition
      recognitionRef.current.start();
      setIsListening(true);
      
      // Start audio recording with MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      
      toast({
        title: "Gravação iniciada",
        description: "Fale agora. O texto será transcrito e o áudio será salvo automaticamente.",
      });
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  }, [toast]);

  const saveAudioToServer = useCallback(async (audioBlob: Blob) => {
    if (!projectId) return;
    
    setIsSavingAudio(true);
    try {
      // Convert blob to base64 for reliable transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `briefing-audio-${timestamp}.webm`;
      
      const response = await fetch(`/api/projects/${projectId}/briefing/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data: base64Data,
          contentType: 'audio/webm',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedAudioUrl(data.audioUrl);
        // Invalidate cache to refresh audio recordings list
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
        toast({
          title: "Áudio salvo e transcrito",
          description: data.title ? `"${data.title}"` : "A gravação foi salva automaticamente.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error saving audio:", error);
      toast({
        title: "Erro ao salvar áudio",
        description: "Não foi possível salvar a gravação.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAudio(false);
    }
  }, [projectId, toast]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsListening(false);
    
    // Stop MediaRecorder and save audio using onstop event for proper chunk collection
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const mediaRecorder = mediaRecorderRef.current;
      
      // Use onstop to ensure all data is collected before saving
      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          saveAudioToServer(audioBlob);
        }
      };
      
      mediaRecorder.stop();
    }
    
    if (recordedText.trim()) {
      setInput((prev) => prev + (prev ? " " : "") + recordedText.trim());
      setRecordedText("");
      toast({
        title: "Gravação finalizada",
        description: "Texto transcrito com sucesso!",
        variant: "success",
      });
    }
  }, [recordedText, toast, saveAudioToServer]);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: briefing, isLoading: briefingLoading } = useQuery<Briefing>({
    queryKey: ["/api/projects", projectId, "briefing"],
    enabled: !!projectId,
  });

  // Load saved audio recordings from briefing when it's fetched
  useEffect(() => {
    if (briefing) {
      const recordings = ((briefing as any).audioRecordings as AudioRecording[]) || [];
      setAudioRecordingsList(recordings);
      if (recordings.length > 0) {
        const latestAudio = recordings[recordings.length - 1];
        setSavedAudioUrl(latestAudio.audioUrl);
      } else {
        setSavedAudioUrl(null);
      }
      // Reset playback state when recordings change
      if (latestAudioRef.current) {
        latestAudioRef.current.pause();
        latestAudioRef.current = null;
      }
      setIsPlayingLatest(false);
    }
  }, [briefing]);

  const togglePlayLatestAudio = useCallback(() => {
    if (!savedAudioUrl) return;
    
    if (isPlayingLatest && latestAudioRef.current) {
      latestAudioRef.current.pause();
      setIsPlayingLatest(false);
    } else {
      if (!latestAudioRef.current) {
        latestAudioRef.current = new Audio(savedAudioUrl);
        latestAudioRef.current.onended = () => setIsPlayingLatest(false);
      }
      latestAudioRef.current.play();
      setIsPlayingLatest(true);
    }
  }, [savedAudioUrl, isPlayingLatest]);

  const handleAudioDownload = useCallback((audioUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Download iniciado",
      description: "O áudio está sendo baixado.",
      variant: "success",
    });
  }, [toast]);

  const handleAudioDelete = useCallback(async (audioId: string) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/briefing/audio?audioId=${audioId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
        toast({
          title: "Áudio deletado",
          description: "A gravação foi removida com sucesso.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting audio:", error);
      toast({
        title: "Erro ao deletar áudio",
        description: "Não foi possível remover a gravação.",
        variant: "destructive",
      });
    }
  }, [projectId, toast]);

  const handleTranscriptionDownload = useCallback(async (audioId: string, title: string) => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/briefing/audio/${audioId}/transcription`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({
          title: "Download iniciado",
          description: "A transcrição está sendo baixada.",
          variant: "success",
        });
      } else {
        toast({
          title: "Transcrição não disponível",
          description: "Este áudio não possui transcrição.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error downloading transcription:", error);
      toast({
        title: "Erro ao baixar transcrição",
        description: "Não foi possível baixar a transcrição.",
        variant: "destructive",
      });
    }
  }, [projectId, toast]);

  const exportToPDF = useCallback(() => {
    if (!briefing || !project) return;
    
    const content = `
BRIEFING DO PROJETO
==================

Projeto: ${project.name}
Data: ${new Date().toLocaleDateString("pt-BR")}

---

INFORMAÇÕES DO PROJETO
----------------------

Tipo de Projeto: ${briefing.projectType || "Não definido"}

Objetivo de Negócio:
${briefing.businessObjective || "Não definido"}

Público-Alvo:
${briefing.targetAudience || "Não definido"}

Nicho de Mercado:
${briefing.marketNiche || "Não definido"}

Escopo Desejado:
${briefing.desiredScope || "Não definido"}

Critérios de Sucesso:
${briefing.successCriteria || "Não definido"}

Stack Tecnológica:
${briefing.stack || "Não definido"}

Restrições Técnicas:
${briefing.technicalRestrictions || "Não definido"}

Compliance:
${briefing.compliance || "Não definido"}

---

PRAZOS E ORÇAMENTO
------------------

Prazo: ${briefing.deadlineText || "Não definido"}
Orçamento: ${briefing.budget || "Não definido"}

---

HISTÓRICO DA CONVERSA
---------------------

${(briefing.conversation as Message[] || []).map((m) => 
  `[${m.role === "user" ? "Usuário" : "IA"}]: ${m.content}`
).join("\n\n")}

---

Gerado por ForgeAI em ${new Date().toLocaleString("pt-BR")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `briefing-${project.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Briefing exportado",
      description: "O arquivo foi baixado com sucesso.",
      variant: "success",
    });
  }, [briefing, project, toast]);

  const selectTemplateMutation = useMutation({
    mutationFn: async (template: ProjectTemplate) => {
      const introMessage = `Olá! Vou iniciar o briefing usando o template "${template.name}". Vou fazer algumas perguntas para entender melhor o seu projeto.`;
      
      await apiRequest("PATCH", `/api/projects/${projectId}/briefing`, {
        projectType: template.name,
      });
      
      return await apiRequest("POST", `/api/projects/${projectId}/briefing/chat`, {
        message: `Estou iniciando um projeto do tipo: ${template.name}. ${template.description}.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      setShowTemplateSelector(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o briefing com o template.",
        variant: "destructive",
      });
    },
  });

  const messages: Message[] = (briefing?.conversation as Message[]) || [];

  const completedFields = requiredFields.filter((f) => {
    const value = briefing?.[f.key as keyof Briefing];
    return value && value !== "";
  }).length;
  const progressPercent = Math.round((completedFields / requiredFields.length) * 100);
  const allFieldsCompleted = completedFields === requiredFields.length;

  const { uploadFile, isUploading } = useUpload({
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/briefing/chat`, {
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      setInput("");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const sendDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      // Max file size 500KB for text files
      const maxSize = 500 * 1024;
      if (file.size > maxSize) {
        throw new Error("Arquivo muito grande. Máximo 500KB.");
      }
      
      // Step 1: Upload to object storage
      const objectPath = await uploadFile(file);
      if (!objectPath) {
        throw new Error("Falha no upload do arquivo.");
      }
      
      // Step 2: Notify backend to process the uploaded document
      return await apiRequest("POST", `/api/projects/${projectId}/briefing/document`, {
        filename: file.name,
        objectPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      setSelectedFile(null);
      toast({
        title: "Documento processado",
        description: "As informações do documento foram extraídas.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível processar o documento.",
        variant: "destructive",
      });
    },
  });

  const completeBriefingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/briefing/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Briefing Concluído",
        description: "O escopo e roadmap foram gerados automaticamente.",
        variant: "success",
      });
      navigate(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível concluir o briefing.",
        variant: "destructive",
      });
    },
  });

  const saveVisualIdentityMutation = useMutation({
    mutationFn: async (styleId: string) => {
      const selectedStyle = visualStyles.find((s) => s.id === styleId);
      return await apiRequest("PATCH", `/api/projects/${projectId}/briefing`, {
        visualIdentity: selectedStyle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      toast({
        title: "Estilo salvo",
        description: "A identidade visual foi definida para o projeto.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o estilo.",
        variant: "destructive",
      });
    },
  });

  const uploadImageReferenceMutation = useMutation({
    mutationFn: async (file: File) => {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("Imagem muito grande. Máximo 5MB.");
      }
      
      const objectPath = await uploadFile(file);
      if (!objectPath) {
        throw new Error("Falha no upload da imagem.");
      }
      
      const response = await apiRequest("POST", `/api/projects/${projectId}/briefing/image-reference`, {
        filename: file.name,
        objectPath,
        mimeType: file.type,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      toast({
        title: data.extractedStyles 
          ? "Estilos Extraídos" 
          : "Imagem Adicionada",
        description: data.message || "Referência visual adicionada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    },
  });

  const deleteImageReferenceMutation = useMutation({
    mutationFn: async (refId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/briefing/image-reference/${refId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      toast({
        title: "Imagem removida",
        description: "Referência visual removida do projeto.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a imagem.",
        variant: "destructive",
      });
    },
  });

  const currentVisualIdentity = (briefing?.visualIdentity as any)?.id;
  const visualReferences = (briefing?.visualReferences as VisualReference[]) || [];
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageReferenceMutation.mutate(file);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        "text/plain",
        "text/markdown",
        "application/json",
        "text/csv",
        "text/html",
      ];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Por favor, envie arquivos de texto (.txt, .md, .json, .csv).",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSendDocument = () => {
    if (!selectedFile || sendDocumentMutation.isPending) return;
    sendDocumentMutation.mutate(selectedFile);
  };

  const isLoading = projectLoading || briefingLoading;
  const isSending = sendMessageMutation.isPending || sendDocumentMutation.isPending;

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-6 border-b border-border bg-background">
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
                <Brain className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  Briefing Inteligente
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Progresso:</span>
              <Progress value={progressPercent} className="w-24 h-2" />
              <span className="font-medium text-foreground">{progressPercent}%</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={!briefing}
              data-testid="button-export-briefing"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            {progressPercent === 100 && (
              <Button
                onClick={() => completeBriefingMutation.mutate()}
                disabled={completeBriefingMutation.isPending}
                data-testid="button-complete-briefing"
              >
                {completeBriefingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Concluir Briefing
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !showTemplateSelector && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">
                    Vamos comecar o briefing!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Escolha um template para comecar ou descreva seu projeto livremente.
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Button
                      variant="default"
                      onClick={() => setShowTemplateSelector(true)}
                      data-testid="button-select-template"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Usar Template
                    </Button>
                    <span className="text-muted-foreground">ou</span>
                    <span className="text-sm text-muted-foreground">digite abaixo</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3" />
                    <span>Tambem aceita: .txt, .md, .json, .csv</span>
                  </div>
                </div>
              )}

              {messages.length === 0 && showTemplateSelector && (
                <div className="py-6">
                  <div className="text-center mb-6">
                    <h3 className="font-medium text-foreground mb-2">
                      Escolha um tipo de projeto
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      O template vai guiar as perguntas do briefing
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectTemplates.map((template) => {
                      const Icon = getTemplateIcon(template.icon);
                      return (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedTemplate(template);
                            selectTemplateMutation.mutate(template);
                          }}
                          data-testid={`template-card-${template.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground text-sm">
                                  {template.name}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <div className="text-center mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowTemplateSelector(false)}
                      data-testid="button-cancel-template"
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-3 max-w-[80%]">
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-[#222530] text-white"
                          : "bg-muted text-foreground"
                      }`}
                      data-testid={`message-${message.role}-${index}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {message.role === "assistant" && message.isReadyToFinalize && index === messages.length - 1 && (
                      <div className="flex flex-col gap-2">
                        {!allFieldsCompleted && (
                          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                            <p className="font-medium mb-1">Campos pendentes:</p>
                            <ul className="list-disc list-inside text-xs">
                              {requiredFields.filter((f) => {
                                const value = briefing?.[f.key as keyof Briefing];
                                return !value || value === "";
                              }).map((f) => (
                                <li key={f.key}>{f.label}</li>
                              ))}
                            </ul>
                            <p className="text-xs mt-2">Preencha os campos pendentes na aba lateral ou continue a conversa.</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => completeBriefingMutation.mutate()}
                            disabled={completeBriefingMutation.isPending || !allFieldsCompleted}
                            className="flex-1"
                            data-testid="button-finalize-yes"
                          >
                            {completeBriefingMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Pode finalizar o projeto
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setInput("Gostaria de adicionar mais informações: ");
                            }}
                            disabled={completeBriefingMutation.isPending}
                            data-testid="button-add-more-info"
                          >
                            Adicionar mais detalhes
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="flex-shrink-0 w-8 h-8">
                      <AvatarImage src={getImageUrl(user?.profileImageUrl)} className="object-cover" />
                      <AvatarFallback className="bg-muted">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Analisando...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 md:p-6 border-t border-border bg-background">
            <div className="max-w-3xl mx-auto">
              {selectedFile && (
                <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => setSelectedFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendDocument}
                    disabled={sendDocumentMutation.isPending}
                    data-testid="button-send-document"
                  >
                    {sendDocumentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Enviar"
                    )}
                  </Button>
                </div>
              )}

              {isListening && (
                <div className="mb-3">
                  <AudioWaveform isActive={isListening} />
                </div>
              )}

              {(savedAudioUrl || isSavingAudio || audioRecordingsList.length > 0) && !isListening && (
                <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-muted">
                  {isSavingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm flex-1">Salvando áudio...</span>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={togglePlayLatestAudio}
                        data-testid="button-play-latest-audio"
                      >
                        {isPlayingLatest ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Último áudio gravado</p>
                        {audioRecordingsList.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(audioRecordingsList[audioRecordingsList.length - 1].uploadedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAudioModalOpen(true)}
                        data-testid="button-all-audios"
                      >
                        <ListMusic className="w-4 h-4 mr-1" />
                        Todos os Áudios ({audioRecordingsList.length})
                      </Button>
                    </>
                  )}
                </div>
              )}

              <AudioRecordingsModal
                recordings={[...audioRecordingsList].reverse()}
                onDownload={handleAudioDownload}
                onDownloadTranscription={handleTranscriptionDownload}
                onDelete={handleAudioDelete}
                isOpen={isAudioModalOpen}
                onOpenChange={setIsAudioModalOpen}
                projectId={projectId || ''}
              />

              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".txt,.md,.json,.csv,.html"
                  className="hidden"
                  data-testid="input-file"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    data-testid="button-attach-file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  
                  {speechSupported && (
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      className="h-12 w-12 rounded-xl shrink-0"
                      onClick={isListening ? stopRecording : startRecording}
                      disabled={isSending}
                      data-testid="button-microphone"
                    >
                      {isListening ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </div>

                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Fale agora... clique no quadrado para parar e transcrever" : "Descreva seu projeto ou responda as perguntas da IA..."}
                  className="min-h-[100px] max-h-[300px] resize-none flex-1 rounded-xl text-base"
                  disabled={isSending || isListening}
                  data-testid="input-briefing-message"
                />
                
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending || isListening}
                  size="icon"
                  className="h-12 w-12 rounded-xl shrink-0"
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-80 border-l border-border p-4 bg-muted/30 overflow-y-auto">
          <h3 className="font-medium text-foreground mb-4">Campos do Briefing</h3>
          <div className="space-y-3 mb-6">
            {requiredFields.map((field) => {
              const value = briefing?.[field.key as keyof Briefing];
              const isComplete = value && value !== "" && (typeof value !== "object" || Object.keys(value as object).length > 0);
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-2"
                  data-testid={`field-status-${field.key}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span
                    className={`text-sm ${
                      isComplete ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {field.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Referências Visuais</h3>
              </div>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
                data-testid="input-image"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadImageReferenceMutation.isPending}
                data-testid="button-add-image"
              >
                {uploadImageReferenceMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Envie imagens como referência de estilo
            </p>
            {visualReferences.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {visualReferences.map((ref) => (
                  <div
                    key={ref.id}
                    className="relative group rounded-lg overflow-hidden border border-border"
                    data-testid={`image-ref-${ref.id}`}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <img
                        src={`/api/files/${ref.objectPath}`}
                        alt={ref.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-6 h-6 text-muted-foreground flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                        }}
                      />
                    </div>
                    {ref.extractedStyles && (
                      <div className="absolute top-1 left-1 flex gap-0.5">
                        {Object.values(ref.extractedStyles.colors).slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-full border border-white/50"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                    {ref.extractedStyles && (
                      <div className="absolute top-1 right-1">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          <Sparkles className="w-2 h-2 mr-0.5" />
                          IA
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteImageReferenceMutation.mutate(ref.id)}
                        disabled={deleteImageReferenceMutation.isPending}
                        data-testid={`button-delete-ref-${ref.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {ref.filename}
                      </p>
                      {ref.styleDescription && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          {ref.styleDescription}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Nenhuma referência adicionada
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Estilos Pré-definidos</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Ou selecione um estilo visual
            </p>
            <div className="space-y-2">
              {visualStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => saveVisualIdentityMutation.mutate(style.id)}
                  disabled={saveVisualIdentityMutation.isPending}
                  className={`w-full p-3 border text-left transition-all !rounded-[10px] ${
                    currentVisualIdentity === style.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`style-${style.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${style.preview} flex-shrink-0 !rounded-[10px]`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {style.name}
                        </span>
                        {currentVisualIdentity === style.id && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {style.description}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {style.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
