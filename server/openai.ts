import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Briefing, Scope, Roadmap } from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Direct OpenAI client for Whisper transcription (not supported by Replit AI Integrations)
const openaiDirect = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SpecializedAgentType =
  | "code-review"
  | "testing"
  | "security"
  | "performance";

export async function callAIWithFallback(
  prompt: string,
  systemPrompt: string = ""
): Promise<string> {
  const actualSystemPrompt = systemPrompt || "Você é um assistente especializado em desenvolvimento de software e propostas comerciais. Sempre responda em português brasileiro com acentuação correta.";
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      system: actualSystemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (textContent && textContent.type === "text") {
      return textContent.text;
    }
    throw new Error("No text content in response");
  } catch (claudeError) {
    console.warn("Claude failed, falling back to GPT-4o:", claudeError);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) throw new Error("No text content in response");
    return textContent;
  }
}

export async function analyzeBriefingMessage(
  message: string,
  briefing: Briefing | null,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{ response: string; suggestedFields?: Record<string, unknown> }> {
  const systemPrompt = `Você é um assistente especializado em análise de briefings de projetos. 
Analise a mensagem do usuário e forneça uma resposta útil em português brasileiro.
Se houver campos importantes não preenchidos, sugira-os no final da resposta.
Sempre responda em português brasileiro com acentuação correta.`;

  const conversationText = conversationHistory
    .map((h) => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`)
    .join("\n");

  const prompt = `Briefing atual: ${JSON.stringify(briefing, null, 2)}

Histórico da conversa:
${conversationText}

Nova mensagem do usuário: ${message}

Responda de forma concisa e útil, em português brasileiro.`;

  const response = await callAIWithFallback(prompt, systemPrompt);
  return { response };
}

export async function generateScope(
  projectName: string,
  briefing: Briefing | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em definição de escopo de projetos de software.
Gere um documento de escopo bem estruturado em português brasileiro com acentuação correta.
O escopo deve incluir: Visão Geral, Objetivos, Funcionalidades In Scope, Out Of Scope, Restrições e Premissas.`;

  const prompt = `Crie um documento de escopo detalhado para o projeto "${projectName}" com base no seguinte briefing:

${JSON.stringify(briefing, null, 2)}

Responda em português brasileiro com acentuação correta. Forneça um documento estruturado e profissional.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateRoadmap(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em planejamento de roadmaps de projetos.
Gere um roadmap estruturado em português brasileiro com acentuação correta.
Inclua fases, milestones, estimativas de tempo e entregas.`;

  const prompt = `Crie um roadmap detalhado para o projeto "${projectName}" com base no briefing e escopo:

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda em português brasileiro com acentuação correta. Forneça um roadmap realista e bem planejado.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateChecklists(
  projectName: string,
  briefing: Briefing | null
): Promise<Array<{ type: string; items: string[] }>> {
  const systemPrompt = `Você é um especialista em gerenciamento de projetos.
Gere checklists detalhadas em português brasileiro com acentuação correta.
Responda com um JSON array de objetos com propriedades 'type' e 'items'.`;

  const prompt = `Crie checklists essenciais para o projeto "${projectName}":

${JSON.stringify(briefing, null, 2)}

Responda em JSON válido com array de checklists. Use português brasileiro com acentuação correta.`;

  const response = await callAIWithFallback(prompt, systemPrompt);
  try {
    return JSON.parse(response);
  } catch {
    return [
      {
        type: "Planejamento",
        items: [
          "Definir requisitos finais",
          "Validar escopo com stakeholders",
          "Criar timeline detalhada",
        ],
      },
    ];
  }
}

export async function generateAiCommand(
  projectName: string,
  briefing: Briefing | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em AI prompts e automação.
Gere um comando estruturado em formato JSON para usar com ferramentas de AI em português brasileiro.`;

  const prompt = `Crie um comando de AI bem estruturado para o projeto "${projectName}":

${JSON.stringify(briefing, null, 2)}

Responda em português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateTechnicalDoc(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em documentação técnica de software.
Gere uma documentação técnica completa em português brasileiro com acentuação correta.
Inclua: visão geral, arquitetura, stack, requisitos, processo de setup, e considerações de segurança.`;

  const prompt = `Crie uma documentação técnica detalhada para "${projectName}":

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda em markdown português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateArchitectureDoc(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null,
  roadmap: Roadmap | null
): Promise<string> {
  const systemPrompt = `Você é um arquiteto de software especializado.
Gere documentação de arquitetura com diagramas (usando Mermaid), componentes e decisões em português brasileiro.`;

  const prompt = `Crie documentação de arquitetura para "${projectName}":

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}
Roadmap: ${JSON.stringify(roadmap, null, 2)}

Inclua diagramas em Mermaid. Responda em português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateApiDoc(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em documentação de APIs.
Gere documentação de API em formato OpenAPI/Swagger em português brasileiro com acentuação correta.
Inclua endpoints, parâmetros, respostas, exemplos e autenticação.`;

  const prompt = `Crie documentação de API para "${projectName}":

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda em markdown com exemplos de API REST. Use português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateInstallGuide(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em documentação de instalação e deployment.
Gere um guia de instalação completo em português brasileiro com acentuação correta.
Inclua: pré-requisitos, instalação, configuração, testes e troubleshooting.`;

  const prompt = `Crie um guia de instalação completo para "${projectName}":

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda em markdown. Use português brasileiro com acentuação correta. Seja específico e prático.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateStylesGuide(
  projectName: string,
  briefing: Briefing | null
): Promise<string> {
  const systemPrompt = `Você é um especialista em design systems e guias de estilos.
Gere um guia de estilos completo e detalhado em português brasileiro com acentuação correta.
Documente precisamente a paleta de cores, tipografia, espaçamento e componentes fornecidos.`;

  // Extract custom styles from briefing's visualIdentity
  const visualIdentity = (briefing?.visualIdentity as any) || {};
  const customStyles = visualIdentity.customStyles as any;

  let stylesInfo = "";
  if (customStyles) {
    stylesInfo = `## Estilos Customizados Salvos

### Cores
${
  customStyles.colors
    ? Object.entries(customStyles.colors)
        .map(
          ([key, value]) =>
            `- **${key}**: ${value} (Hex: ${value})`
        )
        .join("\n")
    : "Nenhuma cor customizada"
}

### Tipografia
${
  customStyles.typography
    ? `- Fonte Principal: ${customStyles.typography.fontFamily}
- Fonte Serif: ${customStyles.typography.serifFont}
- Fonte Monospace: ${customStyles.typography.monospaceFont}
- Tamanho Base: ${customStyles.typography.baseFontSize}px
- Escala de Títulos: ${customStyles.typography.headingScale}x`
    : "Nenhuma customização de tipografia"
}

### Espaçamento
${
  customStyles.spacing
    ? `- Border Radius: ${customStyles.spacing.borderRadius}px
- Padding de Cartões: ${customStyles.spacing.cardPadding}px
- Padding de Botões: ${customStyles.spacing.buttonPadding}px`
    : "Nenhuma customização de espaçamento"
}`;
  }

  const prompt = `Crie um guia de estilos (design system) detalhado para o projeto "${projectName}" documentando os estilos abaixo:

${stylesInfo}

Briefing do Projeto: ${JSON.stringify(briefing, null, 2)}

Responda em markdown com as seguintes seções:
1. **Visão Geral** - Descrição do design system
2. **Paleta de Cores** - Cores customizadas com uso e significado
3. **Tipografia** - Fontes, tamanhos e hierarquia de texto
4. **Espaçamento** - Medidas de padding, margin e border-radius
5. **Componentes** - Descrição de botões, cartões, inputs e badges
6. **Padrões de Uso** - Quando e como usar cada estilo
7. **Acessibilidade** - Garantia de contraste e práticas
8. **Responsividade** - Adaptação em diferentes telas

Seja muito específico e prático. Use português brasileiro com acentuação correta.
Todos os valores (hex, px, fontes) devem estar documentados com precisão.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function extractTextFromDocument(
  filename: string,
  fileContent: Buffer
): Promise<string> {
  const systemPrompt = `Você é um especialista em processamento de documentos.
Extraia o texto relevante do documento fornecido em português brasileiro.`;

  let textContent: string;
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "txt" || extension === "md") {
    textContent = fileContent.toString("utf-8");
  } else if (extension === "json") {
    textContent = JSON.stringify(JSON.parse(fileContent.toString("utf-8")), null, 2);
  } else if (extension === "csv") {
    textContent = fileContent.toString("utf-8");
  } else {
    textContent = fileContent.toString("utf-8");
  }

  const prompt = `Analise este documento (${filename}) e extraia o conteúdo principal:

${textContent.substring(0, 5000)}

Responda em português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function runSpecializedAgent(
  agentType: SpecializedAgentType,
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const prompts: Record<SpecializedAgentType, string> = {
    "code-review": `Analise a qualidade do código e forneça recomendações de melhoria para ${projectName}.`,
    testing: `Crie uma estratégia de testes abrangente para ${projectName}.`,
    security: `Analise os riscos de segurança para ${projectName} e recomende mitigações.`,
    performance: `Identifique gargalos de performance potenciais em ${projectName} e sugira otimizações.`,
  };

  const systemPrompt = `Você é um especialista em ${agentType} de software.
Forneça análise profunda e recomendações práticas em português brasileiro com acentuação correta.`;

  const prompt = `${prompts[agentType]}

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda em detalhes em português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function runSpecializedAgentAnalysis(
  agentType: SpecializedAgentType,
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  return runSpecializedAgent(agentType, projectName, briefing, scope);
}

export async function runOrchestratedAnalysis(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é um orquestrador de análises de projetos.
Forneça uma análise consolidada considerando código, testes, segurança e performance.
Use português brasileiro com acentuação correta.`;

  const prompt = `Execute uma análise consolidada para o projeto "${projectName}":

Briefing: ${JSON.stringify(briefing, null, 2)}
Escopo: ${JSON.stringify(scope, null, 2)}

Responda com análise integrada cobrindo qualidade, testes, segurança e performance. Use português brasileiro.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateStageTasks(
  stageName: string,
  projectName: string,
  briefing: Briefing | null
): Promise<Array<{ title: string; description: string; weight: number }>> {
  const systemPrompt = `Você é um especialista em decomposição de trabalho.
Gere tarefas detalhadas em JSON em português brasileiro com acentuação correta.`;

  const prompt = `Crie tarefas detalhadas para o estágio "${stageName}" do projeto "${projectName}":

${JSON.stringify(briefing, null, 2)}

Responda em JSON com array de objetos contendo: title, description, weight.
Use português brasileiro com acentuação correta.`;

  const response = await callAIWithFallback(prompt, systemPrompt);
  try {
    return JSON.parse(response);
  } catch {
    return [
      {
        title: "Tarefa Padrão",
        description: "Descrição da tarefa",
        weight: 1,
      },
    ];
  }
}

interface WBSItem {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: "high" | "medium" | "low";
  deliverables: string[];
  dependencies: string[];
}

interface WBSPhase {
  name: string;
  description: string;
  estimatedHours: number;
  items: WBSItem[];
}

interface WBSResult {
  phases: WBSPhase[];
  totalEstimatedHours: number;
  criticalPath: string[];
}

export async function generateWBS(
  projectName: string,
  scope: {
    objective?: string;
    deliverables: string[];
    outOfScope: string[];
    assumptions: string[];
    dependencies: string[];
  },
  briefing?: {
    projectType?: string;
    desiredScope?: string;
    businessObjective?: string;
    stack?: string;
    deadlineText?: string;
  }
): Promise<WBSResult> {
  const systemPrompt = `Você é um especialista em estrutura analítica de projetos (EAP/WBS).
Gere uma WBS detalhada em formato JSON em português brasileiro com acentuação correta.
IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional ou markdown.`;

  const prompt = `Crie uma WBS (Work Breakdown Structure) detalhada para o projeto "${projectName}":

Escopo:
- Objetivo: ${scope.objective || 'Não definido'}
- Entregáveis: ${JSON.stringify(scope.deliverables)}
- Fora do Escopo: ${JSON.stringify(scope.outOfScope)}
- Premissas: ${JSON.stringify(scope.assumptions)}
- Dependências: ${JSON.stringify(scope.dependencies)}

${briefing ? `Briefing:
- Tipo: ${briefing.projectType || 'Não definido'}
- Escopo Desejado: ${briefing.desiredScope || 'Não definido'}
- Objetivo de Negócio: ${briefing.businessObjective || 'Não definido'}
- Stack: ${briefing.stack || 'Não definido'}
- Prazo: ${briefing.deadlineText || 'Não definido'}` : ''}

Responda APENAS com JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "phases": [
    {
      "name": "Nome da Fase",
      "description": "Descrição da fase",
      "estimatedHours": 40,
      "items": [
        {
          "id": "1.1",
          "title": "Título da tarefa",
          "description": "Descrição detalhada",
          "estimatedHours": 8,
          "priority": "high",
          "deliverables": ["Entregável 1"],
          "dependencies": []
        }
      ]
    }
  ],
  "totalEstimatedHours": 398,
  "criticalPath": ["1.1", "1.2", "2.1"]
}

Use português brasileiro com acentuação correta (ç, ã, é, í, ó, ú, â, ê, ô, etc).
Inclua 4-6 fases típicas de projeto (Planejamento, Design, Desenvolvimento, Testes, Deploy).
Cada fase deve ter 4-8 itens de trabalho detalhados.
O totalEstimatedHours deve ser a soma de todas as horas das fases.`;

  const response = await callAIWithFallback(prompt, systemPrompt);
  
  try {
    // Clean up response - remove markdown code blocks if present
    let cleanJson = response.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();
    
    const parsed = JSON.parse(cleanJson) as WBSResult;
    
    // Calculate total hours if not provided correctly
    if (!parsed.totalEstimatedHours || parsed.totalEstimatedHours === 0) {
      parsed.totalEstimatedHours = parsed.phases.reduce((sum, phase) => sum + (phase.estimatedHours || 0), 0);
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to parse WBS JSON:", error);
    // Return a default structure
    return {
      phases: [
        {
          name: "Planejamento",
          description: "Fase de planejamento do projeto",
          estimatedHours: 40,
          items: [
            {
              id: "1.1",
              title: "Levantamento de Requisitos",
              description: "Análise e documentação dos requisitos do projeto",
              estimatedHours: 16,
              priority: "high",
              deliverables: ["Documento de Requisitos"],
              dependencies: [],
            },
          ],
        },
      ],
      totalEstimatedHours: 40,
      criticalPath: ["1.1"],
    };
  }
}

export async function analyzeImageForStyles(
  imageBase64: string,
  imageMimeType: string
): Promise<{
  colors: Array<{ name: string; hex: string }>;
  typography: { primaryFont: string; secondaryFont: string };
  styleDescription: string;
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analise esta imagem e extraia paleta de cores e estilos de design.
Responda com um JSON contendo:
{
  "colors": [{"name": "cor principal", "hex": "#RRGGBB"}, ...],
  "typography": {"primaryFont": "fonte primária", "secondaryFont": "fonte secundária"},
  "styleDescription": "descrição breve do estilo visual em português brasileiro"
}

Identifique cores dominantes e sugeriu nomes em português. Use português brasileiro com acentuação correta.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from vision analysis");
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn("Failed to analyze image for styles:", error);
    return {
      colors: [
        { name: "Primária", hex: "#de3403" },
        { name: "Secundária", hex: "#fbbd23" },
      ],
      typography: {
        primaryFont: "Inter",
        secondaryFont: "Georgia",
      },
      styleDescription: "Estilo moderno com cores vibrantes",
    };
  }
}

export async function generateRequirements(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é especialista em especificação de requisitos.
Gere uma especificação clara em português brasileiro com acentuação correta.`;

  const prompt = `Crie uma especificação de requisitos para "${projectName}":
Briefing: ${JSON.stringify(briefing, null, 2)}
Scope: ${JSON.stringify(scope, null, 2)}
Incluir: Requisitos Funcionais, Não-Funcionais, Critérios de Aceitação e Priorização.
Use português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateUserGuide(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é especialista em documentação de usuário.
Crie um guia prático e intuitivo em português brasileiro com acentuação correta.`;

  const prompt = `Crie um Guia do Usuário para "${projectName}":
Briefing: ${JSON.stringify(briefing, null, 2)}
Scope: ${JSON.stringify(scope, null, 2)}
Incluir: Visão Geral, Getting Started, Funcionalidades, Troubleshooting e FAQ.
Use linguagem simples. Português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export async function generateTestingStrategy(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null
): Promise<string> {
  const systemPrompt = `Você é especialista em QA e testes de software.
Crie uma estratégia de testes abrangente em português brasileiro com acentuação correta.`;

  const prompt = `Crie uma Estratégia de Testes para "${projectName}":
Briefing: ${JSON.stringify(briefing, null, 2)}
Scope: ${JSON.stringify(scope, null, 2)}
Incluir: Tipos de Teste, Casos Principais, Critérios, Ferramentas e Cronograma.
Use português brasileiro com acentuação correta.`;

  return callAIWithFallback(prompt, systemPrompt);
}

export interface ProjectStructure {
  name: string;
  stack: string;
  framework: string;
  fileTree: string[];
  files: Record<string, string>;
  packageJson: Record<string, unknown>;
  configFiles: Record<string, string>;
  readmeContent: string;
}

export async function generateProjectStructure(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null,
  roadmap: Roadmap | null,
  targetStack: string = "react-vite"
): Promise<ProjectStructure> {
  const stackConfigs: Record<string, { framework: string; template: string }> = {
    "react-vite": { framework: "Vite + React + TypeScript", template: "react" },
    "nextjs": { framework: "Next.js 14 + TypeScript", template: "nextjs" },
    "express": { framework: "Express.js + TypeScript", template: "express" },
    "node": { framework: "Node.js + TypeScript", template: "node" },
    "python-flask": { framework: "Python + Flask", template: "flask" },
    "python-fastapi": { framework: "Python + FastAPI", template: "fastapi" },
  };

  const config = stackConfigs[targetStack] || stackConfigs["react-vite"];

  const systemPrompt = `Você é um expert em desenvolvimento de software e geração de código.
Gere uma estrutura de projeto COMPLETA e EXECUTÁVEL para a plataforma ${config.framework}.
O código deve ser funcional, bem estruturado e seguir as melhores práticas.
Responda SEMPRE em JSON válido com a estrutura especificada.
Todo o conteúdo textual deve estar em português brasileiro com acentuação correta.`;

  const prompt = `Gere uma estrutura de projeto completa e executável para:

**Projeto:** ${projectName}
**Stack:** ${config.framework}

**Briefing:**
${JSON.stringify(briefing, null, 2)}

**Escopo:**
${JSON.stringify(scope, null, 2)}

**Roadmap:**
${JSON.stringify(roadmap, null, 2)}

Responda com um JSON contendo:
{
  "fileTree": ["lista de caminhos de arquivos"],
  "files": {
    "caminho/do/arquivo.ts": "conteúdo completo do arquivo",
    "src/App.tsx": "código React completo",
    ...
  },
  "packageJson": {
    "name": "nome-do-projeto",
    "version": "1.0.0",
    "scripts": {...},
    "dependencies": {...},
    "devDependencies": {...}
  },
  "configFiles": {
    "tsconfig.json": "conteúdo",
    "vite.config.ts": "conteúdo",
    ...
  },
  "readme": "# Nome do Projeto\\n\\nDescrição completa..."
}

IMPORTANTE:
1. Gere código REAL e FUNCIONAL, não placeholders
2. Inclua todos os imports necessários
3. Inclua componentes UI básicos funcionais
4. O package.json deve ter todas as dependências
5. Inclua arquivos de configuração completos (tsconfig, vite.config, etc)
6. O README deve explicar como executar o projeto
7. Siga as melhores práticas de ${config.framework}

Gere apenas o JSON, sem markdown ou texto adicional.`;

  try {
    const response = await callAIWithFallback(prompt, systemPrompt);
    
    // Parse JSON response
    let parsed: {
      fileTree: string[];
      files: Record<string, string>;
      packageJson: Record<string, unknown>;
      configFiles: Record<string, string>;
      readme: string;
    };
    
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse project structure JSON:", parseError);
      // Return a minimal fallback structure
      return getDefaultProjectStructure(projectName, targetStack, briefing);
    }

    return {
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      stack: targetStack,
      framework: config.framework,
      fileTree: parsed.fileTree || [],
      files: parsed.files || {},
      packageJson: parsed.packageJson || {},
      configFiles: parsed.configFiles || {},
      readmeContent: parsed.readme || `# ${projectName}\n\nProjeto gerado pelo ForgeAI.`,
    };
  } catch (error) {
    console.error("Failed to generate project structure:", error);
    return getDefaultProjectStructure(projectName, targetStack, briefing);
  }
}

function getDefaultProjectStructure(
  projectName: string,
  stack: string,
  briefing: Briefing | null
): ProjectStructure {
  const projectSlug = projectName.toLowerCase().replace(/\s+/g, "-");
  const description = briefing?.businessObjective || "Projeto gerado pelo ForgeAI";

  if (stack === "express" || stack === "node") {
    return {
      name: projectSlug,
      stack,
      framework: "Express.js + TypeScript",
      fileTree: [
        "package.json",
        "tsconfig.json",
        "src/index.ts",
        "src/routes/index.ts",
        "README.md",
      ],
      files: {
        "src/index.ts": `import express from "express";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "Bem-vindo ao ${projectName}!" });
});

app.listen(PORT, () => {
  console.log(\`Servidor rodando na porta \${PORT}\`);
});
`,
        "src/routes/index.ts": `import { Router } from "express";

const router = Router();

router.get("/status", (req, res) => {
  res.json({ status: "ok", projeto: "${projectName}" });
});

export default router;
`,
      },
      packageJson: {
        name: projectSlug,
        version: "1.0.0",
        description,
        main: "dist/index.js",
        scripts: {
          dev: "tsx watch src/index.ts",
          build: "tsc",
          start: "node dist/index.js",
        },
        dependencies: {
          express: "^4.18.2",
        },
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/node": "^20.10.0",
          tsx: "^4.6.0",
          typescript: "^5.3.0",
        },
      },
      configFiles: {
        "tsconfig.json": JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              module: "commonjs",
              outDir: "./dist",
              rootDir: "./src",
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
            },
            include: ["src/**/*"],
          },
          null,
          2
        ),
      },
      readmeContent: `# ${projectName}

${description}

## Instalação

\`\`\`bash
npm install
\`\`\`

## Executar

\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

- \`GET /\` - Página inicial
- \`GET /api/status\` - Status do servidor

---
Gerado pelo ForgeAI
`,
    };
  }

  // Default React + Vite structure
  return {
    name: projectSlug,
    stack: "react-vite",
    framework: "Vite + React + TypeScript",
    fileTree: [
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "index.html",
      "src/main.tsx",
      "src/App.tsx",
      "src/App.css",
      "src/index.css",
      "README.md",
    ],
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      "src/main.tsx": `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
      "src/App.tsx": `import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>${projectName}</h1>
        <p>${description}</p>
      </header>
      <main className="app-main">
        <section className="hero">
          <h2>Bem-vindo!</h2>
          <p>Seu projeto está pronto para ser desenvolvido.</p>
        </section>
      </main>
      <footer className="app-footer">
        <p>Gerado pelo ForgeAI</p>
      </footer>
    </div>
  )
}

export default App
`,
      "src/App.css": `.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.app-header h1 {
  margin: 0 0 0.5rem;
  font-size: 2.5rem;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.hero {
  text-align: center;
  padding: 3rem 0;
}

.hero h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.app-footer {
  background: #f5f5f5;
  padding: 1rem;
  text-align: center;
  color: #666;
}
`,
      "src/index.css": `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

a {
  color: #667eea;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
`,
    },
    packageJson: {
      name: projectSlug,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.43",
        "@types/react-dom": "^18.2.17",
        "@vitejs/plugin-react": "^4.2.1",
        typescript: "^5.2.2",
        vite: "^5.0.8",
      },
    },
    configFiles: {
      "vite.config.ts": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
          },
          include: ["src"],
          references: [{ path: "./tsconfig.node.json" }],
        },
        null,
        2
      ),
    },
    readmeContent: `# ${projectName}

${description}

## Tecnologias

- React 18
- TypeScript
- Vite

## Instalação

\`\`\`bash
npm install
\`\`\`

## Executar em Desenvolvimento

\`\`\`bash
npm run dev
\`\`\`

## Build para Produção

\`\`\`bash
npm run build
\`\`\`

---
Gerado pelo ForgeAI
`,
  };
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<{ transcription: string; title: string; preview: string }> {
  try {
    // Create a Blob-like object for OpenAI SDK in Node.js
    const blob = new Blob([audioBuffer], { type: mimeType });
    const file = new File([blob], "audio.webm", { type: mimeType });

    // Use direct OpenAI client for Whisper (not supported by Replit AI Integrations)
    const transcription = await openaiDirect.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "pt",
      response_format: "text",
    });

    const transcriptionText =
      typeof transcription === "string"
        ? transcription
        : (transcription as any).text || "";

    if (!transcriptionText.trim()) {
      return {
        transcription: "",
        title: "Áudio sem conteúdo",
        preview: "Nenhum conteúdo foi detectado neste áudio.",
      };
    }

    const titlePrompt = `Com base nesta transcrição de áudio, gere um título curto e descritivo (máximo 50 caracteres) em português brasileiro:

"${transcriptionText.substring(0, 500)}"

Responda APENAS com o título, sem aspas ou explicações.`;

    const titleResponse = await callAIWithFallback(
      titlePrompt,
      "Você é um assistente que cria títulos curtos e descritivos em português brasileiro."
    );

    const title = titleResponse.trim().substring(0, 60);
    const preview =
      transcriptionText.length > 100
        ? transcriptionText.substring(0, 100) + "..."
        : transcriptionText;

    return {
      transcription: transcriptionText,
      title,
      preview,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return {
      transcription: "",
      title: "Erro na transcrição",
      preview: "Não foi possível transcrever este áudio.",
    };
  }
}
