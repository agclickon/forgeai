import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Palette,
  Type,
  Square,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  Eye,
  Loader2,
} from "lucide-react";
import type { Project, Briefing } from "@shared/schema";

interface StyleSettings {
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
}

const defaultStyles: StyleSettings = {
  colors: {
    background: "#0a0a0f",
    foreground: "#fafafa",
    primary: "#de3403",
    secondary: "#fbbd23",
    accent: "#1a1a2e",
    muted: "#27272a",
    mutedForeground: "#a1a1aa",
    card: "#0f0f14",
    cardForeground: "#fafafa",
    border: "#27272a",
  },
  typography: {
    fontFamily: "Inter",
    serifFont: "Georgia",
    monospaceFont: "JetBrains Mono",
    baseFontSize: 16,
    headingScale: 1.25,
  },
  spacing: {
    borderRadius: 8,
    cardPadding: 16,
    buttonPadding: 12,
  },
};

const predefinedStylesMap: Record<string, StyleSettings> = {
  "modern-minimal": {
    colors: {
      background: "#FFFFFF",
      foreground: "#1E293B",
      primary: "#3B82F6",
      secondary: "#64748B",
      accent: "#F1F5F9",
      muted: "#F8FAFC",
      mutedForeground: "#64748B",
      card: "#FFFFFF",
      cardForeground: "#1E293B",
      border: "#E2E8F0",
    },
    typography: {
      fontFamily: "Inter",
      serifFont: "Georgia",
      monospaceFont: "JetBrains Mono",
      baseFontSize: 16,
      headingScale: 1.25,
    },
    spacing: {
      borderRadius: 8,
      cardPadding: 20,
      buttonPadding: 12,
    },
  },
  "dark-elegant": {
    colors: {
      background: "#0F172A",
      foreground: "#F8FAFC",
      primary: "#F59E0B",
      secondary: "#FBBF24",
      accent: "#1E293B",
      muted: "#1E293B",
      mutedForeground: "#94A3B8",
      card: "#1E293B",
      cardForeground: "#F8FAFC",
      border: "#334155",
    },
    typography: {
      fontFamily: "Inter",
      serifFont: "Playfair Display",
      monospaceFont: "JetBrains Mono",
      baseFontSize: 16,
      headingScale: 1.3,
    },
    spacing: {
      borderRadius: 6,
      cardPadding: 20,
      buttonPadding: 12,
    },
  },
  "vibrant-creative": {
    colors: {
      background: "#FAFAFA",
      foreground: "#1E1E2E",
      primary: "#8B5CF6",
      secondary: "#EC4899",
      accent: "#F3E8FF",
      muted: "#F5F3FF",
      mutedForeground: "#6B7280",
      card: "#FFFFFF",
      cardForeground: "#1E1E2E",
      border: "#E9D5FF",
    },
    typography: {
      fontFamily: "Poppins",
      serifFont: "Georgia",
      monospaceFont: "Fira Code",
      baseFontSize: 16,
      headingScale: 1.35,
    },
    spacing: {
      borderRadius: 12,
      cardPadding: 18,
      buttonPadding: 14,
    },
  },
  "corporate-professional": {
    colors: {
      background: "#F1F5F9",
      foreground: "#0F172A",
      primary: "#1E40AF",
      secondary: "#3B82F6",
      accent: "#DBEAFE",
      muted: "#E2E8F0",
      mutedForeground: "#475569",
      card: "#FFFFFF",
      cardForeground: "#0F172A",
      border: "#CBD5E1",
    },
    typography: {
      fontFamily: "Open Sans",
      serifFont: "Georgia",
      monospaceFont: "Source Code Pro",
      baseFontSize: 15,
      headingScale: 1.2,
    },
    spacing: {
      borderRadius: 4,
      cardPadding: 16,
      buttonPadding: 10,
    },
  },
  "nature-organic": {
    colors: {
      background: "#FEF3C7",
      foreground: "#78350F",
      primary: "#166534",
      secondary: "#22C55E",
      accent: "#DCFCE7",
      muted: "#FEF9C3",
      mutedForeground: "#92400E",
      card: "#FFFBEB",
      cardForeground: "#78350F",
      border: "#D9F99D",
    },
    typography: {
      fontFamily: "Nunito",
      serifFont: "Merriweather",
      monospaceFont: "JetBrains Mono",
      baseFontSize: 16,
      headingScale: 1.25,
    },
    spacing: {
      borderRadius: 10,
      cardPadding: 18,
      buttonPadding: 12,
    },
  },
  "tech-futuristic": {
    colors: {
      background: "#0F0F23",
      foreground: "#E0E0FF",
      primary: "#00D9FF",
      secondary: "#BD00FF",
      accent: "#1A1A3E",
      muted: "#151530",
      mutedForeground: "#8888AA",
      card: "#1A1A3E",
      cardForeground: "#E0E0FF",
      border: "#2D2D5A",
    },
    typography: {
      fontFamily: "Inter",
      serifFont: "Georgia",
      monospaceFont: "Fira Code",
      baseFontSize: 15,
      headingScale: 1.3,
    },
    spacing: {
      borderRadius: 6,
      cardPadding: 16,
      buttonPadding: 10,
    },
  },
};

const fontOptions = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Lato", label: "Lato" },
  { value: "Nunito", label: "Nunito" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
];

const serifFontOptions = [
  { value: "Georgia", label: "Georgia" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Lora", label: "Lora" },
  { value: "PT Serif", label: "PT Serif" },
];

const monospaceFontOptions = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Source Code Pro", label: "Source Code Pro" },
  { value: "Monaco", label: "Monaco" },
  { value: "Consolas", label: "Consolas" },
];

const quickColorPalettes = [
  {
    name: "Azul Profissional",
    colors: { primary: "#3B82F6", secondary: "#60A5FA", accent: "#DBEAFE", background: "#F8FAFC", foreground: "#0F172A" },
  },
  {
    name: "Verde Natural",
    colors: { primary: "#10B981", secondary: "#34D399", accent: "#D1FAE5", background: "#F0FDF4", foreground: "#064E3B" },
  },
  {
    name: "Roxo Criativo",
    colors: { primary: "#8B5CF6", secondary: "#A78BFA", accent: "#EDE9FE", background: "#FAF5FF", foreground: "#1E1B4B" },
  },
  {
    name: "Laranja Energia",
    colors: { primary: "#F97316", secondary: "#FB923C", accent: "#FED7AA", background: "#FFFBEB", foreground: "#7C2D12" },
  },
  {
    name: "Rosa Moderno",
    colors: { primary: "#EC4899", secondary: "#F472B6", accent: "#FCE7F3", background: "#FDF2F8", foreground: "#500724" },
  },
  {
    name: "Ciano Tech",
    colors: { primary: "#06B6D4", secondary: "#22D3EE", accent: "#CFFAFE", background: "#ECFEFF", foreground: "#164E63" },
  },
  {
    name: "Escuro Elegante",
    colors: { primary: "#F59E0B", secondary: "#FBBF24", accent: "#1E293B", background: "#0F172A", foreground: "#F1F5F9" },
  },
  {
    name: "Escuro Neon",
    colors: { primary: "#00D9FF", secondary: "#BD00FF", accent: "#1A1A3E", background: "#0F0F23", foreground: "#E0E0FF" },
  },
];

function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md border border-border cursor-pointer"
          style={{ backgroundColor: value }}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-8 text-xs font-mono"
          data-testid={`input-color-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border-0"
          data-testid={`picker-color-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
      </div>
    </div>
  );
}

function PreviewSection({ styles, activePreviewTab }: { styles: StyleSettings; activePreviewTab: string }) {
  const baseStyle = {
    fontFamily: styles.typography.fontFamily,
    fontSize: `${styles.typography.baseFontSize}px`,
  };

  const cardStyle = {
    backgroundColor: styles.colors.card,
    borderColor: styles.colors.border,
    borderRadius: `${styles.spacing.borderRadius}px`,
    padding: `${styles.spacing.cardPadding}px`,
  };

  const inputStyle = {
    backgroundColor: styles.colors.muted,
    borderColor: styles.colors.border,
    borderRadius: `${styles.spacing.borderRadius}px`,
    color: styles.colors.foreground,
  };

  const primaryButtonStyle = {
    backgroundColor: styles.colors.primary,
    color: "#ffffff",
    borderRadius: `${styles.spacing.borderRadius}px`,
    padding: `${styles.spacing.buttonPadding / 2}px ${styles.spacing.buttonPadding}px`,
  };

  const outlineButtonStyle = {
    backgroundColor: "transparent",
    borderColor: styles.colors.border,
    color: styles.colors.foreground,
    borderRadius: `${styles.spacing.borderRadius}px`,
    padding: `${styles.spacing.buttonPadding / 2}px ${styles.spacing.buttonPadding}px`,
  };

  if (activePreviewTab === "cards") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={baseStyle}>
        <div className="rounded-lg border" style={cardStyle}>
          <h3
            className="font-semibold mb-1"
            style={{
              color: styles.colors.cardForeground,
              fontSize: `${styles.typography.baseFontSize * styles.typography.headingScale}px`,
            }}
          >
            Criar novo projeto
          </h3>
          <p
            className="text-sm mb-4"
            style={{ color: styles.colors.mutedForeground }}
          >
            Preencha as informações abaixo para criar um novo projeto.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: styles.colors.mutedForeground }}>
                Nome
              </label>
              <div
                className="h-9 px-3 flex items-center border text-sm"
                style={inputStyle}
              >
                <span style={{ color: styles.colors.mutedForeground }}>Nome do Projeto</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: styles.colors.mutedForeground }}>
                Email
              </label>
              <div
                className="h-9 px-3 flex items-center border text-sm"
                style={inputStyle}
              >
                <span style={{ color: styles.colors.mutedForeground }}>email@empresa.com</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium mb-2 block" style={{ color: styles.colors.mutedForeground }}>
              Tipo de Projeto
            </label>
            <p className="text-xs mb-2" style={{ color: styles.colors.mutedForeground }}>
              Selecione o tipo que melhor se encaixa.
            </p>
            <div className="flex gap-3">
              <div
                className="flex items-center gap-2 px-3 py-2 border text-sm cursor-pointer"
                style={{
                  ...inputStyle,
                  borderColor: styles.colors.primary,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: styles.colors.primary }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: styles.colors.primary }}
                  />
                </div>
                <div>
                  <span style={{ color: styles.colors.foreground }}>Web/SaaS</span>
                  <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                    Aplicações web
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2 border text-sm cursor-pointer"
                style={inputStyle}
              >
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: styles.colors.border }}
                />
                <div>
                  <span style={{ color: styles.colors.foreground }}>Mobile</span>
                  <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                    Apps nativos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium mb-1 block" style={{ color: styles.colors.mutedForeground }}>
              Descrição
            </label>
            <div
              className="h-16 px-3 py-2 border text-sm"
              style={inputStyle}
            >
              <span style={{ color: styles.colors.mutedForeground }}>Descreva seu projeto...</span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border flex items-center justify-center"
                style={{ borderColor: styles.colors.border, borderRadius: `${styles.spacing.borderRadius / 2}px` }}
              />
              <span className="text-sm" style={{ color: styles.colors.foreground }}>
                Concordo com os termos e condições
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border flex items-center justify-center"
                style={{
                  backgroundColor: styles.colors.primary,
                  borderColor: styles.colors.primary,
                  borderRadius: `${styles.spacing.borderRadius / 2}px`,
                }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: styles.colors.foreground }}>
                Receber atualizações por email
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="text-sm font-medium border" style={outlineButtonStyle}>
              Cancelar
            </button>
            <button className="text-sm font-medium" style={primaryButtonStyle}>
              Criar Projeto
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: styles.colors.mutedForeground }}>{'<'}</span>
              <span className="font-medium" style={{ color: styles.colors.cardForeground }}>
                Janeiro 2025
              </span>
              <span className="text-sm" style={{ color: styles.colors.mutedForeground }}>{'>'}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {['Do', 'Se', 'Te', 'Qa', 'Qi', 'Se', 'Sa'].map((d, i) => (
                <span key={i} style={{ color: styles.colors.mutedForeground }}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {[...Array(31)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 flex items-center justify-center mx-auto"
                  style={{
                    backgroundColor: i === 14 ? styles.colors.primary : 'transparent',
                    color: i === 14 ? '#ffffff' : styles.colors.foreground,
                    borderRadius: `${styles.spacing.borderRadius}px`,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border" style={cardStyle}>
            <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
              Meta do Projeto
            </h4>
            <p className="text-xs mb-3" style={{ color: styles.colors.mutedForeground }}>
              Defina sua meta de entregas.
            </p>
            <div className="flex items-center justify-center gap-4 mb-3">
              <button
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: styles.colors.border, color: styles.colors.foreground }}
              >
                -
              </button>
              <div className="text-center">
                <span
                  className="text-4xl font-bold"
                  style={{ color: styles.colors.cardForeground }}
                >
                  12
                </span>
                <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                  TAREFAS/SEMANA
                </p>
              </div>
              <button
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: styles.colors.border, color: styles.colors.foreground }}
              >
                +
              </button>
            </div>
            <div className="flex gap-1 justify-center mb-3">
              {[60, 80, 100, 70, 90, 50, 40].map((h, i) => (
                <div
                  key={i}
                  className="w-4"
                  style={{
                    height: `${h * 0.4}px`,
                    backgroundColor: styles.colors.secondary,
                    borderRadius: `${styles.spacing.borderRadius / 2}px`,
                  }}
                />
              ))}
            </div>
            <button className="w-full text-sm font-medium border" style={outlineButtonStyle}>
              Definir Meta
            </button>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Progresso do Sprint
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Suas tarefas estão acima da média esperada.
          </p>
          <div className="h-32 flex items-end justify-between px-2">
            {[30, 45, 70, 85, 60, 55, 75].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-8"
                  style={{
                    height: `${h}px`,
                    backgroundColor: i % 2 === 0 ? styles.colors.primary : styles.colors.accent,
                    borderRadius: `${styles.spacing.borderRadius / 2}px`,
                  }}
                />
                <span className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Membros do Time
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Gerencie acesso e permissões.
          </p>
          <div className="space-y-3">
            {[
              { name: 'Ana Silva', email: 'ana@empresa.com', role: 'Admin' },
              { name: 'Carlos Santos', email: 'carlos@empresa.com', role: 'Editor' },
              { name: 'Maria Oliveira', email: 'maria@empresa.com', role: 'Viewer' },
            ].map((member, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor: styles.colors.muted,
                      color: styles.colors.foreground,
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: styles.colors.foreground }}>
                      {member.name}
                    </p>
                    <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                      {member.email}
                    </p>
                  </div>
                </div>
                <div
                  className="px-2 py-1 text-xs border"
                  style={{
                    borderColor: styles.colors.border,
                    borderRadius: `${styles.spacing.borderRadius}px`,
                    color: styles.colors.foreground,
                  }}
                >
                  {member.role}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Status & Alertas
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Diferentes estados de mensagens.
          </p>
          <div className="space-y-2">
            <div className="px-3 py-2 border rounded-md text-sm" style={{
              backgroundColor: styles.colors.muted,
              borderColor: styles.colors.border,
              color: styles.colors.foreground,
            }}>
              ✓ Sucesso: Operação realizada com sucesso
            </div>
            <div className="px-3 py-2 border rounded-md text-sm" style={{
              backgroundColor: styles.colors.muted,
              borderColor: styles.colors.secondary,
              color: styles.colors.foreground,
            }}>
              ⚠ Aviso: Verifique este campo
            </div>
            <div className="px-3 py-2 border rounded-md text-sm" style={{
              backgroundColor: styles.colors.muted,
              borderColor: styles.colors.primary,
              color: styles.colors.foreground,
            }}>
              ✕ Erro: Algo não funcionou
            </div>
            <div className="px-3 py-2 border rounded-md text-sm" style={{
              backgroundColor: styles.colors.muted,
              borderColor: styles.colors.accent,
              color: styles.colors.foreground,
            }}>
              ℹ Informação: Leia esto com atenção
            </div>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Tags & Badges
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Diferentes estilos de etiquetas.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Ativo', 'Pendente', 'Concluído', 'Cancelado', 'Destacado'].map((tag, i) => (
              <div
                key={i}
                className="px-3 py-1 text-xs font-medium rounded-full border"
                style={{
                  backgroundColor: [styles.colors.primary, styles.colors.secondary, styles.colors.accent, styles.colors.muted, styles.colors.primary][i],
                  borderColor: [styles.colors.primary, styles.colors.secondary, styles.colors.accent, styles.colors.border, styles.colors.primary][i],
                  color: '#ffffff',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Indicadores de Progresso
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Barras de progresso em diferentes estados.
          </p>
          <div className="space-y-3">
            {[
              { label: '25%', value: 25 },
              { label: '50%', value: 50 },
              { label: '75%', value: 75 },
              { label: '100%', value: 100 },
            ].map((prog, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: styles.colors.foreground }}>{prog.label}</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: styles.colors.muted }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${prog.value}%`,
                      backgroundColor: styles.colors.primary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Inputs & Controles
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Diferentes elementos de entrada.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Input de texto"
              disabled
              style={{
                width: '100%',
                ...inputStyle,
                padding: '8px 12px',
              }}
            />
            <select style={{
              width: '100%',
              ...inputStyle,
              padding: '8px 12px',
            }}>
              <option>Selecione uma opção</option>
              <option>Opção 1</option>
              <option>Opção 2</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Espaçamento & Bordas
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Valores aplicados: {styles.spacing.borderRadius}px, {styles.spacing.cardPadding}px
          </p>
          <div className="space-y-2">
            <div
              className="border"
              style={{
                backgroundColor: styles.colors.accent,
                borderColor: styles.colors.border,
                borderRadius: `${styles.spacing.borderRadius}px`,
                padding: `${styles.spacing.cardPadding}px`,
              }}
            >
              <span style={{ color: styles.colors.foreground }}>Box com espaçamento aplicado</span>
            </div>
            <div
              className="border"
              style={{
                backgroundColor: styles.colors.muted,
                borderColor: styles.colors.primary,
                borderRadius: `${styles.spacing.borderRadius * 2}px`,
                padding: `${styles.spacing.cardPadding / 2}px`,
              }}
            >
              <span style={{ color: styles.colors.foreground }}>Box com borda customizada</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-1" style={{ color: styles.colors.cardForeground }}>
            Paleta Completa
          </h4>
          <p className="text-xs mb-4" style={{ color: styles.colors.mutedForeground }}>
            Todas as cores do sistema em um só lugar.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { name: 'Fundo', color: styles.colors.background },
              { name: 'Texto', color: styles.colors.foreground },
              { name: 'Primária', color: styles.colors.primary },
              { name: 'Secundária', color: styles.colors.secondary },
              { name: 'Acento', color: styles.colors.accent },
              { name: 'Card', color: styles.colors.card },
              { name: 'Texto Card', color: styles.colors.cardForeground },
              { name: 'Mutado', color: styles.colors.muted },
              { name: 'Borda', color: styles.colors.border },
              { name: 'Texto Mutado', color: styles.colors.mutedForeground },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-full h-16 rounded-md border mb-2"
                  style={{
                    backgroundColor: item.color,
                    borderColor: styles.colors.border,
                  }}
                />
                <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activePreviewTab === "typography") {
    return (
      <div className="space-y-6" style={baseStyle}>
        <div className="rounded-lg border" style={cardStyle}>
          <h2
            className="font-bold mb-4"
            style={{
              color: styles.colors.cardForeground,
              fontSize: `${styles.typography.baseFontSize * styles.typography.headingScale * 1.5}px`,
            }}
          >
            Tipografia do Sistema
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Título H1 - {styles.typography.fontFamily}
              </p>
              <h1
                className="font-bold"
                style={{
                  color: styles.colors.foreground,
                  fontSize: `${styles.typography.baseFontSize * styles.typography.headingScale * 2}px`,
                }}
              >
                Bem-vindo ao ForgeAI
              </h1>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Título H2 - {styles.typography.fontFamily}
              </p>
              <h2
                className="font-semibold"
                style={{
                  color: styles.colors.foreground,
                  fontSize: `${styles.typography.baseFontSize * styles.typography.headingScale * 1.5}px`,
                }}
              >
                Gerencie seus projetos
              </h2>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Título H3 - {styles.typography.fontFamily}
              </p>
              <h3
                className="font-medium"
                style={{
                  color: styles.colors.foreground,
                  fontSize: `${styles.typography.baseFontSize * styles.typography.headingScale}px`,
                }}
              >
                Configurações do projeto
              </h3>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Parágrafo - {styles.typography.fontFamily}
              </p>
              <p style={{ color: styles.colors.foreground, fontSize: `${styles.typography.baseFontSize}px` }}>
                O ForgeAI transforma briefings em projetos estruturados e executáveis.
                Nossa plataforma utiliza inteligência artificial para analisar suas necessidades
                e gerar documentação técnica completa.
              </p>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Texto secundário
              </p>
              <p style={{ color: styles.colors.mutedForeground, fontSize: `${styles.typography.baseFontSize * 0.875}px` }}>
                Texto de apoio com menor destaque visual para informações complementares.
              </p>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Código - {styles.typography.monospaceFont}
              </p>
              <div
                className="p-4"
                style={{
                  backgroundColor: styles.colors.muted,
                  borderRadius: `${styles.spacing.borderRadius}px`,
                }}
              >
                <code
                  style={{
                    fontFamily: styles.typography.monospaceFont,
                    color: styles.colors.secondary,
                    fontSize: `${styles.typography.baseFontSize * 0.875}px`,
                  }}
                >
                  {`const projeto = await forgeAI.criarProjeto({
  nome: "Meu App",
  tipo: "web-saas"
});`}
                </code>
              </div>
            </div>

            <div>
              <p className="text-xs mb-1" style={{ color: styles.colors.mutedForeground }}>
                Fonte Serif - {styles.typography.serifFont}
              </p>
              <p
                style={{
                  fontFamily: styles.typography.serifFont,
                  color: styles.colors.foreground,
                  fontSize: `${styles.typography.baseFontSize * 1.125}px`,
                }}
              >
                "A simplicidade é a sofisticação máxima." - Leonardo da Vinci
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={baseStyle}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(styles.colors).map(([key, value]) => (
          <div key={key} className="text-center">
            <div
              className="h-20 mb-2 border flex items-end justify-center pb-2"
              style={{
                backgroundColor: value,
                borderColor: styles.colors.border,
                borderRadius: `${styles.spacing.borderRadius}px`,
              }}
            >
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: styles.colors.background + "cc",
                  color: styles.colors.foreground,
                }}
              >
                {value}
              </span>
            </div>
            <p className="text-xs font-medium capitalize" style={{ color: styles.colors.foreground }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-3" style={{ color: styles.colors.cardForeground }}>
            Contraste de Texto
          </h4>
          <div className="space-y-3">
            <div className="p-3 rounded" style={{ backgroundColor: styles.colors.background }}>
              <p className="text-sm font-medium" style={{ color: styles.colors.foreground }}>
                Texto principal sobre fundo
              </p>
              <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                Texto secundário com menor destaque
              </p>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: styles.colors.muted }}>
              <p className="text-sm font-medium" style={{ color: styles.colors.foreground }}>
                Texto sobre fundo muted
              </p>
              <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>
                Subtexto em área destacada
              </p>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: styles.colors.primary }}>
              <p className="text-sm font-medium text-white">
                Texto branco sobre primária
              </p>
              <p className="text-xs text-white/80">
                Subtexto sobre cor primária
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-3" style={{ color: styles.colors.cardForeground }}>
            Botões e Badges
          </h4>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button className="text-sm font-medium" style={primaryButtonStyle}>
                Primário
              </button>
              <button
                className="text-sm font-medium"
                style={{ ...primaryButtonStyle, backgroundColor: styles.colors.secondary }}
              >
                Secundário
              </button>
              <button className="text-sm font-medium border" style={outlineButtonStyle}>
                Outline
              </button>
              <button
                className="text-sm font-medium"
                style={{ ...primaryButtonStyle, backgroundColor: styles.colors.accent, color: styles.colors.foreground }}
              >
                Accent
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                className="px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: styles.colors.primary, color: '#ffffff', borderRadius: `${styles.spacing.borderRadius * 2}px` }}
              >
                Ativo
              </div>
              <div
                className="px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: styles.colors.secondary, color: '#000000', borderRadius: `${styles.spacing.borderRadius * 2}px` }}
              >
                Pendente
              </div>
              <div
                className="px-2.5 py-1 text-xs font-medium border"
                style={{ borderColor: styles.colors.border, color: styles.colors.foreground, borderRadius: `${styles.spacing.borderRadius * 2}px` }}
              >
                Rascunho
              </div>
              <div
                className="px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: styles.colors.muted, color: styles.colors.mutedForeground, borderRadius: `${styles.spacing.borderRadius * 2}px` }}
              >
                Arquivado
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-3" style={{ color: styles.colors.cardForeground }}>
            Inputs e Formulários
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: styles.colors.mutedForeground }}>
                Campo de texto
              </label>
              <div
                className="h-9 px-3 flex items-center border text-sm"
                style={inputStyle}
              >
                <span style={{ color: styles.colors.foreground }}>Valor do campo</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: styles.colors.mutedForeground }}>
                Campo desabilitado
              </label>
              <div
                className="h-9 px-3 flex items-center border text-sm opacity-50"
                style={inputStyle}
              >
                <span style={{ color: styles.colors.mutedForeground }}>Desabilitado</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border flex items-center justify-center"
                style={{ backgroundColor: styles.colors.primary, borderColor: styles.colors.primary, borderRadius: `${styles.spacing.borderRadius / 2}px` }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: styles.colors.foreground }}>Opção selecionada</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border" style={cardStyle}>
          <h4 className="font-medium mb-3" style={{ color: styles.colors.cardForeground }}>
            Cards Aninhados
          </h4>
          <div className="space-y-3">
            <div
              className="p-3 rounded border"
              style={{ backgroundColor: styles.colors.muted, borderColor: styles.colors.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ backgroundColor: styles.colors.primary, color: '#ffffff' }}
                >
                  JP
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: styles.colors.foreground }}>João Paulo</p>
                  <p className="text-xs" style={{ color: styles.colors.mutedForeground }}>joao@empresa.com</p>
                </div>
              </div>
            </div>
            <div
              className="p-3 rounded border"
              style={{ backgroundColor: styles.colors.accent, borderColor: styles.colors.border }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: styles.colors.foreground }}>Progresso</span>
                <span className="text-sm font-medium" style={{ color: styles.colors.primary }}>75%</span>
              </div>
              <div
                className="h-2 mt-2 rounded-full"
                style={{ backgroundColor: styles.colors.muted }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: styles.colors.primary, width: '75%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border" style={cardStyle}>
        <h4 className="font-medium mb-4" style={{ color: styles.colors.cardForeground }}>
          Gradientes e Combinações
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div
            className="h-24 rounded flex items-center justify-center text-sm font-medium text-white"
            style={{
              background: `linear-gradient(135deg, ${styles.colors.primary}, ${styles.colors.secondary})`,
              borderRadius: `${styles.spacing.borderRadius}px`,
            }}
          >
            Primária → Secundária
          </div>
          <div
            className="h-24 rounded flex items-center justify-center text-sm font-medium"
            style={{
              background: `linear-gradient(135deg, ${styles.colors.accent}, ${styles.colors.muted})`,
              borderRadius: `${styles.spacing.borderRadius}px`,
              color: styles.colors.foreground,
            }}
          >
            Accent → Muted
          </div>
          <div
            className="h-24 rounded flex items-center justify-center text-sm font-medium text-white"
            style={{
              background: `linear-gradient(135deg, ${styles.colors.foreground}, ${styles.colors.primary})`,
              borderRadius: `${styles.spacing.borderRadius}px`,
            }}
          >
            Foreground → Primária
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StylesPage() {
  const [, params] = useRoute("/projects/:id/styles");
  const projectId = params?.id;
  const { toast } = useToast();

  const [styles, setStyles] = useState<StyleSettings>(defaultStyles);
  const [activeTab, setActiveTab] = useState("colors");
  const [activePreviewTab, setActivePreviewTab] = useState("cards");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    foundation: true,
    components: false,
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: briefing, isLoading: briefingLoading } = useQuery<Briefing>({
    queryKey: ["/api/projects", projectId, "briefing"],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (briefing?.visualIdentity && typeof briefing.visualIdentity === "object") {
      const vi = briefing.visualIdentity as Record<string, unknown>;
      if (vi.customStyles) {
        setStyles(vi.customStyles as StyleSettings);
      } else if (vi.id && typeof vi.id === "string") {
        const predefinedStyle = predefinedStylesMap[vi.id];
        if (predefinedStyle) {
          setStyles(predefinedStyle);
        }
      }
    }
  }, [briefing]);

  const saveStylesMutation = useMutation({
    mutationFn: async (newStyles: StyleSettings) => {
      if (!projectId) {
        throw new Error("Projeto não encontrado. Complete o briefing do projeto primeiro.");
      }
      const currentIdentity = (briefing?.visualIdentity as Record<string, unknown>) || {};
      return await apiRequest("PATCH", `/api/projects/${projectId}/briefing`, {
        visualIdentity: {
          ...currentIdentity,
          customStyles: newStyles,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "briefing"] });
      toast({
        title: "Estilos salvos",
        description: "As configurações de estilo foram atualizadas com sucesso.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar os estilos.",
        variant: "destructive",
      });
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateColor = (key: keyof StyleSettings["colors"], value: string) => {
    setStyles((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateTypography = (key: keyof StyleSettings["typography"], value: string | number) => {
    setStyles((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
  };

  const updateSpacing = (key: keyof StyleSettings["spacing"], value: number) => {
    setStyles((prev) => ({
      ...prev,
      spacing: { ...prev.spacing, [key]: value },
    }));
  };

  const resetStyles = () => {
    setStyles(defaultStyles);
    toast({
      title: "Estilos resetados",
      description: "As configurações de estilo foram restauradas para os valores padrão.",
      variant: "success",
    });
  };

  if (projectLoading || briefingLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex items-center justify-between gap-4 flex-shrink-0 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Estilos do Projeto
            </h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetStyles} data-testid="button-reset-styles">
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
          <Button
            size="sm"
            onClick={() => saveStylesMutation.mutate(styles)}
            disabled={saveStylesMutation.isPending || !briefing?.id}
            title={!briefing?.id ? "Complete o briefing do projeto primeiro" : undefined}
            data-testid="button-save-styles"
          >
            {saveStylesMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Estilos
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-2 py-2">
              <TabsList className="h-11 w-full bg-transparent">
                <TabsTrigger value="colors" className="flex-1 text-xs" data-testid="tab-colors">
                  Cores
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex-1 text-xs" data-testid="tab-typography">
                  Tipografia
                </TabsTrigger>
                <TabsTrigger value="spacing" className="flex-1 text-xs" data-testid="tab-spacing">
                  Espaçamento
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="h-px bg-border" />
            <ScrollArea className="flex-1 w-full">
              <div className="p-4 w-full">
                <TabsContent value="colors" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Paletas Rápidas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {quickColorPalettes.map((palette) => (
                        <button
                          key={palette.name}
                          onClick={() => {
                            setStyles((prev) => ({
                              ...prev,
                              colors: {
                                ...prev.colors,
                                ...palette.colors,
                                card: palette.colors.background,
                                cardForeground: palette.colors.foreground,
                                muted: palette.colors.accent,
                                mutedForeground: palette.colors.foreground + "99",
                                border: palette.colors.foreground + "20",
                              },
                            }));
                            toast({
                              title: "Paleta aplicada",
                              description: `${palette.name} foi aplicada.`,
                              variant: "success",
                            });
                          }}
                          className="p-2 border border-border hover-elevate text-left !rounded-[10px]"
                          data-testid={`button-palette-${palette.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className="flex gap-0.5 mb-1.5">
                            {[palette.colors.primary, palette.colors.secondary, palette.colors.accent, palette.colors.background].map((c, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded-sm border border-border/50"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{palette.name}</span>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStyles(defaultStyles);
                        toast({
                          title: "Cores restauradas",
                          description: "As cores originais foram restauradas.",
                          variant: "success",
                        });
                      }}
                      className="w-full mt-2"
                      data-testid="button-restore-colors"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restaurar Cores Originais
                    </Button>
                  </div>

                  <div className="h-px bg-border my-3" />

                  <Collapsible
                    open={expandedSections.foundation}
                    onOpenChange={() => toggleSection("foundation")}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded px-2 -mx-2">
                      <span className="text-sm font-medium">Fundação</span>
                      {expandedSections.foundation ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-2">
                      <ColorPicker
                        label="Fundo"
                        value={styles.colors.background}
                        onChange={(v) => updateColor("background", v)}
                        description="Cor de fundo principal"
                      />
                      <ColorPicker
                        label="Texto"
                        value={styles.colors.foreground}
                        onChange={(v) => updateColor("foreground", v)}
                        description="Cor do texto principal"
                      />
                      <ColorPicker
                        label="Primária"
                        value={styles.colors.primary}
                        onChange={(v) => updateColor("primary", v)}
                        description="Cor de destaque principal"
                      />
                      <ColorPicker
                        label="Secundária"
                        value={styles.colors.secondary}
                        onChange={(v) => updateColor("secondary", v)}
                        description="Cor de destaque secundário"
                      />
                      <ColorPicker
                        label="Accent"
                        value={styles.colors.accent}
                        onChange={(v) => updateColor("accent", v)}
                        description="Cor de acento"
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible
                    open={expandedSections.components}
                    onOpenChange={() => toggleSection("components")}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover-elevate rounded px-2 -mx-2">
                      <span className="text-sm font-medium">Componentes</span>
                      {expandedSections.components ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-2">
                      <ColorPicker
                        label="Card"
                        value={styles.colors.card}
                        onChange={(v) => updateColor("card", v)}
                        description="Fundo dos cards"
                      />
                      <ColorPicker
                        label="Card Texto"
                        value={styles.colors.cardForeground}
                        onChange={(v) => updateColor("cardForeground", v)}
                        description="Texto dos cards"
                      />
                      <ColorPicker
                        label="Muted"
                        value={styles.colors.muted}
                        onChange={(v) => updateColor("muted", v)}
                        description="Fundo suave"
                      />
                      <ColorPicker
                        label="Muted Texto"
                        value={styles.colors.mutedForeground}
                        onChange={(v) => updateColor("mutedForeground", v)}
                        description="Texto suave"
                      />
                      <ColorPicker
                        label="Borda"
                        value={styles.colors.border}
                        onChange={(v) => updateColor("border", v)}
                        description="Cor das bordas"
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>

                <TabsContent value="typography" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Fonte Principal</Label>
                      <p className="text-xs text-muted-foreground mb-2">Usada em textos e interfaces</p>
                      <Select
                        value={styles.typography.fontFamily}
                        onValueChange={(v) => updateTypography("fontFamily", v)}
                      >
                        <SelectTrigger data-testid="select-font-family">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Fonte Serif</Label>
                      <p className="text-xs text-muted-foreground mb-2">Usada em títulos e destaques</p>
                      <Select
                        value={styles.typography.serifFont}
                        onValueChange={(v) => updateTypography("serifFont", v)}
                      >
                        <SelectTrigger data-testid="select-serif-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serifFontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Fonte Monospace</Label>
                      <p className="text-xs text-muted-foreground mb-2">Usada em código e dados técnicos</p>
                      <Select
                        value={styles.typography.monospaceFont}
                        onValueChange={(v) => updateTypography("monospaceFont", v)}
                      >
                        <SelectTrigger data-testid="select-monospace-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monospaceFontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Tamanho Base</Label>
                        <span className="text-xs text-muted-foreground">{styles.typography.baseFontSize}px</span>
                      </div>
                      <Slider
                        value={[styles.typography.baseFontSize]}
                        onValueChange={([v]) => updateTypography("baseFontSize", v)}
                        min={12}
                        max={20}
                        step={1}
                        data-testid="slider-font-size"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Escala de Títulos</Label>
                        <span className="text-xs text-muted-foreground">{styles.typography.headingScale.toFixed(2)}x</span>
                      </div>
                      <Slider
                        value={[styles.typography.headingScale]}
                        onValueChange={([v]) => updateTypography("headingScale", v)}
                        min={1.1}
                        max={1.5}
                        step={0.05}
                        data-testid="slider-heading-scale"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="spacing" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Border Radius</Label>
                        <span className="text-xs text-muted-foreground">{styles.spacing.borderRadius}px</span>
                      </div>
                      <Slider
                        value={[styles.spacing.borderRadius]}
                        onValueChange={([v]) => updateSpacing("borderRadius", v)}
                        min={0}
                        max={24}
                        step={1}
                        data-testid="slider-border-radius"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Padding do Card</Label>
                        <span className="text-xs text-muted-foreground">{styles.spacing.cardPadding}px</span>
                      </div>
                      <Slider
                        value={[styles.spacing.cardPadding]}
                        onValueChange={([v]) => updateSpacing("cardPadding", v)}
                        min={8}
                        max={32}
                        step={2}
                        data-testid="slider-card-padding"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Padding do Botão</Label>
                        <span className="text-xs text-muted-foreground">{styles.spacing.buttonPadding}px</span>
                      </div>
                      <Slider
                        value={[styles.spacing.buttonPadding]}
                        onValueChange={([v]) => updateSpacing("buttonPadding", v)}
                        min={4}
                        max={20}
                        step={2}
                        data-testid="slider-button-padding"
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-2 py-2">
            <div className="flex items-center gap-1 p-1 rounded-lg">
              {[
                { id: "cards", label: "Cards" },
                { id: "typography", label: "Tipografia" },
                { id: "colors", label: "Cores" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  className="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: activePreviewTab === tab.id ? '#e23403' : 'transparent',
                    color: activePreviewTab === tab.id ? '#FFFFFF' : '#8B8B96',
                  }}
                  data-testid={`button-preview-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-border" />
          <ScrollArea className="flex-1">
            <div
              className="p-6 min-h-full"
              style={{ backgroundColor: styles.colors.background }}
            >
              <PreviewSection styles={styles} activePreviewTab={activePreviewTab} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
