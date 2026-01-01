import { storage } from "./storage";
import { callAIWithFallback } from "./openai";

export interface ProposalConfig {
  hourlyRate: number;
  companyName: string;
  companyDescription: string;
  defaultPaymentTerms: string;
  defaultTermsAndConditions: string;
  proposalValidity: number;
  hoursPerDay: number;
}

export interface RoadmapPhase {
  id?: string;
  name: string;
  estimatedHours?: number;
  description?: string;
  tasks?: { name: string; estimatedHours?: number }[];
}

export interface InvestmentPhase {
  name: string;
  hours: number;
  value: number;
  deliverables?: string[];
}

export interface InvestmentBreakdown {
  phases: InvestmentPhase[];
  totalHours: number;
  totalValue: number;
  hourlyRate: number;
}

export interface SchedulePhase {
  phaseId?: string;
  phaseName: string;
  startDate: string;
  endDate: string;
  hours: number;
  workingDays: number;
  milestones: string[];
}

export interface TechnicalInfo {
  stack: string[];
  architecture: string;
  integrations: string[];
  nonFunctionalRequirements: string[];
}

export interface ScopeSection {
  objective: string;
  features: string[];
  exclusions: string[];
}

export interface GeneratedProposalContent {
  executiveSummary: string;
  methodology: string;
  deliverables: { name: string; description: string }[];
  timeline: string;
  investmentBreakdown: InvestmentBreakdown;
  schedule: SchedulePhase[];
  technicalInfo: TechnicalInfo;
  paymentTerms: string;
  termsAndConditions: string;
  scopeSection: ScopeSection;
}

export async function getProposalConfig(): Promise<ProposalConfig> {
  const setting = await storage.getPlatformSetting("proposal_config");
  if (setting?.value) {
    const config = setting.value as any;
    return {
      hourlyRate: config.hourlyRate || 150,
      companyName: config.companyName || "",
      companyDescription: config.companyDescription || "",
      defaultPaymentTerms: config.defaultPaymentTerms || "50% na aprovação, 50% na entrega",
      defaultTermsAndConditions: config.defaultTermsAndConditions || "",
      proposalValidity: config.proposalValidity || 30,
      hoursPerDay: config.hoursPerDay || 8,
    };
  }
  
  return {
    hourlyRate: 150,
    companyName: "",
    companyDescription: "",
    defaultPaymentTerms: "50% na aprovação, 50% na entrega",
    defaultTermsAndConditions: "",
    proposalValidity: 30,
    hoursPerDay: 8,
  };
}

export function calculateInvestment(
  phases: RoadmapPhase[],
  hourlyRate: number
): InvestmentBreakdown {
  const phaseBreakdown = phases.map(phase => {
    // Use estimatedHours from phase first
    let hours = phase.estimatedHours || 0;
    
    // Only use task hours if they actually have hours defined
    if (phase.tasks && phase.tasks.length > 0) {
      const taskHours = phase.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      // Only override if tasks actually have hours defined
      if (taskHours > 0) {
        hours = taskHours;
      }
    }
    
    const deliverables = phase.tasks?.map(t => t.name) || [];
    
    return {
      name: phase.name,
      hours,
      value: hours * hourlyRate,
      deliverables,
    };
  });

  const totalHours = phaseBreakdown.reduce((sum, p) => sum + p.hours, 0);
  const totalValue = totalHours * hourlyRate;

  return {
    phases: phaseBreakdown,
    totalHours,
    totalValue,
    hourlyRate,
  };
}

export function calculateSchedule(
  phases: RoadmapPhase[],
  startDate: Date,
  hoursPerDay: number,
  endDate?: Date
): SchedulePhase[] {
  const schedule: SchedulePhase[] = [];
  
  // Calculate total hours and hours per phase
  const phasesWithHours = phases.map(phase => {
    let hours = phase.estimatedHours || 0;
    if (phase.tasks && phase.tasks.length > 0) {
      const taskHours = phase.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      if (taskHours > 0) {
        hours = taskHours;
      }
    }
    return { ...phase, calculatedHours: hours };
  });
  
  const totalHours = phasesWithHours.reduce((sum, p) => sum + p.calculatedHours, 0);
  
  // If endDate is provided, distribute phases within that period
  if (endDate && totalHours > 0) {
    // Count working days between start and end
    let totalWorkingDays = 0;
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalWorkingDays++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < phasesWithHours.length; i++) {
      const phase = phasesWithHours[i];
      const hours = phase.calculatedHours;
      
      // Distribute working days proportionally to hours
      const proportion = hours / totalHours;
      let workingDays = Math.max(1, Math.round(totalWorkingDays * proportion));
      
      // Ensure last phase ends on endDate
      if (i === phasesWithHours.length - 1) {
        const phaseStartDate = new Date(currentDate);
        schedule.push({
          phaseId: phase.id,
          phaseName: phase.name,
          startDate: phaseStartDate.toISOString(),
          endDate: endDate.toISOString(),
          hours,
          workingDays,
          milestones: phase.tasks?.slice(0, 3).map(t => t.name) || [`Conclusão de ${phase.name}`],
        });
      } else {
        const phaseStartDate = new Date(currentDate);
        
        // Add working days (skip weekends)
        let daysAdded = 0;
        while (daysAdded < workingDays) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
          }
        }
        
        schedule.push({
          phaseId: phase.id,
          phaseName: phase.name,
          startDate: phaseStartDate.toISOString(),
          endDate: currentDate.toISOString(),
          hours,
          workingDays,
          milestones: phase.tasks?.slice(0, 3).map(t => t.name) || [`Conclusão de ${phase.name}`],
        });
        
        // Move to next working day for next phase
        currentDate.setDate(currentDate.getDate() + 1);
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
  } else {
    // No endDate - calculate based on hours only
    let currentDate = new Date(startDate);
    
    for (const phase of phasesWithHours) {
      const hours = phase.calculatedHours;
      const workingDays = Math.ceil(hours / hoursPerDay);
      const phaseStartDate = new Date(currentDate);
      
      let daysAdded = 0;
      while (daysAdded < workingDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysAdded++;
        }
      }

      schedule.push({
        phaseId: phase.id,
        phaseName: phase.name,
        startDate: phaseStartDate.toISOString(),
        endDate: currentDate.toISOString(),
        hours,
        workingDays,
        milestones: phase.tasks?.slice(0, 3).map(t => t.name) || [`Conclusão de ${phase.name}`],
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return schedule;
}

export async function generateProposalContent(
  projectId: string,
  customHourlyRate?: number,
  customStartDate?: Date
): Promise<GeneratedProposalContent> {
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error("Projeto não encontrado");
  }

  const client = project.clientId ? await storage.getClient(project.clientId) : null;
  const briefing = await storage.getBriefing(projectId);
  const scope = await storage.getScope(projectId);
  const roadmap = await storage.getRoadmap(projectId);
  const wbs = await storage.getProjectWbs(projectId);
  const config = await getProposalConfig();

  const hourlyRate = customHourlyRate || config.hourlyRate;
  const startDate = customStartDate || (project.startDate ? new Date(project.startDate) : new Date());
  const endDate = project.estimatedEndDate ? new Date(project.estimatedEndDate) : undefined;

  // PRIORITY: Use WBS phases if available (they have accurate hours from scope planning)
  const wbsPhases = wbs?.phases as { name: string; description: string; estimatedHours: number; items?: { id: string; name: string; estimatedHours: number }[] }[] | undefined;
  const hasWbsData = wbsPhases && wbsPhases.length > 0;
  
  const roadmapPhases = roadmap?.phases as RoadmapPhase[] | undefined;
  const existingPhases: RoadmapPhase[] = roadmapPhases || [];
  const scopeDeliverables = Array.isArray(scope?.deliverables) ? scope.deliverables : [];
  const scopeOutOfScope = Array.isArray(scope?.outOfScope) ? scope.outOfScope : [];
  
  const projectContext = `
Projeto: ${project.name}
Cliente: ${client?.name || "Não especificado"}
Empresa do Cliente: ${client?.company || "Não especificada"}
Descrição: ${project.description || ""}
Categoria: ${project.category || ""}

Briefing:
- Tipo de Projeto: ${briefing?.projectType || "Não especificado"}
- Objetivo de Negócio: ${briefing?.businessObjective || "Não disponível"}
- Público-Alvo: ${briefing?.targetAudience || "Não especificado"}
- Stack Tecnológico: ${briefing?.stack || "A definir"}
- Critérios de Sucesso: ${briefing?.successCriteria || "Não especificados"}
- Restrições Técnicas: ${briefing?.technicalRestrictions || "Nenhuma"}
- Compliance: ${briefing?.compliance || "Não especificado"}

Escopo do Projeto:
- Objetivo: ${scope?.objective || project.description || "Desenvolver solução conforme requisitos"}
- Entregas Previstas: ${scopeDeliverables.slice(0, 10).map((d: any) => typeof d === 'string' ? d : d.name || d.title).join("; ") || "A serem definidas"}
- Fora do Escopo: ${scopeOutOfScope.map((d: any) => typeof d === 'string' ? d : d.name || d.title).join("; ") || "Não especificado"}

Fases do Roadmap Existentes:
${existingPhases.map(p => `- ${p.name}: ${p.description || ""}`).join("\n") || "Fases a serem definidas conforme complexidade do projeto"}

Empresa Prestadora: ${config.companyName || "Nossa equipe"}
Sobre a Empresa: ${config.companyDescription || "Somos especialistas em desenvolvimento de software e soluções digitais."}
`;

  const prompt = `Você é um especialista em propostas comerciais para projetos de tecnologia.
Com base no contexto do projeto abaixo, gere o conteúdo COMPLETO para uma proposta comercial profissional.

IMPORTANTE: 
- Use português brasileiro correto com acentuação adequada (ç, ã, é, ã, ô, etc.)
- Seja profissional, objetivo e convincente
- ESTIME HORAS REALISTAS para cada fase baseado na complexidade do projeto
- Para um projeto médio, considere entre 200-600 horas totais
- Para projetos complexos com muitas integrações, considere 600-1200 horas
- Distribua as horas proporcionalmente entre as fases

${projectContext}

Valor hora para cálculo: R$ ${hourlyRate}

Gere um JSON com a seguinte estrutura (PREENCHA TODOS OS CAMPOS COM DADOS REALISTAS):
{
  "executiveSummary": "Resumo executivo completo (3-4 parágrafos profissionais)",
  "methodology": "Metodologia de trabalho detalhada (ágil, sprints, comunicação, entregas)",
  "scopeSection": {
    "objective": "Objetivo principal do projeto em um parágrafo",
    "features": ["Lista de 5-10 funcionalidades principais que serão desenvolvidas"],
    "exclusions": ["Lista de 3-5 itens que NÃO estão incluídos no escopo"]
  },
  "deliverables": [
    { "name": "Nome da entrega", "description": "Descrição detalhada" }
  ],
  "phases": [
    { 
      "name": "Nome da Fase", 
      "estimatedHours": 40, 
      "description": "Descrição da fase",
      "deliverables": ["Lista de entregas desta fase"]
    }
  ],
  "timeline": "Descrição textual do cronograma geral",
  "technicalInfo": {
    "stack": ["Tecnologias que serão utilizadas"],
    "architecture": "Descrição da arquitetura proposta",
    "integrations": ["Integrações necessárias"],
    "nonFunctionalRequirements": ["Requisitos não-funcionais"]
  },
  "termsAndConditions": "Termos e condições completos incluindo: propriedade intelectual, confidencialidade, garantia, suporte pós-entrega, responsabilidades das partes, cancelamento, força maior. Mínimo 5 parágrafos."
}

ATENÇÃO: 
- O campo "phases" DEVE conter estimativas de horas REALISTAS (não zero!)
- O campo "termsAndConditions" DEVE ser preenchido com texto completo
- Todas as fases devem ter horas estimadas baseadas na complexidade

Responda APENAS com o JSON válido, sem texto adicional.`;

  const aiResponse = await callAIWithFallback(prompt);

  let generatedContent: {
    executiveSummary: string;
    methodology: string;
    scopeSection: ScopeSection;
    deliverables: { name: string; description: string }[];
    phases: { name: string; estimatedHours: number; description: string; deliverables: string[] }[];
    timeline: string;
    technicalInfo: TechnicalInfo;
    termsAndConditions: string;
  };

  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      generatedContent = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("JSON não encontrado na resposta");
    }
  } catch (e) {
    // Fallback content with realistic estimates
    const defaultPhases = [
      { name: "Iniciação e Planejamento", estimatedHours: 40, description: "Levantamento de requisitos e planejamento", deliverables: ["Documento de requisitos", "Plano de projeto"] },
      { name: "Design e Prototipação", estimatedHours: 60, description: "Design de interfaces e protótipos", deliverables: ["Wireframes", "Protótipo navegável", "Design system"] },
      { name: "Setup Técnico e Arquitetura", estimatedHours: 40, description: "Configuração de ambiente e arquitetura", deliverables: ["Ambiente configurado", "Arquitetura definida"] },
      { name: "Desenvolvimento Sprint 1", estimatedHours: 80, description: "Primeira fase de desenvolvimento", deliverables: ["Funcionalidades core", "APIs principais"] },
      { name: "Desenvolvimento Sprint 2", estimatedHours: 80, description: "Segunda fase de desenvolvimento", deliverables: ["Funcionalidades secundárias", "Integrações"] },
      { name: "Desenvolvimento Sprint 3", estimatedHours: 60, description: "Terceira fase de desenvolvimento", deliverables: ["Refinamentos", "Funcionalidades adicionais"] },
      { name: "Testes e Homologação", estimatedHours: 40, description: "Testes e ajustes finais", deliverables: ["Testes completos", "Correções", "Documentação"] },
      { name: "Deploy e Go-live", estimatedHours: 20, description: "Implantação em produção", deliverables: ["Sistema em produção", "Treinamento"] },
    ];
    
    generatedContent = {
      executiveSummary: `A ${config.companyName || "nossa equipe"} tem o prazer de apresentar esta proposta para o desenvolvimento do projeto ${project.name}.

Este documento detalha nossa abordagem técnica, metodologia de trabalho e investimento necessário para a execução bem-sucedida do projeto. Nossa proposta foi elaborada com base na análise detalhada dos requisitos e necessidades apresentados.

Estamos comprometidos em entregar uma solução de alta qualidade que atenda às expectativas do ${client?.name || "cliente"} e contribua significativamente para os objetivos de negócio definidos.`,
      methodology: `Utilizamos metodologias ágeis com entregas incrementais, garantindo transparência e flexibilidade ao longo do desenvolvimento.

O projeto será dividido em sprints com entregas frequentes, permitindo validação contínua e ajustes conforme necessário. Realizamos reuniões semanais de acompanhamento e disponibilizamos relatórios de progresso.

Nossa abordagem prioriza a comunicação clara e o alinhamento constante com as expectativas do cliente.`,
      scopeSection: {
        objective: scope?.objective || project.description || "Desenvolver solução digital conforme requisitos do cliente",
        features: scopeDeliverables.slice(0, 10).map((f: any) => typeof f === 'string' ? f : f.name || f.title || String(f)) || ["Funcionalidades a serem definidas"],
        exclusions: scopeOutOfScope.length > 0 
          ? scopeOutOfScope.map((d: any) => typeof d === 'string' ? d : d.name || String(d))
          : ["Manutenção após período de garantia", "Conteúdo e textos do sistema", "Hospedagem e domínio"],
      },
      deliverables: defaultPhases.map(p => ({
        name: p.name,
        description: p.description,
      })),
      phases: defaultPhases,
      timeline: `O projeto está estimado em aproximadamente 420 horas de desenvolvimento, distribuídas em 8 fases principais. A previsão de início é ${startDate.toLocaleDateString("pt-BR")} com conclusão estimada em aproximadamente 3-4 meses.`,
      technicalInfo: {
        stack: briefing?.stack?.split(",").map((s: string) => s.trim()) || ["React", "Node.js", "PostgreSQL", "TypeScript"],
        architecture: "Arquitetura moderna com separação de responsabilidades entre frontend e backend",
        integrations: ["A definir conforme requisitos"],
        nonFunctionalRequirements: [
          "Performance otimizada para carregamento rápido",
          "Segurança com autenticação e autorização robustas",
          "Responsividade para dispositivos móveis",
          "Código documentado e de fácil manutenção",
        ],
      },
      termsAndConditions: generateDefaultTerms(config.companyName || "a empresa"),
    };
  }

  // PRIORITY: Use WBS phases if available (accurate hours from scope planning)
  // Only fallback to AI-generated phases if no WBS exists
  let phasesWithHours: RoadmapPhase[];
  
  if (hasWbsData && wbsPhases) {
    // Use WBS data - this is the accurate source of hours
    // WBSItem has 'title' not 'name', and also has 'deliverables' array
    phasesWithHours = wbsPhases.map(wbsPhase => ({
      name: wbsPhase.name,
      estimatedHours: wbsPhase.estimatedHours || 0,
      description: wbsPhase.description,
      tasks: wbsPhase.items?.map((item: any) => ({
        name: item.title || item.name || "Tarefa",
        estimatedHours: item.estimatedHours || 0,
      })) || [],
    }));
    console.log(`[Proposal] Using WBS phases: ${wbsPhases.length} phases, total ${wbs?.totalEstimatedHours || 0}h`);
  } else {
    // Fallback to AI-generated phases
    phasesWithHours = generatedContent.phases?.map(p => ({
      name: p.name,
      estimatedHours: p.estimatedHours || 40,
      description: p.description,
      tasks: p.deliverables?.map(d => ({ name: d, estimatedHours: 0 })) || [],
    })) || existingPhases;
    console.log(`[Proposal] No WBS found, using AI-generated phases: ${phasesWithHours.length} phases`);
  }

  // Calculate investment and schedule with real hours from WBS or AI
  const investmentBreakdown = calculateInvestment(phasesWithHours, hourlyRate);
  const schedule = calculateSchedule(phasesWithHours, startDate, config.hoursPerDay, endDate);

  return {
    executiveSummary: generatedContent.executiveSummary,
    methodology: generatedContent.methodology,
    deliverables: generatedContent.deliverables,
    timeline: generatedContent.timeline,
    investmentBreakdown,
    schedule,
    technicalInfo: generatedContent.technicalInfo,
    paymentTerms: config.defaultPaymentTerms,
    termsAndConditions: generatedContent.termsAndConditions || generateDefaultTerms(config.companyName || "a empresa"),
    scopeSection: generatedContent.scopeSection,
  };
}

function generateDefaultTerms(companyName: string): string {
  return `1. PROPRIEDADE INTELECTUAL
Todo o código-fonte, designs, documentação e demais materiais desenvolvidos durante a execução deste projeto serão de propriedade exclusiva do CONTRATANTE após a quitação integral do investimento. ${companyName} poderá utilizar o projeto como referência em seu portfólio, desde que não divulgue informações confidenciais.

2. CONFIDENCIALIDADE
As partes se comprometem a manter sigilo sobre todas as informações confidenciais compartilhadas durante a execução do projeto. Esta obrigação permanece válida por 2 (dois) anos após a conclusão ou rescisão do contrato.

3. GARANTIA E SUPORTE
${companyName} oferece garantia de 90 (noventa) dias após a entrega final para correção de bugs e ajustes menores. O suporte técnico durante este período está incluso no investimento. Após o período de garantia, serviços adicionais serão cobrados conforme tabela de valores vigente.

4. RESPONSABILIDADES DAS PARTES
O CONTRATANTE é responsável por fornecer informações, conteúdos, acessos e aprovações necessárias dentro dos prazos acordados. Atrasos por parte do CONTRATANTE podem impactar o cronograma e gerar custos adicionais. ${companyName} é responsável pela qualidade técnica das entregas e pelo cumprimento dos prazos acordados.

5. CANCELAMENTO E RESCISÃO
Em caso de cancelamento por parte do CONTRATANTE, serão cobradas as horas trabalhadas até a data de cancelamento mais 20% sobre o valor restante do projeto. Em caso de rescisão por parte de ${companyName}, será realizado o reembolso proporcional das horas não trabalhadas.

6. FORÇA MAIOR
Nenhuma das partes será responsável por atrasos ou falhas no cumprimento de suas obrigações quando causados por eventos de força maior, incluindo, mas não limitado a: desastres naturais, pandemias, greves, guerras ou atos governamentais.

7. ALTERAÇÕES DE ESCOPO
Solicitações de alteração de escopo após aprovação desta proposta serão analisadas e orçadas separadamente. Alterações significativas podem impactar o cronograma e o investimento total do projeto.`;
}

export function recalculateInvestment(
  currentInvestment: InvestmentBreakdown,
  newHourlyRate: number
): InvestmentBreakdown {
  const phases = currentInvestment.phases.map(phase => ({
    ...phase,
    value: phase.hours * newHourlyRate,
  }));

  const totalValue = phases.reduce((sum, p) => sum + p.value, 0);

  return {
    phases,
    totalHours: currentInvestment.totalHours,
    totalValue,
    hourlyRate: newHourlyRate,
  };
}

export function recalculateSchedule(
  phases: InvestmentPhase[],
  startDate: Date,
  hoursPerDay: number
): SchedulePhase[] {
  let currentDate = new Date(startDate);
  const schedule: SchedulePhase[] = [];

  for (const phase of phases) {
    const workingDays = Math.ceil(phase.hours / hoursPerDay);
    const phaseStartDate = new Date(currentDate);
    
    let daysAdded = 0;
    while (daysAdded < workingDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    schedule.push({
      phaseName: phase.name,
      startDate: phaseStartDate.toISOString(),
      endDate: currentDate.toISOString(),
      hours: phase.hours,
      workingDays,
      milestones: phase.deliverables?.slice(0, 3) || [`Conclusão de ${phase.name}`],
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedule;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
