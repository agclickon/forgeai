# ForgeAI - Plataforma de Gestão de Projetos com IA

Uma plataforma SaaS completa para transformar briefings de projetos em documentação estruturada e executável, potencializada por Inteligência Artificial.

## Visão Geral

ForgeAI é uma solução de gestão de projetos desenvolvida para agências digitais, consultorias, software houses e equipes de produto/tecnologia. A plataforma automatiza a criação de escopo, roadmaps, documentação técnica e propostas comerciais através de IA generativa.

## Funcionalidades Principais

### Gestão de Clientes e Projetos
- Cadastro e gestão de clientes com portal exclusivo
- Criação de projetos com templates pré-definidos
- Organização hierárquica: Cliente → Projeto → Briefing → Escopo → Roadmap

### Briefing Inteligente
- Coleta de requisitos via chat conversacional com IA
- Suporte a entrada de voz (reconhecimento de fala em pt-BR)
- Upload de documentos e referências visuais
- 9 templates de projeto (Web/SaaS, E-commerce, Mobile, Landing Page, etc.)
- Extração automática de estilos visuais de imagens de referência

### Geração Automatizada
- **Escopo do Projeto**: Objetivo, entregas, exclusões, premissas e dependências
- **WBS (Work Breakdown Structure)**: Decomposição hierárquica do trabalho com estimativas de horas
- **Roadmap**: Cronograma com fases, marcos e dependências
- **Diagramas**: Fluxos de processo e arquitetura técnica
- **Documentação**: Requisitos funcionais, técnicos e de segurança

### Propostas Comerciais
- Geração de propostas completas com IA
- Investimento detalhado por fase
- Termos e condições automáticos
- Exportação para Word (.docx)

### Acompanhamento de Projetos
- Dashboard com visão geral de todos os projetos
- Kanban para gestão de tarefas
- Timeline visual do projeto
- Histórico de atividades
- Checkboxes para acompanhamento de marcos da WBS

### Portal do Cliente
- Acesso exclusivo para clientes acompanharem seus projetos
- Visualização de progresso e documentos
- Sistema de feedback

## Tecnologias Utilizadas

### Frontend
- **React** com TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilização
- **Shadcn/ui** + Radix UI para componentes
- **TanStack Query** para gerenciamento de estado do servidor
- **Wouter** para roteamento

### Backend
- **Express.js** com TypeScript
- **Drizzle ORM** com PostgreSQL
- **Autenticação** baseada em sessões com bcrypt

### Inteligência Artificial
- **Claude Sonnet 4.5** (Anthropic) como modelo primário
- **GPT-4o** (OpenAI) como fallback automático
- Suporte completo a Português Brasileiro com acentuação correta

### Infraestrutura
- **PostgreSQL** como banco de dados principal
- **Google Cloud Storage** para armazenamento de arquivos
- Integração com **GitHub** para controle de versão

## Estrutura do Projeto

```
├── client/                 # Frontend React
│   └── src/
│       ├── components/     # Componentes UI (Shadcn/ui)
│       ├── pages/          # Páginas da aplicação
│       ├── hooks/          # Custom hooks
│       └── lib/            # Utilitários e configurações
├── server/                 # Backend Express
│   ├── routes.ts           # Definição de rotas API
│   ├── storage.ts          # Operações de banco de dados
│   ├── openai.ts           # Integrações de IA
│   └── proposal-service.ts # Serviço de propostas
└── shared/                 # Código compartilhado
    └── schema.ts           # Esquema do banco (Drizzle)
```

## Configuração

### Variáveis de Ambiente Necessárias

```env
DATABASE_URL=            # URL de conexão PostgreSQL
SESSION_SECRET=          # Segredo para criptografia de sessões
ANTHROPIC_API_KEY=       # Chave API da Anthropic (Claude)
```

### Variáveis Opcionais

```env
SUPABASE_DATABASE_URL=   # URL do Supabase (se usar)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=  # Bucket para armazenamento
```

## Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Compila para produção
npm run db:push      # Aplica migrações do Drizzle
```

## Fluxo de Trabalho

1. **Criar Cliente** - Cadastre informações do cliente
2. **Criar Projeto** - Selecione um template e inicie o briefing
3. **Briefing via Chat** - Converse com a IA para definir requisitos
4. **Gerar Escopo** - IA cria escopo estruturado automaticamente
5. **Gerar WBS** - Decomposição do trabalho com estimativas
6. **Gerar Proposta** - Documento comercial completo
7. **Exportar** - Baixe em Word ou outros formatos

## Recursos de IA

A plataforma utiliza IA para:

- Análise e estruturação de briefings
- Identificação de campos faltantes
- Geração de escopo detalhado
- Criação de WBS com estimativas realistas
- Cálculo automático de prazos (dias úteis)
- Análise de riscos e dependências
- Extração de estilos de imagens de referência
- Geração de documentação técnica
- Criação de termos e condições

## Suporte a Idiomas

Todo o conteúdo gerado por IA utiliza **Português Brasileiro** com acentuação correta (ç, ã, é, ô, etc.).

## Licença

Projeto proprietário - Todos os direitos reservados.

## Contato

Para mais informações, entre em contato com a equipe de desenvolvimento.
