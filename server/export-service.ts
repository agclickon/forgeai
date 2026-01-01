import archiver from "archiver";
import { PassThrough } from "stream";
import { storage } from "./storage";
import { generateProjectStructure, type ProjectStructure } from "./openai";
import type { Briefing, Scope, Roadmap, ProjectExport } from "@shared/schema";

export type ExportPlatform = "replit" | "github" | "gitlab" | "zip";
export type ExportStatus = "pending" | "generating" | "completed" | "failed";

export interface ExportResult {
  success: boolean;
  exportId: string;
  status: ExportStatus;
  zipBuffer?: Buffer;
  structure?: ProjectStructure;
  error?: string;
}

function generateAgentInstructions(
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null,
  roadmap: Roadmap | null,
  stack: string
): string {
  const briefingSection = briefing ? `
## Briefing do Projeto

**Objetivo de Negócio:** ${briefing.businessObjective || "Não definido"}

**Público Alvo:** ${briefing.targetAudience || "Não definido"}
  ` : "Briefing não disponível";

  const scopeSection = scope ? `
## Escopo Detalhado

**Objetivo:** ${scope.objective || "Não definido"}
  ` : "Escopo não disponível";

  const roadmapSection = roadmap ? `
## Roadmap do Projeto

**Disponível:** Verifique a aba 'Roadmap' na aplicação ForgeAI para detalhes das fases e milestones
  ` : "Roadmap não disponível";

  return `# Instruções para Agentes de IA - ${projectName}

Este arquivo contém contexto completo do projeto para auxiliar agentes de IA (Cursor, Devin, Windsurf, ChatGPT Dev) a entender e desenvolver o projeto.

## Informações do Projeto

**Nome:** ${projectName}
**Stack:** ${stack}
**Status:** Pronto para desenvolvimento

${briefingSection}

${scopeSection}

${roadmapSection}

## Instruções Principais para Agentes de IA

1. **Antes de Começar:**
   - Leia completamente este arquivo para entender o contexto
   - Revise o briefing e escopo do projeto
   - Consulte a aplicação ForgeAI para detalhes completos da roadmap

2. **Estrutura do Projeto:**
   - O projeto foi gerado automaticamente com código funcional
   - Todos os arquivos estão prontos para executar
   - O código segue as melhores práticas da indústria

3. **Como Iniciar Desenvolvimento:**
   - Execute \`npm install\` para instalar dependências
   - Execute \`npm run dev\` para iniciar o servidor de desenvolvimento
   - Acesse http://localhost:5000 no navegador (ou porta configurada)

4. **Estrutura de Diretórios:**
   - \`src/\` - Código fonte principal
   - \`public/\` - Arquivos públicos (imagens, fontes, etc)
   - \`package.json\` - Dependências e scripts
   - \`.env.example\` - Exemplo de variáveis de ambiente

5. **Desenvolvimento:**
   - Implemente novos recursos conforme o escopo e roadmap
   - Mantenha a estrutura de pastas consistente
   - Adicione testes quando apropriado
   - Siga as convenções de código do projeto
   - Faça commits descritivos

6. **Próximas Etapas:**
   - Comece com as funcionalidades da fase 1 do roadmap
   - Teste cada feature antes de considerar completa
   - Comunique-se com o time sobre progresso
   - Atualize documentação conforme necessário

---

*Gerado automaticamente pelo ForgeAI - Plataforma de Geração de Projetos*
`;
}

export async function createProjectExport(
  projectId: string,
  userId: string,
  platform: ExportPlatform,
  stack: string,
  projectName: string,
  briefing: Briefing | null,
  scope: Scope | null,
  roadmap: Roadmap | null
): Promise<ExportResult> {
  const exportName = `${projectName} - ${stack} Export`;
  const exportRecord = await storage.createProjectExport({
    projectId,
    userId,
    name: exportName,
    targetPlatform: platform,
    status: "pending",
    stack,
  });

  try {
    await storage.updateProjectExport(exportRecord.id, { status: "generating" });

    const structure = await generateProjectStructure(
      projectName,
      briefing,
      scope,
      roadmap,
      stack
    );

    const agentInstructions = generateAgentInstructions(projectName, briefing, scope, roadmap, stack);

    const allFiles = {
      ...structure.files,
      ...structure.configFiles,
      "README.md": structure.readmeContent,
      "package.json": JSON.stringify(structure.packageJson, null, 2),
      ".agent-instructions.md": agentInstructions,
    };

    await storage.updateProjectExport(exportRecord.id, {
      status: "completed",
      fileTree: structure.fileTree,
      files: allFiles,
      packageJson: structure.packageJson,
      configFiles: structure.configFiles,
    });

    return {
      success: true,
      exportId: exportRecord.id,
      status: "completed",
      structure,
    };
  } catch (error) {
    console.error("Export generation failed:", error);
    await storage.updateProjectExport(exportRecord.id, {
      status: "failed",
    });
    return {
      success: false,
      exportId: exportRecord.id,
      status: "failed",
      error: error instanceof Error ? error.message : "Falha na geração do export",
    };
  }
}

export async function generateZipFromExport(exportId: string): Promise<Buffer> {
  const exportData = await storage.getProjectExport(exportId);
  if (!exportData) {
    throw new Error("Export não encontrado");
  }

  if (exportData.status !== "completed") {
    throw new Error("Export ainda não foi concluído");
  }

  const files = exportData.files as Record<string, string> || {};
  
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);

    archive.pipe(passthrough);
    archive.on("error", reject);

    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath });
    }

    archive.finalize();
  });
}

export async function getExportStatus(exportId: string): Promise<ProjectExport | undefined> {
  return storage.getProjectExport(exportId);
}

export async function getProjectExports(projectId: string): Promise<ProjectExport[]> {
  return storage.getProjectExports(projectId);
}

export async function deleteExport(exportId: string): Promise<boolean> {
  return storage.deleteProjectExport(exportId);
}

export const SUPPORTED_STACKS = [
  { id: "react-vite", name: "React + Vite + TypeScript", icon: "react" },
  { id: "nextjs", name: "Next.js 14 + TypeScript", icon: "nextjs" },
  { id: "express", name: "Express.js + TypeScript", icon: "nodejs" },
  { id: "node", name: "Node.js + TypeScript", icon: "nodejs" },
  { id: "python-flask", name: "Python + Flask", icon: "python" },
  { id: "python-fastapi", name: "Python + FastAPI", icon: "python" },
];

export const EXPORT_PLATFORMS = [
  { id: "zip", name: "Download ZIP", icon: "download", description: "Baixar projeto como arquivo ZIP", available: true },
  { id: "github", name: "GitHub", icon: "github", description: "Criar repositório no GitHub", available: true },
  { id: "gitlab", name: "GitLab", icon: "gitlab", description: "Criar repositório no GitLab", available: true },
  { id: "replit", name: "Replit", icon: "replit", description: "Exportar para Replit (em breve)", available: false },
];

export interface GitHubExportResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

export async function exportToGitHub(
  exportId: string,
  token: string,
  repoName: string,
  isPrivate: boolean = false,
  description?: string
): Promise<GitHubExportResult> {
  const exportData = await storage.getProjectExport(exportId);
  if (!exportData || exportData.status !== "completed") {
    return { success: false, error: "Export não encontrado ou não concluído" };
  }

  const files = exportData.files as Record<string, string> || {};
  
  try {
    const createRepoResponse = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        description: description || `Projeto gerado pelo ForgeAI - ${exportData.stack}`,
        private: isPrivate,
        auto_init: true,
      }),
    });

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.json();
      return { success: false, error: error.message || "Falha ao criar repositório no GitHub" };
    }

    const repoData = await createRepoResponse.json();
    const owner = repoData.owner.login;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const errors: string[] = [];
    for (const [filePath, content] of Object.entries(files)) {
      const encodedContent = Buffer.from(content).toString("base64");
      
      const fileResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add ${filePath}`,
            content: encodedContent,
            branch: "main",
          }),
        }
      );

      if (!fileResponse.ok) {
        const errorData = await fileResponse.json().catch(() => ({}));
        errors.push(`${filePath}: ${errorData.message || 'upload failed'}`);
      }
    }

    if (errors.length > 0 && errors.length === Object.keys(files).length) {
      return { success: false, error: `Falha ao enviar arquivos: ${errors[0]}` };
    }

    await storage.updateProjectExport(exportId, {
      externalUrl: repoData.html_url,
    });

    return { success: true, repoUrl: repoData.html_url };
  } catch (error) {
    console.error("GitHub export error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao exportar para GitHub" };
  }
}

export async function exportToGitLab(
  exportId: string,
  token: string,
  repoName: string,
  isPrivate: boolean = false,
  description?: string
): Promise<GitHubExportResult> {
  const exportData = await storage.getProjectExport(exportId);
  if (!exportData || exportData.status !== "completed") {
    return { success: false, error: "Export não encontrado ou não concluído" };
  }

  const files = exportData.files as Record<string, string> || {};
  
  try {
    const createProjectResponse = await fetch("https://gitlab.com/api/v4/projects", {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        description: description || `Projeto gerado pelo ForgeAI - ${exportData.stack}`,
        visibility: isPrivate ? "private" : "public",
        initialize_with_readme: true,
        default_branch: "main",
      }),
    });

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.json();
      return { success: false, error: error.message || error.error || "Falha ao criar projeto no GitLab" };
    }

    const projectData = await createProjectResponse.json();
    const projectId = projectData.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const fileActions = Object.entries(files).map(([filePath, content]) => ({
      action: "create",
      file_path: filePath,
      content: content,
    }));

    const batchSize = 20;
    const errors: string[] = [];
    
    for (let i = 0; i < fileActions.length; i += batchSize) {
      const batch = fileActions.slice(i, i + batchSize);
      
      const commitResponse = await fetch(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`,
        {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branch: "main",
            commit_message: `Adiciona arquivos do projeto (lote ${Math.floor(i / batchSize) + 1})`,
            actions: batch,
          }),
        }
      );

      if (!commitResponse.ok) {
        const errorData = await commitResponse.json().catch(() => ({}));
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorData.message || errorData.error || 'commit failed'}`);
      }
    }

    if (errors.length > 0 && errors.length === Math.ceil(fileActions.length / batchSize)) {
      return { success: false, error: `Falha ao enviar arquivos: ${errors[0]}` };
    }

    await storage.updateProjectExport(exportId, {
      externalUrl: projectData.web_url,
    });

    return { success: true, repoUrl: projectData.web_url };
  } catch (error) {
    console.error("GitLab export error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro ao exportar para GitLab" };
  }
}
