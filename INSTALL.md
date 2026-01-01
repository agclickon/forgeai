# Guia de Instalação e Configuração - ForgeAI

Este documento contém instruções detalhadas para instalação, configuração e operação da plataforma ForgeAI.

---

## Índice

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Instalação Local](#instalação-local)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Configuração de IA](#configuração-de-ia)
6. [Armazenamento de Arquivos](#armazenamento-de-arquivos)
7. [Execução da Aplicação](#execução-da-aplicação)
8. [Deploy em Produção](#deploy-em-produção)
9. [Solução de Problemas](#solução-de-problemas)
10. [Manutenção](#manutenção)

---

## Requisitos do Sistema

### Software Necessário

| Software | Versão Mínima | Recomendada |
|----------|---------------|-------------|
| Node.js | 18.x | 20.x |
| npm | 9.x | 10.x |
| PostgreSQL | 14.x | 16.x |

### Hardware Recomendado

- **CPU**: 2+ cores
- **RAM**: 4GB mínimo, 8GB recomendado
- **Armazenamento**: 10GB para aplicação e dependências

---

## Instalação Local

### 1. Clone o Repositório

```bash
git clone https://github.com/agclickon/forgeai.git
cd forgeai
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (veja seção [Variáveis de Ambiente](#variáveis-de-ambiente)).

### 4. Configure o Banco de Dados

```bash
npm run db:push
```

### 5. Inicie a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5000`.

---

## Configuração do Banco de Dados

### PostgreSQL Local

1. Instale o PostgreSQL no seu sistema
2. Crie um banco de dados:

```sql
CREATE DATABASE forgeai;
CREATE USER forgeai_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE forgeai TO forgeai_user;
```

3. Configure a variável `DATABASE_URL`:

```
DATABASE_URL=postgresql://forgeai_user:sua_senha_segura@localhost:5432/forgeai
```

### Supabase (Recomendado para Produção)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a Connection String do painel Settings > Database
4. Configure a variável `SUPABASE_DATABASE_URL`

**Importante**: A plataforma prioriza `SUPABASE_DATABASE_URL` sobre `DATABASE_URL`.

### Migrações do Banco

Para aplicar o esquema do banco de dados:

```bash
# Com DATABASE_URL padrão
npm run db:push

# Com Supabase
DATABASE_URL=$SUPABASE_DATABASE_URL npm run db:push
```

---

## Variáveis de Ambiente

### Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Segredo para criptografia de sessões (min. 32 caracteres) | `sua-chave-secreta-muito-longa-e-segura` |
| `ANTHROPIC_API_KEY` | Chave API da Anthropic para Claude | `sk-ant-...` |

### Variáveis Opcionais

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SUPABASE_DATABASE_URL` | URL Supabase (prioridade sobre DATABASE_URL) | - |
| `OPENAI_API_KEY` | Chave OpenAI para fallback GPT-4o | - |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | ID do bucket GCS | - |
| `RESEND_API_KEY` | Chave Resend para envio de emails | - |
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor | `5000` |

### Exemplo de Arquivo .env

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/forgeai
SUPABASE_DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Sessões
SESSION_SECRET=minha-chave-secreta-com-pelo-menos-32-caracteres-aqui

# Inteligência Artificial
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Armazenamento (opcional)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=meu-bucket-id

# Email (opcional)
RESEND_API_KEY=re_xxxxx
```

---

## Configuração de IA

### Modelo Primário: Claude (Anthropic)

A plataforma usa Claude Sonnet 4.5 como modelo principal para:
- Análise de briefings
- Geração de escopo
- Criação de WBS
- Documentação técnica
- Propostas comerciais

**Obtenha sua chave em**: [console.anthropic.com](https://console.anthropic.com)

### Modelo de Fallback: GPT-4o (OpenAI)

Caso o Claude falhe, a plataforma automaticamente usa GPT-4o.

**Obtenha sua chave em**: [platform.openai.com](https://platform.openai.com)

### Sistema de Fallback

O sistema implementa fallback automático:
1. Tenta Claude Sonnet 4.5
2. Se falhar, usa GPT-4o
3. Logs indicam qual modelo foi usado

---

## Armazenamento de Arquivos

### Google Cloud Storage (Produção)

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ative a API Cloud Storage
3. Crie um bucket
4. Configure credenciais de serviço
5. Defina `DEFAULT_OBJECT_STORAGE_BUCKET_ID`

### Replit Object Storage (Replit)

No ambiente Replit, o Object Storage é configurado automaticamente através das integrações.

### Estrutura de Diretórios

```
bucket/
├── public/           # Arquivos públicos (imagens, etc.)
└── .private/         # Arquivos privados (documentos de usuários)
```

---

## Execução da Aplicação

### Modo Desenvolvimento

```bash
npm run dev
```

Características:
- Hot reload automático
- Logs detalhados
- Servidor em `http://localhost:5000`

### Modo Produção

```bash
npm run build
npm start
```

---

## Deploy em Produção

### Replit (Recomendado)

1. Importe o repositório no Replit
2. Configure as variáveis de ambiente no painel Secrets
3. Clique em "Deploy"

### Outros Provedores

#### Railway/Render

1. Conecte o repositório GitHub
2. Configure as variáveis de ambiente
3. Use os comandos:
   - Build: `npm run build`
   - Start: `npm start`

#### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Checklist de Produção

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados PostgreSQL configurado
- [ ] Migrações aplicadas (`npm run db:push`)
- [ ] `SESSION_SECRET` único e seguro
- [ ] HTTPS habilitado
- [ ] Backup de banco de dados configurado
- [ ] Monitoramento de logs ativo

---

## Solução de Problemas

### Erro: "Database connection failed"

**Causa**: URL de conexão inválida ou banco inacessível.

**Solução**:
1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais na URL
3. Teste a conexão: `psql $DATABASE_URL`

### Erro: "Session secret required"

**Causa**: `SESSION_SECRET` não configurado.

**Solução**: Adicione a variável com pelo menos 32 caracteres.

### Erro: "AI integration failed"

**Causa**: Chave de API inválida ou limite excedido.

**Solução**:
1. Verifique `ANTHROPIC_API_KEY`
2. Confirme créditos disponíveis
3. Configure `OPENAI_API_KEY` como fallback

### Erro: "Cannot find module"

**Causa**: Dependências não instaladas.

**Solução**:
```bash
rm -rf node_modules
npm install
```

### Erros de Migração

**Causa**: Esquema do banco desatualizado.

**Solução**:
```bash
DATABASE_URL=$SUPABASE_DATABASE_URL npm run db:push
```

---

## Manutenção

### Backup do Banco de Dados

```bash
# Exportar
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Importar
psql $DATABASE_URL < backup_20241231.sql
```

### Atualização da Aplicação

```bash
git pull origin main
npm install
npm run db:push
npm run build
# Reinicie a aplicação
```

### Logs

Os logs são exibidos no console. Em produção, recomenda-se:
- Configurar um serviço de logging (Datadog, LogRocket)
- Manter logs por pelo menos 30 dias
- Monitorar erros de IA e banco de dados

### Limpeza de Cache

```bash
rm -rf .cache
rm -rf node_modules/.cache
```

---

## Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Consulte os logs de erro
3. Entre em contato com a equipe de desenvolvimento

---

## Changelog de Configuração

| Data | Versão | Alteração |
|------|--------|-----------|
| Dez/2024 | 1.0.0 | Versão inicial |
| Dez/2024 | 1.1.0 | Adicionado suporte a Claude como modelo primário |
| Dez/2024 | 1.2.0 | Integração com GitHub |
| Jan/2026 | 1.3.0 | Checkboxes na WBS para acompanhamento |

---

*Documento atualizado em Janeiro de 2026*
