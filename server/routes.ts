import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, AuthenticatedRequest } from "./auth";
import { registerObjectStorageRoutes, objectStorageService } from "./replit_integrations/object_storage";
import { sendInviteEmail } from "./email";
import {
  analyzeBriefingMessage,
  generateScope,
  generateRoadmap,
  generateChecklists,
  generateAiCommand,
  generateTechnicalDoc,
  generateArchitectureDoc,
  generateApiDoc,
  generateInstallGuide,
  generateStylesGuide,
  generateRequirements,
  generateUserGuide,
  generateTestingStrategy,
  extractTextFromDocument,
  runSpecializedAgent,
  runSpecializedAgentAnalysis,
  runOrchestratedAnalysis,
  generateStageTasks,
  analyzeImageForStyles,
  transcribeAudio,
  type SpecializedAgentType,
} from "./openai";

// Simple in-memory token store for portal sessions
const portalTokens = new Map<string, { clientId: string; expiresAt: Date }>();

function generatePortalToken(clientId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  portalTokens.set(token, { clientId, expiresAt });
  return token;
}

function validatePortalToken(token: string): string | null {
  const session = portalTokens.get(token);
  if (!session) return null;
  if (new Date() > session.expiresAt) {
    portalTokens.delete(token);
    return null;
  }
  return session.clientId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Register object storage routes with authentication
  registerObjectStorageRoutes(app, isAuthenticated);

  // Client routes
  app.get("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clients = await storage.getClients(userId);
      // Remove password hashes from response
      const safeClients = clients.map(({ portalPassword: _, ...c }) => c);
      res.json(safeClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      // Remove password hash from response
      const { portalPassword: _, ...safeClient } = client;
      res.json(safeClient);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientData = { ...req.body, userId };
      
      // Hash portal password if provided
      if (clientData.portalPassword && clientData.hasPortalAccess) {
        const bcrypt = require('bcrypt');
        clientData.portalPassword = await bcrypt.hash(clientData.portalPassword, 10);
      } else {
        delete clientData.portalPassword;
      }
      
      // Clean document number (remove formatting)
      if (clientData.document) {
        clientData.document = clientData.document.replace(/\D/g, '');
      }
      
      const client = await storage.createClient(clientData);
      // Don't return password hash
      const { portalPassword: _, ...safeClient } = client;
      res.status(201).json(safeClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const clientData = { ...req.body };
      
      // Hash portal password if provided and not empty
      if (clientData.portalPassword && clientData.hasPortalAccess) {
        const bcrypt = require('bcrypt');
        clientData.portalPassword = await bcrypt.hash(clientData.portalPassword, 10);
      } else {
        // Don't update password if not provided
        delete clientData.portalPassword;
      }
      
      // Clean document number (remove formatting)
      if (clientData.document) {
        clientData.document = clientData.document.replace(/\D/g, '');
      }
      
      const client = await storage.updateClient(req.params.id, clientData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      // Don't return password hash
      const { portalPassword: _, ...safeClient } = client;
      res.json(safeClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client feedback routes
  app.get("/api/clients/:id/feedbacks", isAuthenticated, async (req: any, res) => {
    try {
      const feedbacks = await storage.getClientFeedbacks(req.params.id);
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching client feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch client feedbacks" });
    }
  });

  app.get("/api/feedbacks", isAuthenticated, async (req: any, res) => {
    try {
      const feedbacks = await storage.getAllClientFeedbacks();
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching all feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  });

  app.get("/api/feedbacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const feedback = await storage.getClientFeedback(req.params.id);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post("/api/feedbacks", async (req: any, res) => {
    try {
      const feedback = await storage.createClientFeedback(req.body);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.put("/api/feedbacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updateData = { ...req.body };
      
      // If marking as reviewed, add reviewer info
      if (updateData.status === 'reviewed' || updateData.status === 'resolved') {
        updateData.reviewedBy = userId;
        updateData.reviewedAt = new Date();
      }
      
      const feedback = await storage.updateClientFeedback(req.params.id, updateData);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.delete("/api/feedbacks/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteClientFeedback(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Client portal routes
  app.post("/api/portal/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const client = await storage.getClientByPortalEmail(email);
      
      if (!client || !client.hasPortalAccess || !client.portalPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      const isValid = await bcrypt.compare(password, client.portalPassword);
      
      if (!isValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      await storage.updateClientPortalLastLogin(client.id);
      
      // Generate portal session token
      const token = generatePortalToken(client.id);
      
      // Return client data without password, with token
      const { portalPassword: _, ...clientData } = client;
      res.json({ client: clientData, token });
    } catch (error) {
      console.error("Error during portal login:", error);
      res.status(500).json({ message: "Falha ao realizar login" });
    }
  });

  app.get("/api/portal/projects", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Token de autenticação necessário" });
      }
      
      const token = authHeader.substring(7);
      const clientId = validatePortalToken(token);
      
      if (!clientId) {
        return res.status(401).json({ message: "Token inválido ou expirado" });
      }
      
      const projects = await storage.getProjectsByClient(clientId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching client projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/portal/project/:projectId", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Token de autenticação necessário" });
      }
      
      const token = authHeader.substring(7);
      const clientId = validatePortalToken(token);
      
      if (!clientId) {
        return res.status(401).json({ message: "Token inválido ou expirado" });
      }
      
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Verify project belongs to authenticated client
      if (project.clientId !== clientId) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      // Get related data for read-only view
      const [briefing, scope, roadmap, stages] = await Promise.all([
        storage.getBriefing(projectId),
        storage.getScope(projectId),
        storage.getRoadmap(projectId),
        storage.getStages(projectId)
      ]);
      
      res.json({ project, briefing, scope, roadmap, stages });
    } catch (error) {
      console.error("Error fetching project for portal:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Portal feedback submission (authenticated with portal token)
  app.post("/api/portal/feedbacks", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Token de autenticação necessário" });
      }
      
      const token = authHeader.substring(7);
      const clientId = validatePortalToken(token);
      
      if (!clientId) {
        return res.status(401).json({ message: "Token inválido ou expirado" });
      }
      
      // Ensure the feedback is for this client
      const feedbackData = {
        ...req.body,
        clientId // Override with authenticated client ID
      };
      
      const feedback = await storage.createClientFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating portal feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.createProject({
        ...req.body,
        userId,
        status: "briefing",
        progress: 0,
      });

      // Create empty briefing
      await storage.createBriefing({
        projectId: project.id,
        status: "incomplete",
        conversation: [],
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updateData = { ...req.body };
      
      // Convert date strings to Date objects for PostgreSQL
      if (updateData.startDate !== undefined) {
        updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
      }
      if (updateData.estimatedEndDate !== undefined) {
        updateData.estimatedEndDate = updateData.estimatedEndDate ? new Date(updateData.estimatedEndDate) : null;
      }
      
      const project = await storage.updateProject(req.params.id, updateData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Briefing routes
  app.get("/api/projects/:id/briefing", isAuthenticated, async (req: any, res) => {
    try {
      const briefing = await storage.getBriefing(req.params.id);
      res.json(briefing || null);
    } catch (error) {
      console.error("Error fetching briefing:", error);
      res.status(500).json({ message: "Failed to fetch briefing" });
    }
  });

  app.patch("/api/projects/:id/briefing", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      let briefing = await storage.getBriefing(projectId);
      
      if (!briefing) {
        briefing = await storage.createBriefing({
          projectId,
          status: "in_progress",
          conversation: [],
        });
      }

      const updateData = { ...req.body };
      if (updateData.deadline && typeof updateData.deadline === 'string') {
        updateData.deadline = new Date(updateData.deadline);
      }

      const updatedBriefing = await storage.updateBriefing(projectId, updateData);
      res.json(updatedBriefing);
    } catch (error) {
      console.error("Error updating briefing:", error);
      res.status(500).json({ message: "Failed to update briefing" });
    }
  });

  app.post("/api/projects/:id/briefing/chat", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { message } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      let briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        briefing = await storage.createBriefing({
          projectId,
          status: "in_progress",
          conversation: [],
        });
      }

      const conversation = [...((briefing.conversation as any[]) || [])];
      conversation.push({ role: "user", content: message });

      // Check if user is asking for suggestions based on agent analysis
      const lowerMessage = message.toLowerCase();
      const isSuggestionRequest = lowerMessage.includes("sugest") || 
        lowerMessage.includes("recomenda") || 
        lowerMessage.includes("análise") ||
        lowerMessage.includes("analise") ||
        lowerMessage.includes("agente") ||
        lowerMessage.includes("melhoria") ||
        lowerMessage.includes("o que falta") ||
        lowerMessage.includes("atualizar projeto") ||
        lowerMessage.includes("aplicar") ||
        lowerMessage.includes("sim, pode") ||
        lowerMessage.includes("pode atualizar") ||
        lowerMessage.includes("atualize");

      // Fetch agent analyses if user is asking for suggestions
      let agentAnalyses: any[] = [];
      let scope: any = null;
      let roadmap: any = null;
      if (isSuggestionRequest) {
        agentAnalyses = await storage.getAgentAnalyses(projectId);
        scope = await storage.getScope(projectId);
        roadmap = await storage.getRoadmap(projectId);
      }

      // Analyze with AI
      const analysis = await analyzeBriefingMessage(
        project.name,
        conversation,
        briefing,
        isSuggestionRequest ? { agentAnalyses, scope, roadmap, briefing } : undefined
      );

      // Update briefing with extracted data
      const updateData: any = {
        conversation,
        status: analysis.isReadyToFinalize ? "ready_to_finalize" : "in_progress",
        currentField: analysis.currentField || null,
      };

      if (analysis.projectType) updateData.projectType = analysis.projectType;
      if (analysis.businessObjective) updateData.businessObjective = analysis.businessObjective;
      if (analysis.targetAudience) updateData.targetAudience = analysis.targetAudience;
      if (analysis.marketNiche) updateData.marketNiche = analysis.marketNiche;
      if (analysis.desiredScope) updateData.desiredScope = analysis.desiredScope;
      if (analysis.successCriteria) updateData.successCriteria = analysis.successCriteria;
      if (analysis.stack) updateData.stack = analysis.stack;
      if (analysis.deadlineText) {
        updateData.deadlineText = analysis.deadlineText;
        const deadlineMatch = analysis.deadlineText.match(/(\d+)\s*(dias?|semanas?|meses?)/i);
        if (deadlineMatch) {
          const num = parseInt(deadlineMatch[1]);
          const unit = deadlineMatch[2].toLowerCase();
          const deadline = new Date();
          if (unit.startsWith("dia")) deadline.setDate(deadline.getDate() + num);
          else if (unit.startsWith("semana")) deadline.setDate(deadline.getDate() + num * 7);
          else if (unit.startsWith("mes")) deadline.setMonth(deadline.getMonth() + num);
          updateData.deadline = deadline;
        }
      }
      if (analysis.budget) updateData.budget = analysis.budget;
      if (analysis.technicalRestrictions) updateData.technicalRestrictions = analysis.technicalRestrictions;
      if (analysis.compliance) updateData.compliance = analysis.compliance;

      // Add AI response to conversation with finalization flag
      updateData.conversation = [
        ...conversation,
        { 
          role: "assistant", 
          content: analysis.nextQuestion,
          isReadyToFinalize: analysis.isReadyToFinalize || false
        },
      ];

      const updatedBriefing = await storage.updateBriefing(projectId, updateData);

      res.json(updatedBriefing);
    } catch (error) {
      console.error("Error processing briefing chat:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Process uploaded document for briefing
  app.post("/api/projects/:id/briefing/document", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { filename, objectPath } = req.body;

      // Validate input
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ message: "Filename is required" });
      }
      if (!objectPath || typeof objectPath !== "string") {
        return res.status(400).json({ message: "Object path is required" });
      }

      // Security: Validate objectPath format to prevent path traversal
      // Only allow paths that start with .private/ (our private upload directory)
      if (!objectPath.startsWith(".private/")) {
        return res.status(400).json({ message: "Invalid object path" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify user owns this project
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch file content from object storage
      let content: string;
      try {
        const fileBuffer = await objectStorageService.getFileContent(objectPath);
        content = fileBuffer.toString("utf-8");
        
        // Limit content size (50KB)
        const maxContentLength = 50000;
        if (content.length > maxContentLength) {
          content = content.substring(0, maxContentLength) + "\n\n[Conteudo truncado...]";
        }
      } catch (storageError) {
        console.error("Error fetching file from storage:", storageError);
        return res.status(400).json({ message: "Failed to read uploaded file" });
      }

      let briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        briefing = await storage.createBriefing({
          projectId,
          status: "in_progress",
          conversation: [],
        });
      }

      // Extract information from document using AI
      const extractedInfo = await extractTextFromDocument(content, filename);

      // Add document content as a user message
      const conversation = [...((briefing.conversation as any[]) || [])];
      conversation.push({
        role: "user",
        content: `[Documento enviado: ${filename}]\n\n${extractedInfo}`,
      });

      // Analyze with AI
      const analysis = await analyzeBriefingMessage(
        project.name,
        conversation,
        briefing
      );

      // Update briefing with extracted data
      const updateData: any = {
        conversation,
        status: analysis.isReadyToFinalize ? "ready_to_finalize" : "in_progress",
        rawInput: extractedInfo,
        currentField: analysis.currentField || null,
      };

      if (analysis.projectType) updateData.projectType = analysis.projectType;
      if (analysis.businessObjective) updateData.businessObjective = analysis.businessObjective;
      if (analysis.targetAudience) updateData.targetAudience = analysis.targetAudience;
      if (analysis.marketNiche) updateData.marketNiche = analysis.marketNiche;
      if (analysis.desiredScope) updateData.desiredScope = analysis.desiredScope;
      if (analysis.successCriteria) updateData.successCriteria = analysis.successCriteria;
      if (analysis.stack) updateData.stack = analysis.stack;
      if (analysis.deadlineText) {
        updateData.deadlineText = analysis.deadlineText;
        const deadlineMatch = analysis.deadlineText.match(/(\d+)\s*(dias?|semanas?|meses?)/i);
        if (deadlineMatch) {
          const num = parseInt(deadlineMatch[1]);
          const unit = deadlineMatch[2].toLowerCase();
          const deadline = new Date();
          if (unit.startsWith("dia")) deadline.setDate(deadline.getDate() + num);
          else if (unit.startsWith("semana")) deadline.setDate(deadline.getDate() + num * 7);
          else if (unit.startsWith("mes")) deadline.setMonth(deadline.getMonth() + num);
          updateData.deadline = deadline;
        }
      }
      if (analysis.budget) updateData.budget = analysis.budget;

      // Add AI response with finalization flag
      updateData.conversation = [
        ...conversation,
        { 
          role: "assistant", 
          content: analysis.nextQuestion,
          isReadyToFinalize: analysis.isReadyToFinalize || false
        },
      ];

      const updatedBriefing = await storage.updateBriefing(projectId, updateData);
      res.json(updatedBriefing);
    } catch (error) {
      console.error("Error processing document:", error);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // Upload image reference for visual identity
  app.post("/api/projects/:id/briefing/image-reference", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { filename, objectPath, mimeType } = req.body;

      if (!filename || !objectPath) {
        return res.status(400).json({ message: "Filename and objectPath are required" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        briefing = await storage.createBriefing({
          projectId,
          status: "in_progress",
          conversation: [],
        });
      }

      const currentReferences = (briefing.visualReferences as any[]) || [];
      const newReference: any = {
        id: `ref-${Date.now()}`,
        filename,
        objectPath,
        mimeType: mimeType || "image/png",
        uploadedAt: new Date().toISOString(),
      };

      // Analyze image for styles using AI vision
      let extractedStyles = null;
      try {
        const imageBuffer = await objectStorageService.getFileContent(objectPath, 10 * 1024 * 1024); // 10MB max
        const imageBase64 = imageBuffer.toString("base64");
        const imageMimeType = mimeType || "image/png";
        
        extractedStyles = await analyzeImageForStyles(imageBase64, imageMimeType);
        newReference.extractedStyles = extractedStyles;
        newReference.styleDescription = extractedStyles.styleDescription;
      } catch (styleError) {
        console.warn("Could not analyze image for styles:", styleError);
      }

      // Update briefing with new reference
      const updateData: any = {
        visualReferences: [...currentReferences, newReference],
      };

      // If styles were extracted, also update visualIdentity
      if (extractedStyles) {
        const currentVisualIdentity = (briefing.visualIdentity as any) || {};
        updateData.visualIdentity = {
          ...currentVisualIdentity,
          extractedFromImage: true,
          imageRef: newReference.id,
          styles: extractedStyles,
          styleDescription: extractedStyles.styleDescription,
        };
      }

      const updatedBriefing = await storage.updateBriefing(projectId, updateData);

      res.json({
        briefing: updatedBriefing,
        extractedStyles,
        message: extractedStyles 
          ? "Imagem analisada com sucesso. Estilos extraídos automaticamente."
          : "Imagem adicionada. Não foi possível extrair estilos automaticamente.",
      });
    } catch (error) {
      console.error("Error uploading image reference:", error);
      res.status(500).json({ message: "Failed to upload image reference" });
    }
  });

  // Delete image reference
  app.delete("/api/projects/:id/briefing/image-reference/:refId", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, refId } = req.params;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        return res.status(404).json({ message: "Briefing not found" });
      }

      const currentReferences = (briefing.visualReferences as any[]) || [];
      const updatedReferences = currentReferences.filter((ref: any) => ref.id !== refId);

      const updatedBriefing = await storage.updateBriefing(projectId, {
        visualReferences: updatedReferences,
      });

      res.json(updatedBriefing);
    } catch (error) {
      console.error("Error deleting image reference:", error);
      res.status(500).json({ message: "Failed to delete image reference" });
    }
  });

  // Upload audio recording for briefing
  app.post("/api/projects/:id/briefing/audio", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { filename, data, contentType } = req.body;
      
      if (!filename || !data) {
        return res.status(400).json({ message: "Filename and data are required" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Decode base64 audio data
      const audioData = Buffer.from(data, 'base64');
      
      if (audioData.length === 0) {
        return res.status(400).json({ message: "No audio data received" });
      }
      
      // Limit file size to 50MB
      if (audioData.length > 50 * 1024 * 1024) {
        return res.status(400).json({ message: "Audio file too large. Maximum size is 50MB." });
      }

      // Upload to object storage - use unique filename with projectId prefix
      const uniqueFilename = `${projectId}-${filename}`;
      const uploadResult = await objectStorageService.uploadFile(
        uniqueFilename,
        audioData,
        contentType || 'audio/webm',
        true
      );

      // Transcribe audio using AI
      let transcriptionResult = { transcription: "", title: "Áudio", preview: "" };
      try {
        transcriptionResult = await transcribeAudio(audioData, contentType || 'audio/webm');
      } catch (transcribeError) {
        console.warn("Transcription failed, continuing with upload:", transcribeError);
      }

      // Create or get briefing atomically
      let briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        briefing = await storage.createBriefing({
          projectId,
          status: "in_progress",
          conversation: [],
        });
      }

      const audioUrl = `/api/files/${uploadResult.objectPath}`;
      const audioId = `audio-${Date.now()}`;
      
      // Fetch fresh briefing to avoid race conditions
      const freshBriefing = await storage.getBriefing(projectId);
      const currentAudioRecordings = (freshBriefing?.audioRecordings as any[]) || [];
      
      const newAudioRecord = {
        id: audioId,
        filename,
        objectPath: uploadResult.objectPath,
        uploadedAt: new Date().toISOString(),
        audioUrl,
        title: transcriptionResult.title,
        transcription: transcriptionResult.transcription,
        transcriptionPreview: transcriptionResult.preview,
      };
      
      await storage.updateBriefing(projectId, {
        audioRecordings: [...currentAudioRecordings, newAudioRecord],
      });

      res.json({ 
        audioUrl,
        audioId,
        title: transcriptionResult.title,
        transcriptionPreview: transcriptionResult.preview,
        message: "Áudio salvo e transcrito com sucesso" 
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ message: "Failed to upload audio" });
    }
  });

  // Delete audio recording (single or all)
  app.delete("/api/projects/:id/briefing/audio", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const audioId = req.query.audioId as string | undefined;
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        return res.status(404).json({ message: "Briefing not found" });
      }

      const audioRecordings = (briefing.audioRecordings as any[]) || [];
      
      if (audioId) {
        // Delete a specific audio recording
        const recordingToDelete = audioRecordings.find(r => r.id === audioId);
        if (recordingToDelete) {
          try {
            await objectStorageService.deleteFile(recordingToDelete.objectPath);
          } catch (deleteError) {
            console.warn("Could not delete audio file:", deleteError);
          }
        }
        
        const updatedRecordings = audioRecordings.filter(r => r.id !== audioId);
        await storage.updateBriefing(projectId, {
          audioRecordings: updatedRecordings,
        });
      } else {
        // Delete all audio recordings for this briefing
        for (const recording of audioRecordings) {
          try {
            await objectStorageService.deleteFile(recording.objectPath);
          } catch (deleteError) {
            console.warn("Could not delete audio file:", deleteError);
          }
        }

        await storage.updateBriefing(projectId, {
          audioRecordings: [],
        });
      }

      res.json({ message: "Áudio deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting audio:", error);
      res.status(500).json({ message: "Failed to delete audio" });
    }
  });

  // Download audio transcription as text file
  app.get("/api/projects/:id/briefing/audio/:audioId/transcription", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, audioId } = req.params;
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        return res.status(404).json({ message: "Briefing not found" });
      }

      const audioRecordings = (briefing.audioRecordings as any[]) || [];
      const recording = audioRecordings.find(r => r.id === audioId);
      
      if (!recording) {
        return res.status(404).json({ message: "Audio recording not found" });
      }

      if (!recording.transcription) {
        return res.status(404).json({ message: "No transcription available for this audio" });
      }

      const transcriptionContent = `Transcrição do Áudio
========================================
Título: ${recording.title || 'Áudio'}
Data: ${new Date(recording.uploadedAt).toLocaleString('pt-BR')}
========================================

${recording.transcription}

---
Gerado pelo ForgeAI`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${recording.title || 'transcricao'}.txt"`);
      res.send(transcriptionContent);
    } catch (error) {
      console.error("Error downloading transcription:", error);
      res.status(500).json({ message: "Failed to download transcription" });
    }
  });

  app.post("/api/projects/:id/briefing/complete", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const briefing = await storage.getBriefing(projectId);
      if (!briefing) {
        return res.status(400).json({ message: "No briefing found" });
      }

      // Validate required fields before completing
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

      const missingFields = requiredFields.filter((f) => {
        const value = (briefing as any)[f.key];
        return !value || value === "";
      });

      if (missingFields.length > 0) {
        const missingLabels = missingFields.map((f) => f.label).join(", ");
        return res.status(400).json({ 
          message: `Campos obrigatórios faltando: ${missingLabels}`,
          missingFields: missingFields.map((f) => f.key)
        });
      }

      // Generate scope (create or update if exists)
      const scopeData = await generateScope(briefing);
      const existingScope = await storage.getScope(projectId);
      if (existingScope) {
        await storage.updateScope(projectId, {
          objective: scopeData.objective,
          deliverables: scopeData.deliverables,
          outOfScope: scopeData.outOfScope,
          assumptions: scopeData.assumptions,
          dependencies: scopeData.dependencies,
          risks: scopeData.risks,
        });
      } else {
        await storage.createScope({
          projectId,
          objective: scopeData.objective,
          deliverables: scopeData.deliverables,
          outOfScope: scopeData.outOfScope,
          assumptions: scopeData.assumptions,
          dependencies: scopeData.dependencies,
          risks: scopeData.risks,
        });
      }

      // Generate roadmap (create or update if exists)
      const roadmapData = await generateRoadmap(
        briefing,
        scopeData,
        project.methodology || "hybrid"
      );
      const existingRoadmap = await storage.getRoadmap(projectId);
      if (existingRoadmap) {
        await storage.updateRoadmap(projectId, {
          phases: roadmapData.phases,
          milestones: roadmapData.milestones,
        });
      } else {
        await storage.createRoadmap({
          projectId,
          phases: roadmapData.phases,
          milestones: roadmapData.milestones,
        });
      }

      // Create default stages (only if they don't exist)
      const existingStages = await storage.getStages(projectId);
      const existingStageNames = existingStages.map(s => s.name.toLowerCase());
      
      const defaultStages = [
        { name: "Planejamento", type: "planning", weight: 15, order: 1 },
        { name: "Design", type: "design", weight: 20, order: 2 },
        { name: "Desenvolvimento", type: "development", weight: 35, order: 3 },
        { name: "Testes", type: "testing", weight: 20, order: 4 },
        { name: "Deploy", type: "deploy", weight: 10, order: 5 },
      ];

      // Default tasks for each stage type
      const defaultTasksByStage: Record<string, string[]> = {
        planning: [
          "Definir requisitos funcionais",
          "Definir requisitos não-funcionais",
          "Elaborar arquitetura do sistema",
          "Criar cronograma detalhado",
          "Identificar riscos e mitigações",
        ],
        design: [
          "Criar wireframes das telas principais",
          "Desenvolver design system",
          "Criar protótipos de alta fidelidade",
          "Definir componentes reutilizáveis",
          "Validar experiência do usuário",
        ],
        development: [
          "Configurar ambiente de desenvolvimento",
          "Implementar funcionalidades core",
          "Desenvolver integrações de APIs",
          "Criar testes unitários",
          "Realizar code review",
        ],
        testing: [
          "Criar plano de testes",
          "Executar testes funcionais",
          "Realizar testes de integração",
          "Testes de performance",
          "Correção de bugs identificados",
        ],
        deploy: [
          "Configurar ambiente de produção",
          "Realizar deploy em homologação",
          "Validar funcionalidades em homologação",
          "Realizar deploy em produção",
          "Monitorar aplicação pós-deploy",
        ],
      };

      for (const stage of defaultStages) {
        // Skip if stage already exists
        if (existingStageNames.includes(stage.name.toLowerCase())) {
          continue;
        }
        const createdStage = await storage.createStage({
          projectId,
          ...stage,
          progress: 0,
          status: "pending",
        });

        // Create default tasks for this stage
        const defaultTasks = defaultTasksByStage[stage.type] || [];
        for (const taskTitle of defaultTasks) {
          await storage.createTask({
            stageId: createdStage.id,
            title: taskTitle,
            status: "pending",
            weight: 1,
          });
        }
      }

      // Generate checklists (only if they don't exist for each type)
      const existingChecklists = await storage.getChecklists(projectId);
      const existingChecklistTypes = existingChecklists.map(c => c.type);
      
      const checklistsData = await generateChecklists(briefing, scopeData);
      const checklistTypes = ["technical", "commercial", "legal", "delivery", "validation"] as const;
      for (const type of checklistTypes) {
        // Skip if checklist of this type already exists
        if (existingChecklistTypes.includes(type)) {
          continue;
        }
        const items = checklistsData[type] || [];
        await storage.createChecklist({
          projectId,
          type,
          items: items.map((text: string) => ({ text, checked: false })),
        });
      }

      // Generate AI command
      const roadmap = await storage.getRoadmap(projectId);
      const aiCommandData = await generateAiCommand(
        project.name,
        briefing,
        scopeData,
        roadmap
      );
      await storage.createAiCommand({
        projectId,
        promptText: aiCommandData.promptText,
        jsonCommand: aiCommandData.jsonCommand,
        targetPlatform: "cursor",
      });

      // Generate technical documentation
      const techDoc = await generateTechnicalDoc(project.name, briefing, scopeData);
      await storage.createDocument({
        projectId,
        title: "Documentação Técnica",
        type: "technical",
        content: techDoc,
      });

      // Update project status
      await storage.updateProject(projectId, {
        status: "planning",
        progress: 10,
      });

      // Update briefing status
      await storage.updateBriefing(projectId, { status: "complete" });

      res.json({ success: true });
    } catch (error) {
      console.error("Error completing briefing:", error);
      res.status(500).json({ message: "Failed to complete briefing" });
    }
  });

  // Scope routes
  app.get("/api/projects/:id/scope", isAuthenticated, async (req: any, res) => {
    try {
      const scope = await storage.getScope(req.params.id);
      res.json(scope || null);
    } catch (error) {
      console.error("Error fetching scope:", error);
      res.status(500).json({ message: "Failed to fetch scope" });
    }
  });

  app.post("/api/projects/:id/scope/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const briefing = await storage.getBriefing(projectId);
      
      if (!briefing || briefing.status !== "complete") {
        return res.status(400).json({ message: "Complete the briefing first" });
      }

      const scopeData = await generateScope(briefing);
      const existingScope = await storage.getScope(projectId);
      
      let scope;
      if (existingScope) {
        scope = await storage.updateScope(projectId, {
          objective: scopeData.objective,
          deliverables: scopeData.deliverables,
          outOfScope: scopeData.outOfScope,
          assumptions: scopeData.assumptions,
          dependencies: scopeData.dependencies,
          risks: scopeData.risks,
        });
      } else {
        scope = await storage.createScope({
          projectId,
          objective: scopeData.objective,
          deliverables: scopeData.deliverables,
          outOfScope: scopeData.outOfScope,
          assumptions: scopeData.assumptions,
          dependencies: scopeData.dependencies,
          risks: scopeData.risks,
        });
      }

      res.json(scope);
    } catch (error) {
      console.error("Error regenerating scope:", error);
      res.status(500).json({ message: "Failed to regenerate scope" });
    }
  });

  // WBS routes
  app.get("/api/projects/:id/wbs", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const wbs = await storage.getProjectWbs(projectId);
      
      if (!wbs) {
        return res.status(404).json({ message: "WBS not found" });
      }
      
      res.json(wbs);
    } catch (error) {
      console.error("Error fetching WBS:", error);
      res.status(500).json({ message: "Failed to fetch WBS" });
    }
  });

  app.post("/api/projects/:id/wbs/generate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const scope = await storage.getScope(projectId);
      const briefing = await storage.getBriefing(projectId);
      
      if (!scope) {
        return res.status(400).json({ message: "Generate scope first" });
      }

      const { generateWBS } = await import("./openai");
      
      const wbsData = await generateWBS(
        project.name,
        {
          objective: scope.objective || undefined,
          deliverables: scope.deliverables as string[] || [],
          outOfScope: scope.outOfScope as string[] || [],
          assumptions: scope.assumptions as string[] || [],
          dependencies: scope.dependencies as string[] || [],
        },
        briefing ? {
          projectType: briefing.projectType || undefined,
          desiredScope: briefing.desiredScope || undefined,
          businessObjective: briefing.businessObjective || undefined,
          stack: briefing.stack || undefined,
          deadlineText: briefing.deadlineText || undefined,
        } : undefined
      );

      // Check if WBS already exists for this project
      const existingWbs = await storage.getProjectWbs(projectId);
      
      let savedWbs;
      if (existingWbs) {
        // Update existing WBS
        savedWbs = await storage.updateProjectWbs(projectId, {
          phases: wbsData.phases,
          totalEstimatedHours: wbsData.totalEstimatedHours,
          criticalPath: wbsData.criticalPath,
        });
      } else {
        // Create new WBS
        savedWbs = await storage.createProjectWbs({
          projectId,
          phases: wbsData.phases,
          totalEstimatedHours: wbsData.totalEstimatedHours,
          criticalPath: wbsData.criticalPath,
        });
      }

      // Auto-calculate project dates based on WBS hours
      console.log(`[WBS] totalEstimatedHours: ${wbsData.totalEstimatedHours}`);
      if (wbsData.totalEstimatedHours && wbsData.totalEstimatedHours > 0) {
        const hoursPerDay = 8;
        const workingDaysNeeded = Math.ceil(wbsData.totalEstimatedHours / hoursPerDay);
        
        // Start from today
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        // Calculate end date adding working days (skip weekends)
        const endDate = new Date(startDate);
        let daysAdded = 0;
        while (daysAdded < workingDaysNeeded) {
          endDate.setDate(endDate.getDate() + 1);
          const dayOfWeek = endDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
          }
        }
        
        console.log(`[WBS] Updating project dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);
        
        // Update project dates
        try {
          const updatedProject = await storage.updateProject(projectId, {
            startDate,
            estimatedEndDate: endDate,
          });
          console.log(`[WBS] Project updated successfully: ${updatedProject?.id}`);
        } catch (err) {
          console.error(`[WBS] Failed to update project dates:`, err);
        }
        
        console.log(`[WBS] Auto-calculated dates: ${wbsData.totalEstimatedHours}h = ${workingDaysNeeded} working days`);
      }

      res.json(savedWbs);
    } catch (error) {
      console.error("Error generating WBS:", error);
      res.status(500).json({ message: "Failed to generate WBS" });
    }
  });

  // Update WBS item completion status
  app.patch("/api/projects/:id/wbs/items/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const itemId = req.params.itemId;
      const { completed } = req.body;
      
      const wbs = await storage.getProjectWbs(projectId);
      if (!wbs) {
        return res.status(404).json({ message: "WBS not found" });
      }
      
      // Update the item completion status in the phases
      const phases = (wbs.phases as any[]) || [];
      let itemFound = false;
      
      for (const phase of phases) {
        if (phase.items) {
          for (const item of phase.items) {
            if (item.id === itemId) {
              item.completed = completed;
              itemFound = true;
              break;
            }
          }
        }
        if (itemFound) break;
      }
      
      if (!itemFound) {
        return res.status(404).json({ message: "WBS item not found" });
      }
      
      // Save updated WBS
      const updatedWbs = await storage.updateProjectWbs(projectId, {
        phases,
      });
      
      res.json(updatedWbs);
    } catch (error) {
      console.error("Error updating WBS item:", error);
      res.status(500).json({ message: "Failed to update WBS item" });
    }
  });

  // Scope Versions routes
  app.get("/api/projects/:id/scope/versions", isAuthenticated, async (req: any, res) => {
    try {
      const scope = await storage.getScope(req.params.id);
      if (!scope) {
        return res.json([]);
      }
      const versions = await storage.getScopeVersions(scope.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching scope versions:", error);
      res.status(500).json({ message: "Failed to fetch scope versions" });
    }
  });

  app.post("/api/projects/:id/scope/version", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { changeNotes } = req.body;

      const scope = await storage.getScope(projectId);
      if (!scope) {
        return res.status(404).json({ message: "Scope not found" });
      }

      // Get the latest version number
      const latestVersion = await storage.getLatestScopeVersion(scope.id);
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      // Create a new version from current scope state
      const version = await storage.createScopeVersion({
        scopeId: scope.id,
        projectId,
        version: newVersionNumber,
        objective: scope.objective,
        deliverables: scope.deliverables,
        outOfScope: scope.outOfScope,
        assumptions: scope.assumptions,
        dependencies: scope.dependencies,
        risks: scope.risks,
        metadata: scope.metadata,
        changeNotes: changeNotes || `Versao ${newVersionNumber}`,
        createdBy: userId,
      });

      res.json(version);
    } catch (error) {
      console.error("Error creating scope version:", error);
      res.status(500).json({ message: "Failed to create scope version" });
    }
  });

  app.post("/api/projects/:id/scope/restore/:versionId", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, versionId } = req.params;
      const userId = req.user.id;

      const version = await storage.getScopeVersion(versionId);
      if (!version) {
        return res.status(404).json({ message: "Version not found" });
      }

      // Create a new version before restoring (to save current state)
      const scope = await storage.getScope(projectId);
      if (scope) {
        const latestVersion = await storage.getLatestScopeVersion(scope.id);
        const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
        await storage.createScopeVersion({
          scopeId: scope.id,
          projectId,
          version: newVersionNumber,
          objective: scope.objective,
          deliverables: scope.deliverables,
          outOfScope: scope.outOfScope,
          assumptions: scope.assumptions,
          dependencies: scope.dependencies,
          risks: scope.risks,
          metadata: scope.metadata,
          changeNotes: `Backup antes de restaurar versao ${version.version}`,
          createdBy: userId,
        });

        // Restore the selected version
        await storage.updateScope(projectId, {
          objective: version.objective,
          deliverables: version.deliverables as any,
          outOfScope: version.outOfScope as any,
          assumptions: version.assumptions as any,
          dependencies: version.dependencies as any,
          risks: version.risks as any,
          metadata: version.metadata as any,
        });
      }

      res.json({ message: "Scope restored successfully" });
    } catch (error) {
      console.error("Error restoring scope version:", error);
      res.status(500).json({ message: "Failed to restore scope version" });
    }
  });

  // Dynamic scope update route
  app.patch("/api/projects/:id/scope", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const updates = req.body;

      const scope = await storage.getScope(projectId);
      if (!scope) {
        return res.status(404).json({ message: "Scope not found" });
      }

      // Save current version before updating
      const latestVersion = await storage.getLatestScopeVersion(scope.id);
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
      await storage.createScopeVersion({
        scopeId: scope.id,
        projectId,
        version: newVersionNumber,
        objective: scope.objective,
        deliverables: scope.deliverables,
        outOfScope: scope.outOfScope,
        assumptions: scope.assumptions,
        dependencies: scope.dependencies,
        risks: scope.risks,
        metadata: scope.metadata,
        changeNotes: "Auto-save antes de atualizacao",
        createdBy: userId,
      });

      // Update scope with new data
      const updatedScope = await storage.updateScope(projectId, updates);
      res.json(updatedScope);
    } catch (error) {
      console.error("Error updating scope:", error);
      res.status(500).json({ message: "Failed to update scope" });
    }
  });

  // Project Diagrams routes
  app.get("/api/projects/:id/diagrams", isAuthenticated, async (req: any, res) => {
    try {
      const diagrams = await storage.getProjectDiagrams(req.params.id);
      res.json(diagrams);
    } catch (error) {
      console.error("Error fetching diagrams:", error);
      res.status(500).json({ message: "Failed to fetch diagrams" });
    }
  });

  app.get("/api/projects/:id/diagrams/:type", isAuthenticated, async (req: any, res) => {
    try {
      const diagram = await storage.getProjectDiagramByType(req.params.id, req.params.type);
      res.json(diagram || null);
    } catch (error) {
      console.error("Error fetching diagram:", error);
      res.status(500).json({ message: "Failed to fetch diagram" });
    }
  });

  app.post("/api/projects/:id/diagrams/:type/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, type } = req.params;
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);

      if (!scope) {
        return res.status(400).json({ message: "Generate scope first" });
      }

      const { generateFlowDiagram, generateArchitectureDiagram, generateMindMapDiagram } = await import("./openai");

      let diagramData: any;
      let diagramName: string;

      switch (type) {
        case "flow":
          diagramData = await generateFlowDiagram(briefing, scope);
          diagramName = "Diagrama de Fluxo";
          break;
        case "architecture":
          diagramData = await generateArchitectureDiagram(briefing, scope);
          diagramName = "Diagrama de Arquitetura";
          break;
        case "mindmap":
          diagramData = await generateMindMapDiagram(briefing, scope);
          diagramName = "Mapa Mental";
          break;
        default:
          return res.status(400).json({ message: "Invalid diagram type" });
      }

      // Check if diagram already exists
      const existingDiagram = await storage.getProjectDiagramByType(projectId, type);
      
      let diagram;
      if (existingDiagram) {
        diagram = await storage.updateProjectDiagram(existingDiagram.id, {
          data: diagramData,
          name: diagramName,
          description: diagramData.description || "",
        });
      } else {
        diagram = await storage.createProjectDiagram({
          projectId,
          type,
          name: diagramName,
          description: diagramData.description || "",
          data: diagramData,
        });
      }

      res.json(diagram);
    } catch (error) {
      console.error("Error generating diagram:", error);
      res.status(500).json({ message: "Failed to generate diagram" });
    }
  });

  // Update diagram data (for manual edits)
  app.patch("/api/projects/:id/diagrams/:type", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, type } = req.params;
      const { data } = req.body;
      
      const existingDiagram = await storage.getProjectDiagramByType(projectId, type);
      
      if (!existingDiagram) {
        return res.status(404).json({ message: "Diagram not found" });
      }
      
      const diagram = await storage.updateProjectDiagram(existingDiagram.id, {
        data: data,
      });
      
      res.json(diagram);
    } catch (error) {
      console.error("Error updating diagram:", error);
      res.status(500).json({ message: "Failed to update diagram" });
    }
  });

  app.delete("/api/projects/:id/diagrams/:diagramId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProjectDiagram(req.params.diagramId);
      res.json({ message: "Diagram deleted" });
    } catch (error) {
      console.error("Error deleting diagram:", error);
      res.status(500).json({ message: "Failed to delete diagram" });
    }
  });

  // Roadmap routes
  app.get("/api/projects/:id/roadmap", isAuthenticated, async (req: any, res) => {
    try {
      const roadmap = await storage.getRoadmap(req.params.id);
      res.json(roadmap || null);
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      res.status(500).json({ message: "Failed to fetch roadmap" });
    }
  });

  app.put("/api/projects/:id/roadmap", isAuthenticated, async (req: any, res) => {
    try {
      const { phases, milestones } = req.body;
      const projectId = req.params.id;
      
      const existingRoadmap = await storage.getRoadmap(projectId);
      if (!existingRoadmap) {
        return res.status(404).json({ message: "Roadmap not found" });
      }
      
      const roadmap = await storage.updateRoadmap(projectId, {
        phases,
        milestones,
      });
      
      res.json(roadmap);
    } catch (error) {
      console.error("Error updating roadmap:", error);
      res.status(500).json({ message: "Failed to update roadmap" });
    }
  });

  // Stages routes
  app.get("/api/projects/:id/stages", isAuthenticated, async (req: any, res) => {
    try {
      const stagesWithAssignments = await storage.getStagesWithAssignments(req.params.id);
      res.json(stagesWithAssignments);
    } catch (error) {
      console.error("Error fetching stages:", error);
      res.status(500).json({ message: "Failed to fetch stages" });
    }
  });

  app.put("/api/stages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const stageId = req.params.id;
      const userId = req.user.id;
      
      // Get current stage before update
      const currentStage = await storage.getStage(stageId);
      if (!currentStage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const stage = await storage.updateStage(stageId, req.body);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      // Create progress log if progress changed
      if (req.body.progress !== undefined && req.body.progress !== currentStage.progress) {
        await storage.createProgressLog({
          stageId,
          projectId: stage.projectId,
          userId,
          activityType: "progress_update",
          previousProgress: currentStage.progress || 0,
          newProgress: req.body.progress,
          description: `Etapa "${stage.name}" atualizada de ${currentStage.progress || 0}% para ${req.body.progress}%`,
        });
      }

      // Recalculate project progress
      const stages = await storage.getStages(stage.projectId);
      const totalWeight = stages.reduce((sum, s) => sum + (s.weight || 0), 0);
      const weightedProgress = stages.reduce(
        (sum, s) => sum + ((s.progress || 0) * (s.weight || 0)) / 100,
        0
      );
      const projectProgress = Math.round((weightedProgress / totalWeight) * 100);

      await storage.updateProject(stage.projectId, { progress: projectProgress });

      res.json(stage);
    } catch (error) {
      console.error("Error updating stage:", error);
      res.status(500).json({ message: "Failed to update stage" });
    }
  });

  // Stage approval route
  app.post("/api/stages/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const stageId = req.params.id;
      const userId = req.user.id;
      const { approved, comment } = req.body;

      // Validate input
      if (typeof approved !== "boolean") {
        return res.status(400).json({ message: "Invalid approval value" });
      }

      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      // Verify the stage belongs to a project the user has access to
      const project = await storage.getProject(stage.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate progress requirement for approval
      if (approved && (stage.progress || 0) < 100) {
        return res.status(400).json({ message: "Stage progress must be 100% before approval" });
      }

      // Already approved
      if (stage.status === "approved" && approved) {
        return res.status(400).json({ message: "Stage is already approved" });
      }

      const approvalHistory = [...((stage.approvalHistory as any[]) || [])];
      const now = new Date();

      approvalHistory.push({
        action: approved ? "approved" : "rejected",
        userId,
        timestamp: now.toISOString(),
        comment: comment || null,
      });

      const updateData: any = {
        approvalHistory,
        status: approved ? "approved" : "rejected",
        progress: approved ? 100 : stage.progress,
        updatedAt: now,
      };

      if (approved) {
        updateData.approvedBy = userId;
        updateData.approvedAt = now;
      }

      const updatedStage = await storage.updateStage(stageId, updateData);

      // Log stage approval activity
      await storage.createProgressLog({
        stageId,
        projectId: stage.projectId,
        userId,
        activityType: "stage_approval",
        previousStatus: stage.status,
        newStatus: approved ? "approved" : "rejected",
        description: `Etapa "${stage.name}" foi ${approved ? "aprovada" : "rejeitada"}`,
        notes: comment,
      });

      // Recalculate project progress
      const stages = await storage.getStages(stage.projectId);
      const totalWeight = stages.reduce((sum, s) => sum + (s.weight || 0), 0);
      const weightedProgress = stages.reduce(
        (sum, s) => sum + ((s.progress || 0) * (s.weight || 0)) / 100,
        0
      );
      const projectProgress = Math.round((weightedProgress / totalWeight) * 100);

      // Update project status based on current active stage
      const allApproved = stages.every(s => s.status === "approved");
      const projectUpdate: any = { progress: projectProgress };
      const previousProjectStatus = stage.projectId && await storage.getProject(stage.projectId);
      
      if (allApproved) {
        projectUpdate.status = "completed";
      } else {
        // Find the first non-approved stage that has progress or is in progress
        const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
        const activeStage = sortedStages.find(s => 
          s.status !== "approved" && (s.progress || 0) > 0
        ) || sortedStages.find(s => s.status !== "approved");
        
        if (activeStage) {
          // Map stage name to project status
          const stageToStatus: Record<string, string> = {
            "Planejamento": "planning",
            "Design": "design",
            "Desenvolvimento": "development",
            "Testes": "testing",
            "Deploy": "deploy",
          };
          const newStatus = stageToStatus[activeStage.name] || "planning";
          projectUpdate.status = newStatus;
        }
      }

      // Log project status change if status changed
      if (previousProjectStatus && projectUpdate.status && projectUpdate.status !== previousProjectStatus.status) {
        await storage.createProgressLog({
          projectId: stage.projectId,
          userId,
          activityType: "project_status_changed",
          previousStatus: previousProjectStatus.status,
          newStatus: projectUpdate.status,
          description: `Status do projeto alterado de "${previousProjectStatus.status}" para "${projectUpdate.status}"`,
        });
      }

      await storage.updateProject(stage.projectId, projectUpdate);

      res.json(updatedStage);
    } catch (error) {
      console.error("Error approving stage:", error);
      res.status(500).json({ message: "Failed to approve stage" });
    }
  });

  // Stage Tasks routes
  app.get("/api/stages/:stageId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getTasks(req.params.stageId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching stage tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Generate tasks for a stage using AI
  app.post("/api/stages/:stageId/generate-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      // Check if stage already has tasks
      const existingTasks = await storage.getTasks(stageId);
      if (existingTasks.length > 0) {
        return res.status(400).json({ message: "Stage already has tasks" });
      }

      // Get project and briefing info for context
      const project = await storage.getProject(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const briefing = await storage.getBriefing(stage.projectId);

      // Generate tasks using AI
      const generatedTasks = await generateStageTasks(
        stage.name,
        project.name,
        project.description || "",
        briefing ? {
          projectType: briefing.projectType || undefined,
          desiredScope: briefing.desiredScope || undefined,
          businessObjective: briefing.businessObjective || undefined,
          stack: briefing.stack || undefined,
        } : undefined
      );

      const createdTasks = [];
      for (const taskData of generatedTasks) {
        const task = await storage.createTask({
          stageId,
          title: taskData.title,
          description: taskData.description,
          status: "pending",
          weight: taskData.weight || 1,
        });
        createdTasks.push(task);
      }

      res.status(201).json(createdTasks);
    } catch (error) {
      console.error("Error generating tasks:", error);
      res.status(500).json({ message: "Failed to generate tasks" });
    }
  });

  app.post("/api/stages/:stageId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      const task = await storage.createTask({
        stageId,
        title: req.body.title,
        description: req.body.description,
        weight: req.body.weight || 1,
        status: "pending",
        assignee: req.body.assignee,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updatedTask = await storage.updateTask(taskId, req.body);

      // Recalculate stage progress based on completed tasks
      const tasks = await storage.getTasks(task.stageId);
      const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0);
      const completedWeight = tasks.reduce(
        (sum, t) => sum + (t.status === "completed" ? (t.weight || 1) : 0),
        0
      );
      const stageProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      const stage = await storage.getStage(task.stageId);
      if (stage) {
        const previousProgress = stage.progress || 0;
        
        await storage.updateStage(task.stageId, { 
          progress: stageProgress,
          status: stageProgress > 0 && stageProgress < 100 ? "in_progress" : 
                  stageProgress === 100 ? "pending" : "pending"
        });

        // Create progress log if progress changed
        if (previousProgress !== stageProgress) {
          console.log(`[ACTIVITY LOG] Creating progress log: stage=${stage.name}, prev=${previousProgress}, new=${stageProgress}, userId=${req.user.id}`);
          try {
            await storage.createProgressLog({
              stageId: task.stageId,
              projectId: stage.projectId,
              userId: req.user.id,
              activityType: "progress_update",
              previousProgress,
              newProgress: stageProgress,
              description: `Progresso da etapa "${stage.name}" alterado de ${previousProgress}% para ${stageProgress}%`,
            });
            console.log(`[ACTIVITY LOG] Progress log created successfully`);
          } catch (logError) {
            console.error(`[ACTIVITY LOG] Failed to create progress log:`, logError);
          }
        }

        // Recalculate project progress and status
        const stages = await storage.getStages(stage.projectId);
        const totalStageWeight = stages.reduce((sum, s) => sum + (s.weight || 0), 0);
        const weightedProgress = stages.reduce(
          (sum, s) => sum + ((s.progress || 0) * (s.weight || 0)) / 100,
          0
        );
        const projectProgress = totalStageWeight > 0 ? Math.round((weightedProgress / totalStageWeight) * 100) : 0;
        
        // Update project status based on current active stage
        const allApproved = stages.every(s => s.status === "approved");
        const projectUpdate: any = { progress: projectProgress };
        
        if (allApproved) {
          projectUpdate.status = "completed";
        } else {
          const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
          const activeStage = sortedStages.find(s => 
            s.status !== "approved" && (s.progress || 0) > 0
          ) || sortedStages.find(s => s.status !== "approved");
          
          if (activeStage) {
            const stageToStatus: Record<string, string> = {
              "Planejamento": "planning",
              "Design": "design",
              "Desenvolvimento": "development",
              "Testes": "testing",
              "Deploy": "deploy",
            };
            projectUpdate.status = stageToStatus[activeStage.name] || "planning";
          }
        }
        
        await storage.updateProject(stage.projectId, projectUpdate);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await storage.deleteTask(taskId);

      // Recalculate stage progress
      const tasks = await storage.getTasks(task.stageId);
      const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0);
      const completedWeight = tasks.reduce(
        (sum, t) => sum + (t.status === "completed" ? (t.weight || 1) : 0),
        0
      );
      const stageProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      const stage = await storage.getStage(task.stageId);
      if (stage) {
        await storage.updateStage(task.stageId, { progress: stageProgress });

        // Recalculate project progress and status
        const stages = await storage.getStages(stage.projectId);
        const totalStageWeight = stages.reduce((sum, s) => sum + (s.weight || 0), 0);
        const weightedProgress = stages.reduce(
          (sum, s) => sum + ((s.progress || 0) * (s.weight || 0)) / 100,
          0
        );
        const projectProgress = totalStageWeight > 0 ? Math.round((weightedProgress / totalStageWeight) * 100) : 0;
        
        // Update project status based on current active stage
        const allApproved = stages.every(s => s.status === "approved");
        const projectUpdate: any = { progress: projectProgress };
        
        if (allApproved) {
          projectUpdate.status = "completed";
        } else {
          const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));
          const activeStage = sortedStages.find(s => 
            s.status !== "approved" && (s.progress || 0) > 0
          ) || sortedStages.find(s => s.status !== "approved");
          
          if (activeStage) {
            const stageToStatus: Record<string, string> = {
              "Planejamento": "planning",
              "Design": "design",
              "Desenvolvimento": "development",
              "Testes": "testing",
              "Deploy": "deploy",
            };
            projectUpdate.status = stageToStatus[activeStage.name] || "planning";
          }
        }
        
        await storage.updateProject(stage.projectId, projectUpdate);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Checklists routes
  app.get("/api/projects/:id/checklists", isAuthenticated, async (req: any, res) => {
    try {
      const checklists = await storage.getChecklists(req.params.id);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

  app.put("/api/checklists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const checklist = await storage.updateChecklist(req.params.id, req.body);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.json(checklist);
    } catch (error) {
      console.error("Error updating checklist:", error);
      res.status(500).json({ message: "Failed to update checklist" });
    }
  });

  // Documents routes
  app.get("/api/projects/:id/documents", isAuthenticated, async (req: any, res) => {
    try {
      const documents = await storage.getDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // AI Command routes
  app.get("/api/projects/:id/ai-command", isAuthenticated, async (req: any, res) => {
    try {
      const command = await storage.getAiCommand(req.params.id);
      res.json(command || null);
    } catch (error) {
      console.error("Error fetching AI command:", error);
      res.status(500).json({ message: "Failed to fetch AI command" });
    }
  });

  app.post("/api/projects/:id/ai-command/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      const aiCommandData = await generateAiCommand(
        project.name,
        briefing,
        scope,
        roadmap
      );

      const existingCommand = await storage.getAiCommand(projectId);
      let command;
      if (existingCommand) {
        command = await storage.updateAiCommand(existingCommand.id, {
          promptText: aiCommandData.promptText,
          jsonCommand: aiCommandData.jsonCommand,
        });
      } else {
        command = await storage.createAiCommand({
          projectId,
          promptText: aiCommandData.promptText,
          jsonCommand: aiCommandData.jsonCommand,
          targetPlatform: "cursor",
        });
      }

      res.json(command);
    } catch (error) {
      console.error("Error regenerating AI command:", error);
      res.status(500).json({ message: "Failed to regenerate AI command" });
    }
  });

  // AES-256-GCM encryption for vault credentials
  const ENCRYPTION_KEY = process.env.SESSION_SECRET;
  if (!ENCRYPTION_KEY) {
    console.error("CRITICAL: SESSION_SECRET is required for vault encryption");
  }
  const ALGORITHM = 'aes-256-gcm';
  
  const getKey = (): Buffer => {
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  };

  const encryptValue = (value: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  };

  const decryptValue = (encrypted: string): string => {
    if (!ENCRYPTION_KEY) {
      throw new Error("Encryption key not configured");
    }
    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted format");
      }
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];
      const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt value");
    }
  };

  const maskValue = (value: string): string => {
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  // Vault routes
  app.get("/api/projects/:id/vault", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getVaultItems(projectId);
      const maskedItems = items.map(item => ({
        ...item,
        value: maskValue(decryptValue(item.value)),
        _encrypted: true,
      }));
      res.json(maskedItems);
    } catch (error) {
      console.error("Error fetching vault items:", error);
      res.status(500).json({ message: "Failed to fetch vault items" });
    }
  });

  app.get("/api/projects/:id/vault/:itemId/reveal", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const itemId = req.params.itemId;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const items = await storage.getVaultItems(projectId);
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ value: decryptValue(item.value) });
    } catch (error) {
      console.error("Error revealing vault item:", error);
      res.status(500).json({ message: "Failed to reveal vault item" });
    }
  });

  app.post("/api/projects/:id/vault", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { name, type, value, description, environment } = req.body;

      if (!name || !type || !value) {
        return res.status(400).json({ message: "Name, type, and value are required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const encryptedValue = encryptValue(value);
      const item = await storage.createVaultItem({
        projectId,
        name,
        type,
        value: encryptedValue,
        description,
        environment,
      });

      res.status(201).json({
        ...item,
        value: maskValue(value),
        _encrypted: true,
      });
    } catch (error) {
      console.error("Error creating vault item:", error);
      res.status(500).json({ message: "Failed to create vault item" });
    }
  });

  app.patch("/api/vault/:id", isAuthenticated, async (req: any, res) => {
    try {
      const itemId = req.params.id;
      const userId = req.user.id;

      const item = await storage.getVaultItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Vault item not found" });
      }

      const project = await storage.getProject(item.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = { ...req.body };
      if (updateData.value) {
        updateData.value = encryptValue(updateData.value);
      }

      const updatedItem = await storage.updateVaultItem(itemId, updateData);
      res.json({
        ...updatedItem,
        value: maskValue(req.body.value || "****"),
        _encrypted: true,
      });
    } catch (error) {
      console.error("Error updating vault item:", error);
      res.status(500).json({ message: "Failed to update vault item" });
    }
  });

  app.delete("/api/vault/:id", isAuthenticated, async (req: any, res) => {
    try {
      const itemId = req.params.id;
      const userId = req.user.id;

      const item = await storage.getVaultItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Vault item not found" });
      }

      const project = await storage.getProject(item.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteVaultItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vault item:", error);
      res.status(500).json({ message: "Failed to delete vault item" });
    }
  });

  // AI Agent routes
  app.post("/api/projects/:id/agents/run", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { agentType, task } = req.body;
      const userId = req.user.id;

      if (!agentType || !task) {
        return res.status(400).json({ message: "Agent type and task are required" });
      }

      const validAgentTypes = ["analysis", "code", "test", "review"];
      if (!validAgentTypes.includes(agentType)) {
        return res.status(400).json({ message: "Invalid agent type" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      const projectContext = {
        name: project.name,
        description: project.description,
        status: project.status,
        methodology: project.methodology,
        briefing: briefing ? {
          projectType: briefing.projectType,
          businessObjective: briefing.businessObjective,
          targetAudience: briefing.targetAudience,
          stack: briefing.stack,
        } : null,
        scope: scope ? {
          objective: scope.objective,
          deliverables: scope.deliverables,
          risks: scope.risks,
        } : null,
        roadmap: roadmap ? {
          phases: roadmap.phases,
          milestones: roadmap.milestones,
        } : null,
      };

      const result = await runSpecializedAgent(agentType, task, projectContext);
      res.json(result);
    } catch (error) {
      console.error("Error running AI agent:", error);
      res.status(500).json({ message: "Failed to run AI agent" });
    }
  });

  // Document generation routes
  app.post("/api/projects/:id/documents/generate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { type } = req.body;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      let content: string;
      let title: string;

      switch (type) {
        case "technical":
          content = await generateTechnicalDoc(project.name, briefing, scope);
          title = "Documentação Técnica";
          break;
        case "architecture":
          content = await generateArchitectureDoc(project.name, briefing, scope, roadmap);
          title = "Arquitetura do Sistema";
          break;
        case "api":
          content = await generateApiDoc(project.name, briefing, scope);
          title = "Documentação da API";
          break;
        case "installation":
          content = await generateInstallGuide(project.name, briefing, scope);
          title = "Guia de Instalação";
          break;
        case "styles":
          content = await generateStylesGuide(project.name, briefing);
          title = "Guia de Estilos";
          break;
        case "requirements":
          content = await generateRequirements(project.name, briefing, scope);
          title = "Especificação de Requisitos";
          break;
        case "user-guide":
          content = await generateUserGuide(project.name, briefing, scope);
          title = "Guia do Usuário";
          break;
        case "testing":
          content = await generateTestingStrategy(project.name, briefing, scope);
          title = "Estratégia de Testes";
          break;
        default:
          return res.status(400).json({ message: "Invalid document type" });
      }

      // Check if document of this type already exists
      const existingDocs = await storage.getDocuments(projectId);
      const existingDoc = existingDocs.find((d) => d.type === type);

      let document;
      let isNewDocument = !existingDoc;
      
      if (existingDoc) {
        document = await storage.updateDocument(existingDoc.id, { content, title });
      } else {
        document = await storage.createDocument({
          projectId,
          title,
          type,
          content,
        });
      }

      // Log document creation activity (only for new documents)
      if (isNewDocument) {
        await storage.createProgressLog({
          projectId,
          documentId: document.id,
          userId,
          activityType: "document_created",
          description: `Documento "${title}" foi gerado com sucesso`,
        });
      }

      res.json(document);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });

  // Specialized Agent Analysis routes
  app.get("/api/projects/:id/agents", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const analyses = await storage.getAgentAnalyses(projectId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching agent analyses:", error);
      res.status(500).json({ message: "Failed to fetch agent analyses" });
    }
  });

  // Apply agent recommendations to project - MUST come before :agentType route
  app.post("/api/projects/:id/agents/apply-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { agentType, recommendations, notes } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);

      const appliedRecommendations = recommendations?.length > 0 ? recommendations : [];
      const userNotes = notes || "";

      const agentRecommendationEntry = {
        agentType,
        recommendations: appliedRecommendations,
        notes: userNotes,
        appliedAt: new Date().toISOString(),
      };

      if (briefing) {
        const existingConversation = (briefing.conversation as any[]) || [];
        const updatedConversation = [
          ...existingConversation,
          {
            role: "system",
            content: `Recomendações do ${agentType} aplicadas: ${appliedRecommendations.join("; ")}${userNotes ? `. Notas: ${userNotes}` : ""}`,
            timestamp: new Date().toISOString(),
          }
        ];

        await storage.updateBriefing(projectId, {
          conversation: updatedConversation,
        });
      }

      if (scope) {
        const existingMetadata = (scope.metadata as Record<string, any>) || {};
        const existingRecommendations = existingMetadata.appliedRecommendations || [];
        await storage.updateScope(projectId, {
          metadata: {
            ...existingMetadata,
            appliedRecommendations: [...existingRecommendations, agentRecommendationEntry],
            lastUpdated: new Date().toISOString(),
          },
        });
      }

      res.json({ 
        success: true, 
        message: "Recomendações aplicadas com sucesso",
        appliedRecommendations: appliedRecommendations.length,
      });
    } catch (error) {
      console.error("Error applying recommendations:", error);
      res.status(500).json({ message: "Failed to apply recommendations" });
    }
  });

  // Run orchestrated analysis (all agents) - MUST come before :agentType route
  app.post("/api/projects/:id/agents/orchestrate", isAuthenticated, async (req: any, res) => {
    let session: any = null;
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { agentTypes } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      const agentsToRun = agentTypes || ["scope", "technical", "timeline", "risks", "financial", "documentation"];

      session = await storage.createOrchestratorSession({
        projectId,
        status: "running",
        agentsExecuted: agentsToRun,
      });

      const result = await runOrchestratedAnalysis(
        { project, briefing, scope, roadmap },
        agentsToRun
      );

      for (const agentResult of result.agentResults) {
        const hasValidResult = agentResult.confidence > 0 && agentResult.analysis;
        await storage.createAgentAnalysis({
          projectId,
          agentType: agentResult.agentType,
          status: hasValidResult ? "completed" : "failed",
          result: agentResult.analysis || "Análise falhou",
          confidence: agentResult.confidence || 0,
          recommendations: agentResult.recommendations || [],
          warnings: agentResult.warnings || [],
          metadata: { 
            executionTime: agentResult.executionTime || 0,
            sessionId: session.id 
          },
        });
      }

      const updatedSession = await storage.updateOrchestratorSession(session.id, {
        status: "completed",
        consolidatedResult: result.consolidatedAnalysis || {
          overallHealth: 0,
          criticalIssues: [],
          topRecommendations: [],
          projectReadiness: "not_ready",
          summary: "Análise não pôde ser concluída completamente."
        },
        totalConfidence: result.consolidatedAnalysis?.overallHealth || 0,
        executionLog: result.agentResults.map(r => ({
          agent: r.agentType,
          status: (r.confidence > 0 && r.analysis) ? "success" : "failed",
          confidence: r.confidence || 0,
          executionTime: r.executionTime || 0,
        })),
        completedAt: new Date(),
      });

      res.json({
        session: updatedSession,
        agentResults: result.agentResults,
        consolidatedAnalysis: result.consolidatedAnalysis,
        totalExecutionTime: result.totalExecutionTime,
      });
    } catch (error) {
      console.error("Error running orchestrated analysis:", error);
      
      if (session) {
        try {
          await storage.updateOrchestratorSession(session.id, {
            status: "failed",
            completedAt: new Date(),
          });
        } catch (updateError) {
          console.error("Error updating failed session:", updateError);
        }
      }
      
      res.status(500).json({ message: "Failed to run orchestrated analysis" });
    }
  });

  // Run a single specialized agent
  app.post("/api/projects/:id/agents/:agentType", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const agentType = req.params.agentType as SpecializedAgentType;
      const userId = req.user.id;

      const validAgentTypes = ["scope", "technical", "timeline", "risks", "financial", "documentation"];
      if (!validAgentTypes.includes(agentType)) {
        return res.status(400).json({ message: "Invalid agent type" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      // Create pending analysis record
      const pendingAnalysis = await storage.createAgentAnalysis({
        projectId,
        agentType,
        status: "running",
      });

      // Run the specialized agent
      const result = await runSpecializedAgentAnalysis(agentType, {
        project,
        briefing,
        scope,
        roadmap,
      });

      // Update analysis with results
      const updatedAnalysis = await storage.updateAgentAnalysis(pendingAnalysis.id, {
        status: "completed",
        result: result.analysis,
        confidence: result.confidence,
        recommendations: result.recommendations,
        warnings: result.warnings,
        metadata: { executionTime: result.executionTime },
      });

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error running specialized agent:", error);
      res.status(500).json({ message: "Failed to run specialized agent" });
    }
  });

  // Get orchestrator sessions
  app.get("/api/projects/:id/orchestrator-sessions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const sessions = await storage.getOrchestratorSessions(projectId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching orchestrator sessions:", error);
      res.status(500).json({ message: "Failed to fetch orchestrator sessions" });
    }
  });

  // ============ TEAM MEMBER ROUTES ============

  // Get project members
  app.get("/api/projects/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Allow access if owner or member
      const membership = await storage.getProjectMemberByUserId(projectId, userId);
      if (project.userId !== userId && !membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  // Add project member
  app.post("/api/projects/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { email, name, role, specialty, password } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Only owner or manager can add members
      if (project.userId !== userId) {
        const membership = await storage.getProjectMemberByUserId(projectId, userId);
        if (!membership || membership.role === "contributor") {
          return res.status(403).json({ message: "Only owners and managers can add members" });
        }
      }

      // Check if member already exists
      const existingMember = await storage.getProjectMemberByEmail(projectId, email);
      if (existingMember) {
        return res.status(400).json({ message: "Member with this email already exists" });
      }

      // Check if user with this email exists
      let existingUser = await storage.getUserByEmail(email);

      // If user doesn't exist, create one with the provisional password
      if (!existingUser) {
        if (!password || password.length < 6) {
          return res.status(400).json({ message: "Password is required and must be at least 6 characters" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Split name into first and last name
        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || undefined;

        existingUser = await storage.createUser({
          email,
          password: hashedPassword,
          firstName,
          lastName,
        });
      }

      const member = await storage.createProjectMember({
        projectId,
        email,
        name,
        role: role || "contributor",
        specialty,
        userId: existingUser.id,
        status: "active",
      });

      // Log member added activity
      await storage.createProgressLog({
        projectId,
        memberId: member.id,
        userId,
        activityType: "member_added",
        description: `Membro "${name}" foi adicionado ao projeto com função "${role || 'contributor'}"`,
      });

      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  // Update project member
  app.put("/api/projects/:id/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, memberId } = req.params;
      const userId = req.user.id;
      const { password, ...memberData } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Only owner or manager can update members
      if (project.userId !== userId) {
        const membership = await storage.getProjectMemberByUserId(projectId, userId);
        if (!membership || membership.role === "contributor") {
          return res.status(403).json({ message: "Only owners and managers can update members" });
        }
      }

      // Get the member to find the associated user
      const existingMember = await storage.getProjectMember(memberId);
      if (!existingMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      // If password is provided and member has a userId, update the user's password
      if (password && password.length >= 6 && existingMember.userId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUser(existingMember.userId, { password: hashedPassword });
      }

      const member = await storage.updateProjectMember(memberId, memberData);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error("Error updating project member:", error);
      res.status(500).json({ message: "Failed to update project member" });
    }
  });

  // Delete project member
  app.delete("/api/projects/:id/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const { id: projectId, memberId } = req.params;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Only owner or manager can delete members
      if (project.userId !== userId) {
        const membership = await storage.getProjectMemberByUserId(projectId, userId);
        if (!membership || membership.role === "contributor") {
          return res.status(403).json({ message: "Only owners and managers can remove members" });
        }
      }

      await storage.deleteProjectMember(memberId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // ============ STAGE ASSIGNMENT ROUTES ============

  // Get stage assignments
  app.get("/api/stages/:stageId/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const assignments = await storage.getStageAssignments(stageId);
      
      // Enrich with member data
      const enrichedAssignments = await Promise.all(assignments.map(async (assignment) => {
        const member = await storage.getProjectMember(assignment.memberId);
        return { ...assignment, member };
      }));

      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching stage assignments:", error);
      res.status(500).json({ message: "Failed to fetch stage assignments" });
    }
  });

  // Assign member to stage
  app.post("/api/stages/:stageId/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const userId = req.user.id;
      const { memberId, dueDate, notes } = req.body;

      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      const project = await storage.getProject(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Only owner or manager can assign tasks
      if (project.userId !== userId) {
        const membership = await storage.getProjectMemberByUserId(project.id, userId);
        if (!membership || membership.role === "contributor") {
          return res.status(403).json({ message: "Only owners and managers can assign tasks" });
        }
      }

      const assignment = await storage.createStageAssignment({
        stageId,
        memberId,
        assignedBy: userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
      });

      const member = await storage.getProjectMember(memberId);
      res.status(201).json({ ...assignment, member });
    } catch (error) {
      console.error("Error assigning stage:", error);
      res.status(500).json({ message: "Failed to assign stage" });
    }
  });

  // Remove stage assignment
  app.delete("/api/stages/:stageId/assignments/:assignmentId", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId, assignmentId } = req.params;
      const userId = req.user.id;

      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      const project = await storage.getProject(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Only owner or manager can remove assignments
      if (project.userId !== userId) {
        const membership = await storage.getProjectMemberByUserId(project.id, userId);
        if (!membership || membership.role === "contributor") {
          return res.status(403).json({ message: "Only owners and managers can remove assignments" });
        }
      }

      await storage.deleteStageAssignment(assignmentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing stage assignment:", error);
      res.status(500).json({ message: "Failed to remove stage assignment" });
    }
  });

  // ============ MY TASKS ROUTES ============

  // Get all tasks assigned to current user
  app.get("/api/my-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Get all projects where user is owner
      const ownedProjects = await storage.getProjects(userId);

      // Get all projects where user is a member
      const memberProjects = await storage.getProjectsByMemberUserId(userId);

      // Combine and dedupe
      const allProjectIds = new Set([
        ...ownedProjects.map(p => p.id),
        ...memberProjects.map(p => p.id),
      ]);

      const tasks: any[] = [];

      for (const projectId of allProjectIds) {
        const project = await storage.getProject(projectId);
        if (!project) continue;

        const stages = await storage.getStages(projectId);
        const membership = await storage.getProjectMemberByUserId(projectId, userId);

        for (const stage of stages) {
          const assignments = await storage.getStageAssignments(stage.id);
          
          // Check if this stage is assigned to the current user
          const isAssignedToUser = membership 
            ? assignments.some(a => a.memberId === membership.id)
            : false;

          // Include if user owns project or is assigned
          const isOwner = project.userId === userId;
          const canEdit = isOwner || (membership?.role === "manager") || isAssignedToUser;

          if (isOwner || isAssignedToUser) {
            tasks.push({
              stage,
              project,
              isOwner,
              isAssigned: isAssignedToUser,
              canEdit,
              memberRole: membership?.role,
            });
          }
        }
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({ message: "Failed to fetch my tasks" });
    }
  });

  // Update stage progress with permission check
  app.patch("/api/stages/:stageId/progress", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const userId = req.user.id;
      const { progress, notes } = req.body;

      const stage = await storage.getStage(stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      const project = await storage.getProject(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const isOwner = project.userId === userId;
      const membership = await storage.getProjectMemberByUserId(project.id, userId);
      
      // Check if contributor is assigned to this stage
      if (!isOwner && membership?.role === "contributor") {
        const assignments = await storage.getStageAssignments(stageId);
        const isAssigned = assignments.some(a => a.memberId === membership.id);
        if (!isAssigned) {
          return res.status(403).json({ message: "You can only update progress on stages assigned to you" });
        }
      } else if (!isOwner && !membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create progress log
      console.log("Creating progress log:", {
        stageId,
        projectId: project.id,
        userId,
        memberId: membership?.id,
        activityType: "progress_update",
        previousProgress: stage.progress || 0,
        newProgress: progress,
        notes,
      });
      const progressLogResult = await storage.createProgressLog({
        stageId,
        projectId: project.id,
        userId,
        memberId: membership?.id,
        activityType: "progress_update",
        previousProgress: stage.progress || 0,
        newProgress: progress,
        notes,
      });
      console.log("Progress log created:", progressLogResult);

      // Update stage progress
      const updatedStage = await storage.updateStage(stageId, { progress });

      // Recalculate project progress
      const allStages = await storage.getStages(project.id);
      const totalWeight = allStages.reduce((sum, s) => sum + (s.weight || 0), 0);
      const weightedProgress = allStages.reduce((sum, s) => {
        const stageProgress = s.id === stageId ? progress : (s.progress || 0);
        return sum + (stageProgress * (s.weight || 0));
      }, 0);
      const projectProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
      await storage.updateProject(project.id, { progress: projectProgress });

      res.json(updatedStage);
    } catch (error) {
      console.error("Error updating stage progress:", error);
      res.status(500).json({ message: "Failed to update stage progress" });
    }
  });

  // Get progress logs for a stage
  app.get("/api/stages/:stageId/progress-logs", isAuthenticated, async (req: any, res) => {
    try {
      const { stageId } = req.params;
      const logs = await storage.getProgressLogs(stageId);
      
      // Enrich with user/member data
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        const user = log.userId ? await storage.getUser(log.userId) : null;
        const member = log.memberId ? await storage.getProjectMember(log.memberId) : null;
        return {
          ...log,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : null,
          memberName: member?.name,
        };
      }));

      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching progress logs:", error);
      res.status(500).json({ message: "Failed to fetch progress logs" });
    }
  });

  // PUBLIC INVITE ROUTES (no authentication required)
  
  // Validate invite token
  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }

      if (invite.status === "accepted") {
        return res.status(400).json({ message: "Este convite já foi aceito" });
      }

      if (invite.status === "expired" || new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Este convite expirou" });
      }

      // Get project and member info
      const project = await storage.getProject(invite.projectId);
      const member = await storage.getProjectMember(invite.memberId);

      res.json({
        email: invite.email,
        projectName: project?.name || "Projeto",
        memberName: member?.name || "",
        role: member?.role || "contributor",
      });
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ message: "Erro ao validar convite" });
    }
  });

  // Accept invite and create account
  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const { password, firstName, lastName } = req.body;
      const token = req.params.token;

      if (!password || password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      const invite = await storage.getInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }

      if (invite.status === "accepted") {
        return res.status(400).json({ message: "Este convite já foi aceito" });
      }

      if (invite.status === "expired" || new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Este convite expirou" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ message: "Já existe uma conta com este e-mail" });
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const member = await storage.getProjectMember(invite.memberId);

      const user = await storage.createUser({
        email: invite.email,
        password: hashedPassword,
        firstName: firstName || member?.name?.split(" ")[0] || "",
        lastName: lastName || member?.name?.split(" ").slice(1).join(" ") || "",
      });

      // Update member to link with user and set active
      await storage.updateProjectMember(invite.memberId, {
        userId: user.id,
        status: "active",
      });

      // Accept the invite
      await storage.acceptInvite(token);

      res.json({ message: "Conta criada com sucesso! Faça login para continuar." });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Erro ao aceitar convite" });
    }
  });

  // ============ ACTIVITY & FAVORITES ROUTES ============

  // Get recent activity logs
  app.get("/api/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivityLogs(userId, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Get all activity logs for history page
  app.get("/api/activity/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const activity = await storage.getAllActivityLogs(userId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching all activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Toggle project favorite
  app.patch("/api/projects/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedProject = await storage.updateProject(projectId, {
        isFavorite: !project.isFavorite,
      });
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // ============ ADMIN ROUTES ============
  
  // Middleware to check if user is platform admin
  const isPlatformAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "platform_admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores da plataforma podem acessar." });
      }
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };

  // Check if current user is admin
  app.get("/api/admin/check", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      res.json({ 
        isAdmin: user?.role === "platform_admin",
        role: user?.role 
      });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Erro ao verificar status de admin" });
    }
  });

  // Temporary route to set initial platform admin
  app.post("/api/admin/init-admin", isAuthenticated, async (req: any, res) => {
    try {
      const PLATFORM_ADMIN_EMAIL = "agclickon@gmail.com";
      const user = await storage.getUser(req.user.id);
      
      if (!user || user.email.toLowerCase() !== PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ message: "Apenas o email designado pode usar esta rota" });
      }
      
      // Check if there are any platform admins already
      const allUsers = await storage.getAllUsers();
      const existingAdmins = allUsers.filter(u => u.role === "platform_admin");
      
      if (existingAdmins.length > 0 && !existingAdmins.some(a => a.id === user.id)) {
        return res.status(403).json({ message: "Já existe um admin configurado" });
      }
      
      const updated = await storage.updateUserRole(user.id, "platform_admin");
      res.json({ success: true, role: updated?.role });
    } catch (error) {
      console.error("Error initializing admin:", error);
      res.status(500).json({ message: "Erro ao configurar admin" });
    }
  });

  // Get platform statistics
  app.get("/api/admin/stats", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // ===== AI Providers Management =====
  
  // Get all AI providers
  app.get("/api/admin/ai-providers", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const providers = await storage.getAiProviders();
      // For each provider, check if the env var exists (without revealing the key)
      const providersWithStatus = providers.map(p => ({
        ...p,
        hasApiKey: p.apiKeyEnvVar ? !!process.env[p.apiKeyEnvVar] : false,
        hasBaseUrl: p.baseUrlEnvVar ? !!process.env[p.baseUrlEnvVar] : false,
      }));
      res.json(providersWithStatus);
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      res.status(500).json({ message: "Erro ao buscar provedores de IA" });
    }
  });

  // Create new AI provider
  app.post("/api/admin/ai-providers", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { name, provider, model, apiKeyEnvVar, baseUrlEnvVar, maxTokens, temperature, description } = req.body;
      
      // Get current max priority to add new one at the end
      const existingProviders = await storage.getAiProviders();
      const maxPriority = Math.max(...existingProviders.map(p => p.priority || 0), 0);
      
      const aiProvider = await storage.createAiProvider({
        name,
        provider,
        model,
        apiKeyEnvVar,
        baseUrlEnvVar,
        maxTokens: maxTokens || 4096,
        temperature: temperature || 70,
        description,
        priority: maxPriority + 1,
        isActive: true,
      });

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "create_ai_provider",
        targetType: "ai_provider",
        targetId: aiProvider.id,
        newValue: { name, provider, model },
      });

      res.status(201).json(aiProvider);
    } catch (error) {
      console.error("Error creating AI provider:", error);
      res.status(500).json({ message: "Erro ao criar provedor de IA" });
    }
  });

  // Update AI provider
  app.put("/api/admin/ai-providers/:id", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const oldProvider = await storage.getAiProvider(id);
      
      const updated = await storage.updateAiProvider(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Provedor não encontrado" });
      }

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "update_ai_provider",
        targetType: "ai_provider",
        targetId: id,
        previousValue: oldProvider,
        newValue: req.body,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ message: "Erro ao atualizar provedor de IA" });
    }
  });

  // Delete AI provider
  app.delete("/api/admin/ai-providers/:id", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.getAiProvider(id);
      
      await storage.deleteAiProvider(id);

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "delete_ai_provider",
        targetType: "ai_provider",
        targetId: id,
        previousValue: provider,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI provider:", error);
      res.status(500).json({ message: "Erro ao excluir provedor de IA" });
    }
  });

  // Reorder AI providers (for fallback priority)
  app.post("/api/admin/ai-providers/reorder", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { providerIds } = req.body;
      if (!Array.isArray(providerIds)) {
        return res.status(400).json({ message: "Lista de IDs inválida" });
      }
      
      const updated = await storage.reorderAiProviders(providerIds);

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "reorder_ai_providers",
        targetType: "ai_provider",
        newValue: { order: providerIds },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error reordering AI providers:", error);
      res.status(500).json({ message: "Erro ao reordenar provedores" });
    }
  });

  // ===== User Management =====
  
  // Get all users with their project associations
  app.get("/api/admin/users", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const allClients = await storage.getAllClients();
      const allProjects = await storage.getAllProjects();
      const allProjectMembers = await storage.getAllProjectMembers();
      
      // Remove password and add project/client info
      const safeUsers = users.map(({ password, ...user }) => {
        // Get projects owned by user
        const ownedProjects = allProjects.filter(p => p.userId === user.id);
        // Get projects where user is a member
        const memberProjectIds = allProjectMembers
          .filter(m => m.userId === user.id)
          .map(m => m.projectId);
        const memberProjects = allProjects.filter(p => memberProjectIds.includes(p.id));
        // Combine and deduplicate
        const userProjects = [...ownedProjects, ...memberProjects.filter(mp => !ownedProjects.some(op => op.id === mp.id))];
        // Get clients for these projects
        const clientIds = [...new Set(userProjects.map(p => p.clientId).filter(Boolean))];
        const userClients = allClients.filter(c => clientIds.includes(c.id));
        
        return {
          ...user,
          projects: userProjects.map(p => ({ id: p.id, name: p.name, clientId: p.clientId })),
          clients: userClients.map(c => ({ id: c.id, name: c.name })),
        };
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Get all clients for admin filters
  app.get("/api/admin/clients", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // Get all projects for admin filters
  app.get("/api/admin/projects", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email já está cadastrado" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "user",
      });

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "create_user",
        targetType: "user",
        targetId: user.id,
        newValue: { email, firstName, lastName, role },
      });

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  // Update user details (admin only)
  app.patch("/api/admin/users/:id", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email } = req.body;
      
      const updated = await storage.updateUser(id, { firstName, lastName, email });
      if (!updated) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "update_user",
        targetType: "user",
        targetId: id,
        newValue: { firstName, lastName, email },
      });

      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Update user role
  app.patch("/api/admin/users/:id/role", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!["user", "admin", "platform_admin"].includes(role)) {
        return res.status(400).json({ message: "Role inválida" });
      }

      const oldUser = await storage.getUser(id);
      const updated = await storage.updateUserRole(id, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "update_user_role",
        targetType: "user",
        targetId: id,
        previousValue: { role: oldUser?.role },
        newValue: { role },
      });

      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Erro ao atualizar role do usuário" });
    }
  });

  // Block/unblock user
  app.patch("/api/admin/users/:id/block", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { blocked } = req.body;
      
      // Don't allow blocking yourself
      if (id === req.user.id) {
        return res.status(400).json({ message: "Você não pode bloquear sua própria conta" });
      }

      const updated = await storage.blockUser(id, !!blocked);
      
      if (!updated) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: blocked ? "block_user" : "unblock_user",
        targetType: "user",
        targetId: id,
        newValue: { blocked },
      });

      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error blocking/unblocking user:", error);
      res.status(500).json({ message: "Erro ao bloquear/desbloquear usuário" });
    }
  });

  // ===== Platform Settings =====
  
  // Get all platform settings
  app.get("/api/admin/settings", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // Get all platform settings (alternate endpoint)
  app.get("/api/admin/platform-settings", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // Get a specific platform setting by key (public for proposal config)
  app.get("/api/platform-settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getPlatformSetting(key);
      if (!setting) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching platform setting:", error);
      res.status(500).json({ message: "Erro ao buscar configuração" });
    }
  });

  // Upsert platform setting
  app.post("/api/admin/settings", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { key, value, description, category } = req.body;
      
      const setting = await storage.upsertPlatformSetting({
        key,
        value,
        description,
        category,
        updatedBy: req.user.id,
      });

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "update_platform_setting",
        targetType: "settings",
        targetId: key,
        newValue: { key, value },
      });

      res.json(setting);
    } catch (error) {
      console.error("Error upserting platform setting:", error);
      res.status(500).json({ message: "Erro ao salvar configuração" });
    }
  });

  // Upsert platform setting by key (PUT)
  app.put("/api/admin/platform-settings/:key", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { value, description, category } = req.body;
      
      const setting = await storage.upsertPlatformSetting({
        key,
        value,
        description,
        category,
        updatedBy: req.user.id,
      });

      // Log the action
      await storage.createAdminAuditLog({
        adminId: req.user.id,
        action: "update_platform_setting",
        targetType: "settings",
        targetId: key,
        newValue: { key, value },
      });

      res.json(setting);
    } catch (error) {
      console.error("Error upserting platform setting:", error);
      res.status(500).json({ message: "Erro ao salvar configuração" });
    }
  });

  // ===== Audit Logs =====
  
  // Get audit logs
  app.get("/api/admin/audit-logs", isAuthenticated, isPlatformAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAdminAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
    }
  });


  // Delete document
  app.delete("/api/projects/:id/documents/:docId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const docId = req.params.docId;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const doc = await storage.getDocument(docId);
      if (!doc || doc.projectId !== projectId) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.deleteDocument(docId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ===== Project Export Routes =====

  // Get available stacks and platforms
  app.get("/api/export/options", isAuthenticated, async (req: any, res) => {
    const { SUPPORTED_STACKS, EXPORT_PLATFORMS } = await import("./export-service");
    res.json({ stacks: SUPPORTED_STACKS, platforms: EXPORT_PLATFORMS });
  });

  // Get exports for a project
  app.get("/api/projects/:id/exports", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { getProjectExports } = await import("./export-service");
      const exports = await getProjectExports(projectId);
      res.json(exports);
    } catch (error) {
      console.error("Error fetching exports:", error);
      res.status(500).json({ message: "Erro ao buscar exports" });
    }
  });

  // Create a new export
  app.post("/api/projects/:id/exports", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { platform, stack } = req.body;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const briefing = await storage.getBriefing(projectId);
      const scope = await storage.getScope(projectId);
      const roadmap = await storage.getRoadmap(projectId);

      const { createProjectExport } = await import("./export-service");
      const result = await createProjectExport(
        projectId,
        userId,
        platform || "zip",
        stack || "react-vite",
        project.name,
        briefing,
        scope,
        roadmap
      );

      res.json(result);
    } catch (error) {
      console.error("Error creating export:", error);
      res.status(500).json({ message: "Erro ao criar export" });
    }
  });

  // Get export status
  app.get("/api/exports/:exportId", isAuthenticated, async (req: any, res) => {
    try {
      const { getExportStatus } = await import("./export-service");
      const exportData = await getExportStatus(req.params.exportId);
      
      if (!exportData) {
        return res.status(404).json({ message: "Export não encontrado" });
      }

      res.json(exportData);
    } catch (error) {
      console.error("Error fetching export:", error);
      res.status(500).json({ message: "Erro ao buscar export" });
    }
  });

  // Download export as ZIP
  app.get("/api/exports/:exportId/download", isAuthenticated, async (req: any, res) => {
    try {
      const { generateZipFromExport, getExportStatus } = await import("./export-service");
      const exportData = await getExportStatus(req.params.exportId);
      
      if (!exportData) {
        return res.status(404).json({ message: "Export não encontrado" });
      }

      const zipBuffer = await generateZipFromExport(req.params.exportId);
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${exportData.stack || 'project'}-export.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error downloading export:", error);
      res.status(500).json({ message: "Erro ao baixar export" });
    }
  });

  // Delete export
  app.delete("/api/exports/:exportId", isAuthenticated, async (req: any, res) => {
    try {
      const { deleteExport } = await import("./export-service");
      await deleteExport(req.params.exportId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting export:", error);
      res.status(500).json({ message: "Erro ao deletar export" });
    }
  });

  // Export to GitHub
  app.post("/api/exports/:exportId/github", isAuthenticated, async (req: any, res) => {
    try {
      const { token, repoName, isPrivate, description } = req.body;
      
      if (!token || !repoName) {
        return res.status(400).json({ message: "Token e nome do repositório são obrigatórios" });
      }

      const { exportToGitHub } = await import("./export-service");
      const result = await exportToGitHub(req.params.exportId, token, repoName, isPrivate, description);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error exporting to GitHub:", error);
      res.status(500).json({ message: "Erro ao exportar para GitHub" });
    }
  });

  // Export to GitLab
  app.post("/api/exports/:exportId/gitlab", isAuthenticated, async (req: any, res) => {
    try {
      const { token, repoName, isPrivate, description } = req.body;
      
      if (!token || !repoName) {
        return res.status(400).json({ message: "Token e nome do repositório são obrigatórios" });
      }

      const { exportToGitLab } = await import("./export-service");
      const result = await exportToGitLab(req.params.exportId, token, repoName, isPrivate, description);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error exporting to GitLab:", error);
      res.status(500).json({ message: "Erro ao exportar para GitLab" });
    }
  });

  // User profile routes
  app.get("/api/users/profile", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });

  app.put("/api/users/profile", isAuthenticated, async (req: any, res) => {
    try {
      const { 
        firstName, lastName, profileImageUrl, 
        jobTitle, phone, instagram, facebook, xHandle, linkedin, youtube 
      } = req.body;
      
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle : undefined,
        phone: phone !== undefined ? phone : undefined,
        instagram: instagram !== undefined ? instagram : undefined,
        facebook: facebook !== undefined ? facebook : undefined,
        xHandle: xHandle !== undefined ? xHandle : undefined,
        linkedin: linkedin !== undefined ? linkedin : undefined,
        youtube: youtube !== undefined ? youtube : undefined,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Update session with new user data
      req.user = updatedUser;
      // Don't send password in response
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  // Password change route
  app.patch("/api/users/profile/password", isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter no mínimo 6 caracteres" });
      }

      // Get current user with password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.user.id, { password: hashedPassword });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/all-users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "platform_admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const allUsers = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "platform_admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { role } = req.body;
      if (!["user", "admin", "platform_admin"].includes(role)) {
        return res.status(400).json({ message: "Role inválido" });
      }

      const updatedUser = await storage.updateUser(req.params.userId, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Erro ao atualizar role" });
    }
  });

  // ===== Commercial Proposals =====

  // Generate proposal for a project
  app.post("/api/projects/:id/proposals/generate", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { hourlyRate, startDate } = req.body;
      const { generateProposalContent, getProposalConfig } = await import("./proposal-service");
      
      const customHourlyRate = hourlyRate ? Number(hourlyRate) : undefined;
      const customStartDate = startDate ? new Date(startDate) : undefined;
      
      const content = await generateProposalContent(projectId, customHourlyRate, customStartDate);
      const config = await getProposalConfig();

      // Check for existing proposals to increment version
      const existingProposals = await storage.getProposalsByProject(projectId);
      const nextVersion = existingProposals.length > 0 
        ? Math.max(...existingProposals.map(p => p.version || 1)) + 1 
        : 1;

      // Create proposal in database
      const proposal = await storage.createProposal({
        projectId,
        version: nextVersion,
        status: "draft",
        executiveSummary: content.executiveSummary,
        methodology: content.methodology,
        deliverables: content.deliverables,
        timeline: [{ description: content.timeline }],
        investment: content.investmentBreakdown,
        paymentTerms: content.paymentTerms,
        termsAndConditions: content.termsAndConditions,
        validity: config.proposalValidity,
        totalHours: content.investmentBreakdown.totalHours,
        hourlyRate: Math.round(content.investmentBreakdown.hourlyRate * 100),
        totalValue: Math.round(content.investmentBreakdown.totalValue * 100),
        technicalInfo: content.technicalInfo,
        schedule: content.schedule,
        startDate: customStartDate || (project.startDate ? new Date(project.startDate) : new Date()),
        hoursPerDay: config.hoursPerDay,
        scopeSection: content.scopeSection,
      });

      res.json(proposal);
    } catch (error) {
      console.error("Error generating proposal:", error);
      res.status(500).json({ message: "Erro ao gerar proposta" });
    }
  });

  // Get proposals for a project
  app.get("/api/projects/:id/proposals", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const proposals = await storage.getProposalsByProject(projectId);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: "Erro ao buscar propostas" });
    }
  });

  // Get a specific proposal
  app.get("/api/proposals/:proposalId", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.proposalId;
      const userId = req.user.id;

      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposta não encontrada" });
      }

      const project = await storage.getProject(proposal.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      res.json(proposal);
    } catch (error) {
      console.error("Error fetching proposal:", error);
      res.status(500).json({ message: "Erro ao buscar proposta" });
    }
  });

  // Update a proposal
  app.put("/api/proposals/:proposalId", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.proposalId;
      const userId = req.user.id;

      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposta não encontrada" });
      }

      const project = await storage.getProject(proposal.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const {
        executiveSummary,
        methodology,
        deliverables,
        timeline,
        investment,
        paymentTerms,
        termsAndConditions,
        technicalInfo,
        schedule,
        startDate,
        hoursPerDay,
        hourlyRate,
        status,
        validity,
      } = req.body;

      // Build update object with only provided fields
      const updateData: any = {};
      if (executiveSummary !== undefined) updateData.executiveSummary = executiveSummary;
      if (methodology !== undefined) updateData.methodology = methodology;
      if (deliverables !== undefined) updateData.deliverables = deliverables;
      if (timeline !== undefined) updateData.timeline = timeline;
      if (investment !== undefined) updateData.investment = investment;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
      if (termsAndConditions !== undefined) updateData.termsAndConditions = termsAndConditions;
      if (technicalInfo !== undefined) updateData.technicalInfo = technicalInfo;
      if (schedule !== undefined) updateData.schedule = schedule;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (hoursPerDay !== undefined) updateData.hoursPerDay = hoursPerDay;
      if (hourlyRate !== undefined) updateData.hourlyRate = Math.round(Number(hourlyRate) * 100);
      if (status !== undefined) updateData.status = status;
      if (validity !== undefined) updateData.validity = validity;

      // Recalculate total if hourlyRate changed
      if (hourlyRate !== undefined && proposal.investment) {
        const { recalculateInvestment } = await import("./proposal-service");
        const currentInvestment = proposal.investment as any;
        const newInvestment = recalculateInvestment(currentInvestment, Number(hourlyRate));
        updateData.investment = newInvestment;
        updateData.totalValue = Math.round(newInvestment.totalValue * 100);
      }

      // Recalculate schedule if startDate or hoursPerDay changed
      if ((startDate !== undefined || hoursPerDay !== undefined) && proposal.investment) {
        const { recalculateSchedule } = await import("./proposal-service");
        const currentInvestment = proposal.investment as any;
        const newStartDate = startDate ? new Date(startDate) : proposal.startDate || new Date();
        const newHoursPerDay = hoursPerDay || proposal.hoursPerDay || 8;
        updateData.schedule = recalculateSchedule(currentInvestment.phases || [], newStartDate, newHoursPerDay);
      }

      const updated = await storage.updateProposal(proposalId, updateData);

      res.json(updated);
    } catch (error) {
      console.error("Error updating proposal:", error);
      res.status(500).json({ message: "Erro ao atualizar proposta" });
    }
  });

  // Recalculate proposal investment with new hourly rate
  app.post("/api/proposals/:proposalId/recalculate", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.proposalId;
      const userId = req.user.id;
      const { hourlyRate, startDate, hoursPerDay } = req.body;

      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposta não encontrada" });
      }

      const project = await storage.getProject(proposal.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { recalculateInvestment, recalculateSchedule } = await import("./proposal-service");
      const currentInvestment = proposal.investment as any;
      
      const newHourlyRate = hourlyRate ? Number(hourlyRate) : (proposal.hourlyRate || 0) / 100;
      const newStartDate = startDate ? new Date(startDate) : proposal.startDate || new Date();
      const newHoursPerDay = hoursPerDay ? Number(hoursPerDay) : proposal.hoursPerDay || 8;

      const newInvestment = recalculateInvestment(currentInvestment, newHourlyRate);
      const newSchedule = recalculateSchedule(currentInvestment.phases || [], newStartDate, newHoursPerDay);

      const updated = await storage.updateProposal(proposalId, {
        investment: newInvestment,
        schedule: newSchedule,
        hourlyRate: Math.round(newHourlyRate * 100),
        totalValue: Math.round(newInvestment.totalValue * 100),
        startDate: newStartDate,
        hoursPerDay: newHoursPerDay,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error recalculating proposal:", error);
      res.status(500).json({ message: "Erro ao recalcular proposta" });
    }
  });

  // Download proposal as Word document
  app.get("/api/proposals/:proposalId/download", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.proposalId;
      const userId = req.user.id;

      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposta não encontrada" });
      }

      const project = await storage.getProject(proposal.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const client = project.clientId ? await storage.getClient(project.clientId) : null;
      const { getProposalConfig, formatCurrency } = await import("./proposal-service");
      const config = await getProposalConfig();

      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, PageBreak, Header, Footer, ShadingType } = await import("docx");

      const investment = proposal.investment as any;
      const validUntilDate = proposal.validity 
        ? new Date(new Date(proposal.createdAt!).getTime() + proposal.validity * 24 * 60 * 60 * 1000) 
        : null;
      
      const primaryColor = "1F2937";
      const headerBgColor = "111827";
      const lightBgColor = "F3F4F6";
      
      const createSectionTitle = (number: string, title: string) => new Paragraph({
        children: [
          new TextRun({ text: `${number}. ${title}`, bold: true, size: 28, color: primaryColor }),
        ],
        spacing: { before: 400, after: 200 },
      });
      
      const createParagraphText = (text: string) => new Paragraph({
        children: [new TextRun({ text, size: 22 })],
        spacing: { after: 280, line: 300 },
      });
      
      const scopeSection = proposal.scopeSection as any;
      
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: "Calibri",
                size: 22,
              },
            },
            heading1: {
              run: {
                font: "Calibri",
                size: 28,
                bold: true,
                color: primaryColor,
              },
            },
            heading2: {
              run: {
                font: "Calibri",
                size: 24,
                bold: true,
                color: "374151",
              },
            },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1134,
                right: 1134,
                bottom: 1134,
                left: 1134,
              },
            },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "PROPOSTA COMERCIAL", 
                  bold: true, 
                  size: 48,
                  color: primaryColor,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: project.name, 
                  bold: true, 
                  size: 32,
                  italics: true,
                  color: "4B5563",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "CONTRATANTE", bold: true, size: 22, color: "FFFFFF" })],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: headerBgColor, type: ShadingType.SOLID },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "CONTRATADO", bold: true, size: 22, color: "FFFFFF" })],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: headerBgColor, type: ShadingType.SOLID },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: client?.name || "Cliente não especificado", bold: true, size: 22 })],
                          spacing: { after: 80 },
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: client?.company || "", size: 20, color: "6B7280" })],
                          spacing: { after: 80 },
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: client?.email || "", size: 20, color: "6B7280" })],
                          spacing: { after: 80 },
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: client?.phone || "", size: 20, color: "6B7280" })],
                        }),
                      ],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: config.companyName || "Empresa Prestadora", bold: true, size: 22 })],
                          spacing: { after: 80 },
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: config.companyDescription ? config.companyDescription.substring(0, 100) + "..." : "", size: 20, color: "6B7280" })],
                        }),
                      ],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 8, color: primaryColor },
                bottom: { style: BorderStyle.SINGLE, size: 8, color: primaryColor },
                left: { style: BorderStyle.SINGLE, size: 8, color: primaryColor },
                right: { style: BorderStyle.SINGLE, size: 8, color: primaryColor },
              },
            }),
            new Paragraph({ text: "" }),
            
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Data de Emissão: ", bold: true, size: 20 }),
                            new TextRun({ text: new Date().toLocaleDateString("pt-BR"), size: 20 }),
                          ],
                        }),
                      ],
                      borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Válido até: ", bold: true, size: 20 }),
                            new TextRun({ text: validUntilDate ? validUntilDate.toLocaleDateString("pt-BR") : "N/A", size: 20 }),
                          ],
                          alignment: AlignmentType.RIGHT,
                        }),
                      ],
                      borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            createSectionTitle("1", "RESUMO EXECUTIVO"),
            ...(proposal.executiveSummary || "").split(/\n\n|\n/).filter((p: string) => p.trim()).map((p: string) => createParagraphText(p.trim())),
            new Paragraph({ text: "" }),

            createSectionTitle("2", "ESCOPO DO PROJETO"),
            ...(scopeSection?.objective ? [
              new Paragraph({
                children: [new TextRun({ text: "Objetivo:", bold: true, size: 22 })],
                spacing: { after: 80 },
              }),
              createParagraphText(scopeSection.objective),
            ] : []),
            ...(scopeSection?.features && scopeSection.features.length > 0 ? [
              new Paragraph({ text: "" }),
              new Paragraph({
                children: [new TextRun({ text: "Funcionalidades Incluídas:", bold: true, size: 22, color: "059669" })],
                spacing: { after: 80 },
              }),
              ...scopeSection.features.map((f: string) => new Paragraph({
                children: [new TextRun({ text: `✓ ${f}`, size: 20, color: "059669" })],
                spacing: { after: 60 },
              })),
            ] : []),
            ...(scopeSection?.exclusions && scopeSection.exclusions.length > 0 ? [
              new Paragraph({ text: "" }),
              new Paragraph({
                children: [new TextRun({ text: "Itens Não Incluídos:", bold: true, size: 22, color: "DC2626" })],
                spacing: { after: 80 },
              }),
              ...scopeSection.exclusions.map((e: string) => new Paragraph({
                children: [new TextRun({ text: `✗ ${e}`, size: 20, color: "DC2626" })],
                spacing: { after: 60 },
              })),
            ] : []),
            new Paragraph({ text: "" }),

            createSectionTitle("3", "METODOLOGIA"),
            ...(proposal.methodology || "").split(/\n\n|\n/).filter((p: string) => p.trim()).map((p: string) => createParagraphText(p.trim())),
            new Paragraph({ text: "" }),

            createSectionTitle("4", "ENTREGAS"),
            ...((proposal.deliverables as any[] || []).map(d => 
              new Paragraph({
                children: [new TextRun({ text: `• ${typeof d === "string" ? d : d.name || d}`, size: 22 })],
                spacing: { after: 80 },
              })
            )),
            new Paragraph({ text: "" }),

            ...(proposal.technicalInfo ? (() => {
              const techInfo = proposal.technicalInfo as any;
              const techParagraphs: any[] = [];
              
              techParagraphs.push(createSectionTitle("5", "ESPECIFICAÇÕES TÉCNICAS"));

              if (techInfo.stack && techInfo.stack.length > 0) {
                techParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: "Stack Tecnológico: ", bold: true, size: 22 })],
                  spacing: { after: 80 },
                }));
                techParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: techInfo.stack.join(", "), size: 22 })],
                  spacing: { after: 120 },
                }));
              }

              if (techInfo.architecture) {
                techParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: "Arquitetura: ", bold: true, size: 22 })],
                  spacing: { after: 80 },
                }));
                techParagraphs.push(createParagraphText(techInfo.architecture));
              }

              if (techInfo.integrations && techInfo.integrations.length > 0) {
                techParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: "Integrações: ", bold: true, size: 22 })],
                  spacing: { after: 80 },
                }));
                techInfo.integrations.forEach((integration: string) => {
                  techParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: `• ${integration}`, size: 22 })],
                    spacing: { after: 60 },
                  }));
                });
              }

              if (techInfo.nonFunctionalRequirements && techInfo.nonFunctionalRequirements.length > 0) {
                techParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: "Requisitos Não-Funcionais: ", bold: true, size: 22 })],
                  spacing: { after: 80 },
                }));
                techInfo.nonFunctionalRequirements.forEach((req: string) => {
                  techParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: `• ${req}`, size: 22 })],
                    spacing: { after: 60 },
                  }));
                });
              }

              techParagraphs.push(new Paragraph({ text: "" }));
              return techParagraphs;
            })() : []),

            ...(proposal.schedule && (proposal.schedule as any[]).length > 0 ? (() => {
              const scheduleData = proposal.schedule as any[];
              const schedParagraphs: any[] = [];
              
              const firstPhaseStart = scheduleData.length > 0 ? new Date(scheduleData[0].startDate) : new Date();
              const lastPhaseEnd = scheduleData.length > 0 ? new Date(scheduleData[scheduleData.length - 1].endDate) : new Date();
              const totalHours = scheduleData.reduce((sum: number, p: any) => sum + (p.hours || 0), 0);
              const totalDays = scheduleData.reduce((sum: number, p: any) => sum + (p.workingDays || 0), 0);
              
              schedParagraphs.push(createSectionTitle("6", "CRONOGRAMA DE ENTREGAS"));
              
              schedParagraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: "Período: ", bold: true, size: 22 }),
                  new TextRun({ text: `${firstPhaseStart.toLocaleDateString("pt-BR")} a ${lastPhaseEnd.toLocaleDateString("pt-BR")}`, size: 22 }),
                ],
                spacing: { after: 40 },
              }));
              
              schedParagraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: "Previsão de Entrega Final: ", bold: true, size: 22 }),
                  new TextRun({ text: lastPhaseEnd.toLocaleDateString("pt-BR"), bold: true, size: 22 }),
                  new TextRun({ text: `  (${totalHours}h - ${totalDays} dias úteis)`, size: 20, color: "4B5563" }),
                ],
                spacing: { after: 160 },
              }));

              scheduleData.forEach((phase: any, index: number) => {
                const startDate = new Date(phase.startDate).toLocaleDateString("pt-BR");
                const endDate = new Date(phase.endDate).toLocaleDateString("pt-BR");
                
                schedParagraphs.push(new Paragraph({
                  children: [
                    new TextRun({ text: `${index + 1}. ${phase.phaseName}`, bold: true, size: 24 }),
                    new TextRun({ text: `  (${phase.hours}h - ${phase.workingDays} dias úteis)`, size: 20, color: "6B7280" }),
                  ],
                  spacing: { before: 200, after: 60 },
                }));
                
                schedParagraphs.push(new Paragraph({
                  children: [new TextRun({ text: `${startDate} - ${endDate}`, size: 20, color: "374151" })],
                  spacing: { after: 80 },
                }));
                
                if (phase.milestones && phase.milestones.length > 0) {
                  schedParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: "Marcos:", bold: true, size: 20, color: "4B5563" })],
                    spacing: { after: 40 },
                  }));
                  
                  phase.milestones.forEach((milestone: string) => {
                    schedParagraphs.push(new Paragraph({
                      children: [new TextRun({ text: `• ${milestone}`, size: 20, color: "4B5563" })],
                      spacing: { after: 30 },
                      indent: { left: 360 },
                    }));
                  });
                }
              });

              schedParagraphs.push(new Paragraph({ text: "" }));
              return schedParagraphs;
            })() : [
              createSectionTitle("6", "CRONOGRAMA"),
              createParagraphText(typeof proposal.timeline === "string" ? proposal.timeline : ""),
              new Paragraph({ text: "" }),
            ]),

            createSectionTitle("7", "INVESTIMENTO"),
            ...(() => {
              const investParagraphs: any[] = [];
              
              (investment?.phases || []).forEach((phase: any, index: number) => {
                const deliverablesSummary = phase.deliverables && phase.deliverables.length > 0
                  ? phase.deliverables.slice(0, 3).join(", ") + (phase.deliverables.length > 3 ? ` +${phase.deliverables.length - 3}` : "")
                  : "";
                
                investParagraphs.push(new Paragraph({
                  children: [
                    new TextRun({ text: phase.name, bold: true, size: 22 }),
                  ],
                  spacing: { before: index === 0 ? 0 : 160, after: 40 },
                  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" } },
                }));
                
                if (deliverablesSummary) {
                  investParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: deliverablesSummary, size: 18, color: "6B7280", italics: true })],
                    spacing: { after: 60 },
                  }));
                }
                
                investParagraphs.push(new Paragraph({
                  children: [
                    new TextRun({ text: `${phase.hours}h`, size: 20 }),
                    new TextRun({ text: "  |  ", size: 20, color: "9CA3AF" }),
                    new TextRun({ text: formatCurrency(phase.value), bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }));
              });
              
              investParagraphs.push(new Paragraph({
                children: [
                  new TextRun({ text: "TOTAL: ", bold: true, size: 24 }),
                  new TextRun({ text: `${investment?.totalHours || 0}h`, size: 22 }),
                  new TextRun({ text: "  |  ", size: 22, color: "9CA3AF" }),
                  new TextRun({ text: formatCurrency(investment?.totalValue || 0), bold: true, size: 24, color: "FFFFFF" }),
                ],
                spacing: { before: 200, after: 80 },
                shading: { fill: lightBgColor, type: ShadingType.SOLID },
              }));
              
              return investParagraphs;
            })(),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: `Valor hora: ${formatCurrency((proposal.hourlyRate || 15000) / 100)}`, size: 18, color: "6B7280", italics: true })],
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({ text: "" }),

            createSectionTitle("8", "CONDIÇÕES DE PAGAMENTO"),
            ...(proposal.paymentTerms || "").split("\n").filter((p: string) => p.trim()).map((p: string) => createParagraphText(p.trim())),
            new Paragraph({ text: "" }),

            ...(proposal.termsAndConditions ? (() => {
              const termsParagraphs: any[] = [];
              termsParagraphs.push(createSectionTitle("9", "TERMOS E CONDIÇÕES"));
              
              const terms = proposal.termsAndConditions.split(/\n\n|\d+\.\s+/g).filter((p: string) => p.trim());
              terms.forEach((term: string) => {
                termsParagraphs.push(createParagraphText(term.trim()));
              });
              
              termsParagraphs.push(new Paragraph({ text: "" }));
              return termsParagraphs;
            })() : []),

            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "─".repeat(40), color: primaryColor }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: config.companyName || "Equipe de Desenvolvimento", bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: "Proposta gerada automaticamente", size: 18, color: "9CA3AF", italics: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      const filename = `proposta_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_v${proposal.version}.docx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading proposal:", error);
      res.status(500).json({ message: "Erro ao gerar documento" });
    }
  });

  return httpServer;
}
