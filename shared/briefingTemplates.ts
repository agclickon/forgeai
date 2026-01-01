export interface BriefingQuestion {
  id: string;
  field: string;
  question: string;
  placeholder: string;
  required: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  questions: BriefingQuestion[];
  suggestedStack?: string[];
}

export const briefingQuestions: Record<string, BriefingQuestion[]> = {
  common: [
    {
      id: "objective",
      field: "businessObjective",
      question: "Qual o objetivo principal deste projeto?",
      placeholder: "Descreva o problema que deseja resolver ou o objetivo de negócio...",
      required: true,
    },
    {
      id: "audience",
      field: "targetAudience",
      question: "Quem será o público-alvo?",
      placeholder: "Descreva quem vai usar o produto/serviço...",
      required: true,
    },
    {
      id: "deadline",
      field: "deadlineText",
      question: "Qual o prazo desejado para conclusão?",
      placeholder: "Ex: 3 meses, até março de 2025...",
      required: false,
    },
    {
      id: "budget",
      field: "budget",
      question: "Qual a faixa de orçamento disponível?",
      placeholder: "Ex: R$ 10.000 - R$ 30.000",
      required: false,
    },
  ],
  web: [
    {
      id: "web_type",
      field: "projectType",
      question: "Que tipo de site/sistema web você precisa?",
      placeholder: "Ex: e-commerce, institucional, sistema de gestão, SaaS...",
      required: true,
    },
    {
      id: "web_features",
      field: "desiredScope",
      question: "Quais funcionalidades principais o site deve ter?",
      placeholder: "Ex: cadastro de usuários, carrinho de compras, dashboard admin...",
      required: true,
    },
    {
      id: "web_integrations",
      field: "technicalRestrictions",
      question: "Precisa integrar com algum sistema existente?",
      placeholder: "Ex: ERP, gateway de pagamento, APIs externas...",
      required: false,
    },
    {
      id: "web_seo",
      field: "successCriteria",
      question: "Quais métricas de sucesso são importantes?",
      placeholder: "Ex: conversão de vendas, tempo de carregamento, ranking SEO...",
      required: false,
    },
  ],
  mobile: [
    {
      id: "mobile_platform",
      field: "projectType",
      question: "Para quais plataformas o app será desenvolvido?",
      placeholder: "iOS, Android ou ambos (multiplataforma)",
      required: true,
    },
    {
      id: "mobile_features",
      field: "desiredScope",
      question: "Quais funcionalidades principais o app deve ter?",
      placeholder: "Ex: login social, push notifications, GPS, camera...",
      required: true,
    },
    {
      id: "mobile_offline",
      field: "technicalRestrictions",
      question: "O app precisa funcionar offline?",
      placeholder: "Descreva requisitos de conectividade...",
      required: false,
    },
    {
      id: "mobile_monetization",
      field: "successCriteria",
      question: "Qual o modelo de monetização?",
      placeholder: "Ex: gratuito, freemium, assinatura, compras in-app...",
      required: false,
    },
  ],
  marketing: [
    {
      id: "mkt_goal",
      field: "projectType",
      question: "Qual o objetivo da campanha/projeto de marketing?",
      placeholder: "Ex: lançamento de produto, geração de leads, branding...",
      required: true,
    },
    {
      id: "mkt_channels",
      field: "desiredScope",
      question: "Quais canais de marketing serão utilizados?",
      placeholder: "Ex: redes sociais, email marketing, Google Ads, SEO...",
      required: true,
    },
    {
      id: "mkt_competition",
      field: "marketNiche",
      question: "Quem são os principais concorrentes?",
      placeholder: "Liste os concorrentes diretos e indiretos...",
      required: false,
    },
    {
      id: "mkt_kpis",
      field: "successCriteria",
      question: "Quais KPIs serão usados para medir sucesso?",
      placeholder: "Ex: CAC, ROI, taxa de conversão, engajamento...",
      required: true,
    },
  ],
  design: [
    {
      id: "design_type",
      field: "projectType",
      question: "Que tipo de design você precisa?",
      placeholder: "Ex: UI/UX, branding, identidade visual, apresentação...",
      required: true,
    },
    {
      id: "design_deliverables",
      field: "desiredScope",
      question: "Quais entregas são esperadas?",
      placeholder: "Ex: logotipo, manual de marca, protótipos, assets...",
      required: true,
    },
    {
      id: "design_references",
      field: "technicalRestrictions",
      question: "Tem referências visuais ou estilos preferidos?",
      placeholder: "Descreva estilos, cores, ou compartilhe links de inspiração...",
      required: false,
    },
    {
      id: "design_formats",
      field: "successCriteria",
      question: "Em quais formatos os arquivos devem ser entregues?",
      placeholder: "Ex: Figma, AI, PSD, PNG, SVG...",
      required: false,
    },
  ],
  consulting: [
    {
      id: "consult_area",
      field: "projectType",
      question: "Qual área precisa de consultoria?",
      placeholder: "Ex: tecnologia, processos, estratégia, transformação digital...",
      required: true,
    },
    {
      id: "consult_challenge",
      field: "desiredScope",
      question: "Quais são os principais desafios atuais?",
      placeholder: "Descreva os problemas ou gargalos que enfrenta...",
      required: true,
    },
    {
      id: "consult_team",
      field: "technicalRestrictions",
      question: "Qual o tamanho e estrutura da equipe envolvida?",
      placeholder: "Descreva a equipe que participará do projeto...",
      required: false,
    },
    {
      id: "consult_outcomes",
      field: "successCriteria",
      question: "Quais resultados espera alcançar?",
      placeholder: "Descreva os objetivos e métricas de sucesso...",
      required: true,
    },
  ],
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "web-saas",
    name: "Aplicação Web / SaaS",
    description: "Sistema web, plataforma SaaS, painel administrativo",
    icon: "Globe",
    category: "web",
    questions: [...briefingQuestions.common, ...briefingQuestions.web],
    suggestedStack: ["React", "Node.js", "PostgreSQL", "TypeScript"],
  },
  {
    id: "web-ecommerce",
    name: "E-commerce",
    description: "Loja virtual, marketplace, sistema de vendas online",
    icon: "ShoppingCart",
    category: "web",
    questions: [
      ...briefingQuestions.common,
      ...briefingQuestions.web,
      {
        id: "ecom_products",
        field: "marketNiche",
        question: "Quantos produtos/SKUs serão cadastrados inicialmente?",
        placeholder: "Ex: 50 produtos, 500 SKUs...",
        required: false,
      },
      {
        id: "ecom_payment",
        field: "compliance",
        question: "Quais formas de pagamento deve aceitar?",
        placeholder: "Ex: PIX, cartão de crédito, boleto, parcelamento...",
        required: true,
      },
    ],
    suggestedStack: ["React", "Node.js", "PostgreSQL", "Stripe"],
  },
  {
    id: "mobile-app",
    name: "Aplicativo Mobile",
    description: "App iOS, Android ou multiplataforma",
    icon: "Smartphone",
    category: "mobile",
    questions: [...briefingQuestions.common, ...briefingQuestions.mobile],
    suggestedStack: ["React Native", "Expo", "Firebase"],
  },
  {
    id: "landing-page",
    name: "Landing Page",
    description: "Pagina de captura, pagina de vendas, institucional",
    icon: "Layout",
    category: "web",
    questions: [
      ...briefingQuestions.common,
      {
        id: "lp_goal",
        field: "projectType",
        question: "Qual o objetivo principal da landing page?",
        placeholder: "Ex: captura de leads, venda de produto, apresentacao...",
        required: true,
      },
      {
        id: "lp_cta",
        field: "desiredScope",
        question: "Qual a acao principal que o visitante deve realizar?",
        placeholder: "Ex: preencher formulario, comprar, agendar reuniao...",
        required: true,
      },
      {
        id: "lp_traffic",
        field: "successCriteria",
        question: "De onde vira o trafego para a pagina?",
        placeholder: "Ex: Google Ads, Facebook Ads, organico, email...",
        required: false,
      },
    ],
    suggestedStack: ["React", "TailwindCSS"],
  },
  {
    id: "marketing-digital",
    name: "Marketing Digital",
    description: "Campanha de marketing, gestao de redes, trafego pago",
    icon: "Megaphone",
    category: "marketing",
    questions: [...briefingQuestions.common, ...briefingQuestions.marketing],
  },
  {
    id: "branding",
    name: "Branding & Identidade Visual",
    description: "Logo, manual de marca, identidade visual completa",
    icon: "Palette",
    category: "design",
    questions: [...briefingQuestions.common, ...briefingQuestions.design],
  },
  {
    id: "ui-ux",
    name: "UI/UX Design",
    description: "Design de interfaces, prototipos, user research",
    icon: "Figma",
    category: "design",
    questions: [
      ...briefingQuestions.common,
      ...briefingQuestions.design,
      {
        id: "ux_research",
        field: "technicalRestrictions",
        question: "Ja possui pesquisas com usuarios ou personas definidas?",
        placeholder: "Descreva pesquisas existentes ou se precisamos criar...",
        required: false,
      },
    ],
  },
  {
    id: "consulting",
    name: "Consultoria",
    description: "Consultoria tecnica, estrategica ou de processos",
    icon: "Lightbulb",
    category: "consulting",
    questions: [...briefingQuestions.common, ...briefingQuestions.consulting],
  },
  {
    id: "custom",
    name: "Projeto Personalizado",
    description: "Outro tipo de projeto nao listado acima",
    icon: "Puzzle",
    category: "custom",
    questions: [
      ...briefingQuestions.common,
      {
        id: "custom_type",
        field: "projectType",
        question: "Descreva o tipo de projeto que precisa",
        placeholder: "Explique detalhadamente o que voce precisa...",
        required: true,
      },
      {
        id: "custom_scope",
        field: "desiredScope",
        question: "Quais entregas sao esperadas?",
        placeholder: "Liste as entregas e resultados esperados...",
        required: true,
      },
      {
        id: "custom_requirements",
        field: "technicalRestrictions",
        question: "Ha requisitos tecnicos ou restricoes especificas?",
        placeholder: "Descreva requisitos, limitacoes ou preferencias...",
        required: false,
      },
    ],
  },
];

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return projectTemplates.find(t => t.id === id);
}

export function getQuestionsByCategory(category: string): BriefingQuestion[] {
  return briefingQuestions[category] || briefingQuestions.common;
}
