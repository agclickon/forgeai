import {
  users,
  clients,
  projects,
  briefings,
  scopes,
  roadmaps,
  stages,
  tasks,
  checklists,
  documents,
  aiCommands,
  vaultItems,
  mindMaps,
  agentAnalyses,
  orchestratorSessions,
  projectMembers,
  stageAssignments,
  progressLogs,
  projectInvites,
  scopeVersions,
  projectDiagrams,
  projectWbs,
  platformSettings,
  aiProviders,
  platformUsageLogs,
  adminAuditLogs,
  projectExports,
  clientFeedbacks,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Project,
  type InsertProject,
  type Briefing,
  type InsertBriefing,
  type Scope,
  type InsertScope,
  type Roadmap,
  type InsertRoadmap,
  type Stage,
  type InsertStage,
  type Task,
  type InsertTask,
  type Checklist,
  type InsertChecklist,
  type Document,
  type InsertDocument,
  type AiCommand,
  type InsertAiCommand,
  type VaultItem,
  type InsertVaultItem,
  type AgentAnalysis,
  type InsertAgentAnalysis,
  type OrchestratorSession,
  type InsertOrchestratorSession,
  type ProjectMember,
  type InsertProjectMember,
  type StageAssignment,
  type InsertStageAssignment,
  type ProgressLog,
  type InsertProgressLog,
  type ProjectInvite,
  type InsertProjectInvite,
  type ScopeVersion,
  type InsertScopeVersion,
  type ProjectDiagram,
  type InsertProjectDiagram,
  type ProjectWbs,
  type InsertProjectWbs,
  type PlatformSetting,
  type InsertPlatformSetting,
  type AiProvider,
  type InsertAiProvider,
  type PlatformUsageLog,
  type InsertPlatformUsageLog,
  type AdminAuditLog,
  type InsertAdminAuditLog,
  type ProjectExport,
  type InsertProjectExport,
  type ClientFeedback,
  type InsertClientFeedback,
  proposals,
  type Proposal,
  type InsertProposal,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, "id">): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;

  // Client operations
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Briefing operations
  getBriefing(projectId: string): Promise<Briefing | undefined>;
  createBriefing(data: InsertBriefing): Promise<Briefing>;
  updateBriefing(projectId: string, data: Partial<InsertBriefing>): Promise<Briefing | undefined>;

  // Scope operations
  getScope(projectId: string): Promise<Scope | undefined>;
  createScope(data: InsertScope): Promise<Scope>;
  updateScope(projectId: string, data: Partial<InsertScope>): Promise<Scope | undefined>;

  // Roadmap operations
  getRoadmap(projectId: string): Promise<Roadmap | undefined>;
  createRoadmap(data: InsertRoadmap): Promise<Roadmap>;
  updateRoadmap(projectId: string, data: Partial<InsertRoadmap>): Promise<Roadmap | undefined>;

  // Stage operations
  getStages(projectId: string): Promise<Stage[]>;
  getStage(id: string): Promise<Stage | undefined>;
  createStage(data: InsertStage): Promise<Stage>;
  updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined>;
  deleteStage(id: string): Promise<boolean>;

  // Task operations
  getTasks(stageId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Checklist operations
  getChecklists(projectId: string): Promise<Checklist[]>;
  getChecklist(id: string): Promise<Checklist | undefined>;
  createChecklist(data: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: string, data: Partial<InsertChecklist>): Promise<Checklist | undefined>;

  // Document operations
  getDocuments(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;

  // AI Command operations
  getAiCommand(projectId: string): Promise<AiCommand | undefined>;
  createAiCommand(data: InsertAiCommand): Promise<AiCommand>;
  updateAiCommand(id: string, data: Partial<InsertAiCommand>): Promise<AiCommand | undefined>;

  // Vault operations
  getVaultItems(projectId: string): Promise<VaultItem[]>;
  getVaultItem(id: string): Promise<VaultItem | undefined>;
  createVaultItem(data: InsertVaultItem): Promise<VaultItem>;
  updateVaultItem(id: string, data: Partial<InsertVaultItem>): Promise<VaultItem | undefined>;
  deleteVaultItem(id: string): Promise<boolean>;

  // Agent Analysis operations
  getAgentAnalyses(projectId: string): Promise<AgentAnalysis[]>;
  getAgentAnalysis(id: string): Promise<AgentAnalysis | undefined>;
  getAgentAnalysisByType(projectId: string, agentType: string): Promise<AgentAnalysis | undefined>;
  createAgentAnalysis(data: InsertAgentAnalysis): Promise<AgentAnalysis>;
  updateAgentAnalysis(id: string, data: Partial<InsertAgentAnalysis>): Promise<AgentAnalysis | undefined>;
  deleteAgentAnalysis(id: string): Promise<boolean>;

  // Orchestrator Session operations
  getOrchestratorSessions(projectId: string): Promise<OrchestratorSession[]>;
  getOrchestratorSession(id: string): Promise<OrchestratorSession | undefined>;
  createOrchestratorSession(data: InsertOrchestratorSession): Promise<OrchestratorSession>;
  updateOrchestratorSession(id: string, data: Partial<OrchestratorSession>): Promise<OrchestratorSession | undefined>;

  // Project Member operations
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  getProjectMember(id: string): Promise<ProjectMember | undefined>;
  getProjectMemberByEmail(projectId: string, email: string): Promise<ProjectMember | undefined>;
  getProjectMemberByUserId(projectId: string, userId: string): Promise<ProjectMember | undefined>;
  getProjectsByMemberUserId(userId: string): Promise<Project[]>;
  createProjectMember(data: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMember(id: string, data: Partial<InsertProjectMember>): Promise<ProjectMember | undefined>;
  deleteProjectMember(id: string): Promise<boolean>;

  // Stage Assignment operations
  getStageAssignments(stageId: string): Promise<StageAssignment[]>;
  getStageAssignment(id: string): Promise<StageAssignment | undefined>;
  getAssignmentsByMember(memberId: string): Promise<StageAssignment[]>;
  createStageAssignment(data: InsertStageAssignment): Promise<StageAssignment>;
  deleteStageAssignment(id: string): Promise<boolean>;

  // Progress Log operations
  getProgressLogs(stageId: string): Promise<ProgressLog[]>;
  getRecentActivityLogs(userId: string, limit?: number): Promise<any[]>;
  getAllActivityLogs(userId: string): Promise<any[]>;
  createProgressLog(data: InsertProgressLog): Promise<ProgressLog>;

  // Project Invite operations
  getInviteByToken(token: string): Promise<ProjectInvite | undefined>;
  createInvite(data: InsertProjectInvite): Promise<ProjectInvite>;
  acceptInvite(token: string): Promise<ProjectInvite | undefined>;
  expireInvite(id: string): Promise<boolean>;

  // Scope Version operations
  getScopeVersions(scopeId: string): Promise<ScopeVersion[]>;
  getScopeVersion(id: string): Promise<ScopeVersion | undefined>;
  getLatestScopeVersion(scopeId: string): Promise<ScopeVersion | undefined>;
  createScopeVersion(data: InsertScopeVersion): Promise<ScopeVersion>;

  // Project Diagram operations
  getProjectDiagrams(projectId: string): Promise<ProjectDiagram[]>;
  getProjectDiagram(id: string): Promise<ProjectDiagram | undefined>;
  getProjectDiagramByType(projectId: string, type: string): Promise<ProjectDiagram | undefined>;
  createProjectDiagram(data: InsertProjectDiagram): Promise<ProjectDiagram>;
  updateProjectDiagram(id: string, data: Partial<InsertProjectDiagram>): Promise<ProjectDiagram | undefined>;
  deleteProjectDiagram(id: string): Promise<boolean>;

  // Project WBS operations
  getProjectWbs(projectId: string): Promise<ProjectWbs | undefined>;
  createProjectWbs(data: InsertProjectWbs): Promise<ProjectWbs>;
  updateProjectWbs(projectId: string, data: Partial<InsertProjectWbs>): Promise<ProjectWbs | undefined>;
  deleteProjectWbs(projectId: string): Promise<boolean>;

  // Admin - User operations
  getAllUsers(): Promise<User[]>;
  getAllClients(): Promise<Client[]>;
  getAllProjects(): Promise<Project[]>;
  getAllProjectMembers(): Promise<ProjectMember[]>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  blockUser(userId: string, blocked: boolean): Promise<User | undefined>;

  // Admin - Platform Settings operations
  getPlatformSettings(): Promise<PlatformSetting[]>;
  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  upsertPlatformSetting(data: InsertPlatformSetting): Promise<PlatformSetting>;
  deletePlatformSetting(key: string): Promise<boolean>;

  // Admin - AI Provider operations
  getAiProviders(): Promise<AiProvider[]>;
  getActiveAiProviders(): Promise<AiProvider[]>;
  getAiProvider(id: string): Promise<AiProvider | undefined>;
  createAiProvider(data: InsertAiProvider): Promise<AiProvider>;
  updateAiProvider(id: string, data: Partial<InsertAiProvider>): Promise<AiProvider | undefined>;
  deleteAiProvider(id: string): Promise<boolean>;
  reorderAiProviders(providerIds: string[]): Promise<AiProvider[]>;

  // Admin - Platform Usage Logs
  createPlatformUsageLog(data: InsertPlatformUsageLog): Promise<PlatformUsageLog>;
  getPlatformUsageLogs(limit?: number): Promise<PlatformUsageLog[]>;

  // Admin - Audit Logs
  createAdminAuditLog(data: InsertAdminAuditLog): Promise<AdminAuditLog>;
  getAdminAuditLogs(limit?: number): Promise<AdminAuditLog[]>;

  // Admin - Statistics
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    totalClients: number;
    activeProviders: number;
  }>;

  // Project Export operations
  getProjectExports(projectId: string): Promise<ProjectExport[]>;
  getProjectExport(id: string): Promise<ProjectExport | undefined>;
  createProjectExport(data: InsertProjectExport): Promise<ProjectExport>;
  updateProjectExport(id: string, data: Partial<InsertProjectExport>): Promise<ProjectExport | undefined>;
  deleteProjectExport(id: string): Promise<boolean>;

  // Client Feedback operations
  getClientFeedbacks(clientId: string): Promise<ClientFeedback[]>;
  getClientFeedbacksByProject(projectId: string): Promise<ClientFeedback[]>;
  getClientFeedback(id: string): Promise<ClientFeedback | undefined>;
  createClientFeedback(data: InsertClientFeedback): Promise<ClientFeedback>;
  updateClientFeedback(id: string, data: Partial<InsertClientFeedback>): Promise<ClientFeedback | undefined>;
  deleteClientFeedback(id: string): Promise<boolean>;
  getAllClientFeedbacks(): Promise<ClientFeedback[]>;

  // Client Portal operations
  getClientByPortalEmail(email: string): Promise<Client | undefined>;
  updateClientPortalLastLogin(clientId: string): Promise<Client | undefined>;

  // Proposal operations
  getProposal(projectId: string): Promise<Proposal | undefined>;
  getProposalById(id: string): Promise<Proposal | undefined>;
  getProposalsByProject(projectId: string): Promise<Proposal[]>;
  createProposal(data: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, data: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, "id">): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Client operations
  async getClients(userId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProjectsByClient(clientId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(orchestratorSessions).where(eq(orchestratorSessions.projectId, id));
    await db.delete(agentAnalyses).where(eq(agentAnalyses.projectId, id));
    await db.delete(mindMaps).where(eq(mindMaps.projectId, id));
    await db.delete(vaultItems).where(eq(vaultItems.projectId, id));
    await db.delete(aiCommands).where(eq(aiCommands.projectId, id));
    await db.delete(documents).where(eq(documents.projectId, id));
    await db.delete(checklists).where(eq(checklists.projectId, id));
    const projectStages = await db.select().from(stages).where(eq(stages.projectId, id));
    for (const stage of projectStages) {
      await db.delete(tasks).where(eq(tasks.stageId, stage.id));
    }
    await db.delete(stages).where(eq(stages.projectId, id));
    await db.delete(roadmaps).where(eq(roadmaps.projectId, id));
    await db.delete(scopes).where(eq(scopes.projectId, id));
    await db.delete(briefings).where(eq(briefings.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Briefing operations
  async getBriefing(projectId: string): Promise<Briefing | undefined> {
    const [briefing] = await db.select().from(briefings).where(eq(briefings.projectId, projectId));
    return briefing;
  }

  async createBriefing(data: InsertBriefing): Promise<Briefing> {
    const [briefing] = await db.insert(briefings).values(data).returning();
    return briefing;
  }

  async updateBriefing(projectId: string, data: Partial<InsertBriefing>): Promise<Briefing | undefined> {
    const [briefing] = await db
      .update(briefings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(briefings.projectId, projectId))
      .returning();
    return briefing;
  }

  // Scope operations
  async getScope(projectId: string): Promise<Scope | undefined> {
    const [scope] = await db.select().from(scopes).where(eq(scopes.projectId, projectId));
    return scope;
  }

  async createScope(data: InsertScope): Promise<Scope> {
    const [scope] = await db.insert(scopes).values(data).returning();
    return scope;
  }

  async updateScope(projectId: string, data: Partial<InsertScope>): Promise<Scope | undefined> {
    const [scope] = await db
      .update(scopes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scopes.projectId, projectId))
      .returning();
    return scope;
  }

  // Roadmap operations
  async getRoadmap(projectId: string): Promise<Roadmap | undefined> {
    const [roadmap] = await db.select().from(roadmaps).where(eq(roadmaps.projectId, projectId));
    return roadmap;
  }

  async createRoadmap(data: InsertRoadmap): Promise<Roadmap> {
    const [roadmap] = await db.insert(roadmaps).values(data).returning();
    return roadmap;
  }

  async updateRoadmap(projectId: string, data: Partial<InsertRoadmap>): Promise<Roadmap | undefined> {
    const [roadmap] = await db
      .update(roadmaps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roadmaps.projectId, projectId))
      .returning();
    return roadmap;
  }

  // Stage operations
  async getStages(projectId: string): Promise<Stage[]> {
    return db.select().from(stages).where(eq(stages.projectId, projectId));
  }

  async getStage(id: string): Promise<Stage | undefined> {
    const [stage] = await db.select().from(stages).where(eq(stages.id, id));
    return stage;
  }

  async createStage(data: InsertStage): Promise<Stage> {
    const [stage] = await db.insert(stages).values(data).returning();
    return stage;
  }

  async updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined> {
    const [stage] = await db
      .update(stages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stages.id, id))
      .returning();
    return stage;
  }

  async deleteStage(id: string): Promise<boolean> {
    await db.delete(stages).where(eq(stages.id, id));
    return true;
  }

  // Task operations
  async getTasks(stageId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.stageId, stageId));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  // Checklist operations
  async getChecklists(projectId: string): Promise<Checklist[]> {
    return db.select().from(checklists).where(eq(checklists.projectId, projectId));
  }

  async getChecklist(id: string): Promise<Checklist | undefined> {
    const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id));
    return checklist;
  }

  async createChecklist(data: InsertChecklist): Promise<Checklist> {
    const [checklist] = await db.insert(checklists).values(data).returning();
    return checklist;
  }

  async updateChecklist(id: string, data: Partial<InsertChecklist>): Promise<Checklist | undefined> {
    const [checklist] = await db
      .update(checklists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(checklists.id, id))
      .returning();
    return checklist;
  }

  // Document operations
  async getDocuments(projectId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.projectId, projectId));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(data).returning();
    return document;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // AI Command operations
  async getAiCommand(projectId: string): Promise<AiCommand | undefined> {
    const [command] = await db.select().from(aiCommands).where(eq(aiCommands.projectId, projectId));
    return command;
  }

  async createAiCommand(data: InsertAiCommand): Promise<AiCommand> {
    const [command] = await db.insert(aiCommands).values(data).returning();
    return command;
  }

  async updateAiCommand(id: string, data: Partial<InsertAiCommand>): Promise<AiCommand | undefined> {
    const [command] = await db
      .update(aiCommands)
      .set(data)
      .where(eq(aiCommands.id, id))
      .returning();
    return command;
  }

  // Vault operations
  async getVaultItems(projectId: string): Promise<VaultItem[]> {
    return db.select().from(vaultItems).where(eq(vaultItems.projectId, projectId)).orderBy(desc(vaultItems.createdAt));
  }

  async getVaultItem(id: string): Promise<VaultItem | undefined> {
    const [item] = await db.select().from(vaultItems).where(eq(vaultItems.id, id));
    return item;
  }

  async createVaultItem(data: InsertVaultItem): Promise<VaultItem> {
    const [item] = await db.insert(vaultItems).values(data).returning();
    return item;
  }

  async updateVaultItem(id: string, data: Partial<InsertVaultItem>): Promise<VaultItem | undefined> {
    const [item] = await db
      .update(vaultItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vaultItems.id, id))
      .returning();
    return item;
  }

  async deleteVaultItem(id: string): Promise<boolean> {
    const result = await db.delete(vaultItems).where(eq(vaultItems.id, id));
    return true;
  }

  // Agent Analysis operations
  async getAgentAnalyses(projectId: string): Promise<AgentAnalysis[]> {
    return db.select().from(agentAnalyses).where(eq(agentAnalyses.projectId, projectId)).orderBy(desc(agentAnalyses.createdAt));
  }

  async getAgentAnalysis(id: string): Promise<AgentAnalysis | undefined> {
    const [analysis] = await db.select().from(agentAnalyses).where(eq(agentAnalyses.id, id));
    return analysis;
  }

  async getAgentAnalysisByType(projectId: string, agentType: string): Promise<AgentAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(agentAnalyses)
      .where(and(eq(agentAnalyses.projectId, projectId), eq(agentAnalyses.agentType, agentType)))
      .orderBy(desc(agentAnalyses.createdAt));
    return analysis;
  }

  async createAgentAnalysis(data: InsertAgentAnalysis): Promise<AgentAnalysis> {
    const [analysis] = await db.insert(agentAnalyses).values(data).returning();
    return analysis;
  }

  async updateAgentAnalysis(id: string, data: Partial<InsertAgentAnalysis>): Promise<AgentAnalysis | undefined> {
    const [analysis] = await db
      .update(agentAnalyses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentAnalyses.id, id))
      .returning();
    return analysis;
  }

  async deleteAgentAnalysis(id: string): Promise<boolean> {
    await db.delete(agentAnalyses).where(eq(agentAnalyses.id, id));
    return true;
  }

  // Orchestrator Session operations
  async getOrchestratorSessions(projectId: string): Promise<OrchestratorSession[]> {
    return db.select().from(orchestratorSessions).where(eq(orchestratorSessions.projectId, projectId)).orderBy(desc(orchestratorSessions.createdAt));
  }

  async getOrchestratorSession(id: string): Promise<OrchestratorSession | undefined> {
    const [session] = await db.select().from(orchestratorSessions).where(eq(orchestratorSessions.id, id));
    return session;
  }

  async createOrchestratorSession(data: InsertOrchestratorSession): Promise<OrchestratorSession> {
    const [session] = await db.insert(orchestratorSessions).values(data).returning();
    return session;
  }

  async updateOrchestratorSession(id: string, data: Partial<OrchestratorSession>): Promise<OrchestratorSession | undefined> {
    const [session] = await db
      .update(orchestratorSessions)
      .set(data)
      .where(eq(orchestratorSessions.id, id))
      .returning();
    return session;
  }

  // Project Member operations
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)).orderBy(desc(projectMembers.createdAt));
  }

  async getProjectMember(id: string): Promise<ProjectMember | undefined> {
    const [member] = await db.select().from(projectMembers).where(eq(projectMembers.id, id));
    return member;
  }

  async getProjectMemberByEmail(projectId: string, email: string): Promise<ProjectMember | undefined> {
    const [member] = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.email, email))
    );
    return member;
  }

  async getProjectMemberByUserId(projectId: string, userId: string): Promise<ProjectMember | undefined> {
    const [member] = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
    );
    return member;
  }

  async getProjectsByMemberUserId(userId: string): Promise<Project[]> {
    const memberProjects = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    
    if (memberProjects.length === 0) return [];
    
    const projectIds = memberProjects.map(m => m.projectId);
    const result: Project[] = [];
    for (const projectId of projectIds) {
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (project) result.push(project);
    }
    return result;
  }

  async createProjectMember(data: InsertProjectMember): Promise<ProjectMember> {
    const [member] = await db.insert(projectMembers).values(data).returning();
    return member;
  }

  async updateProjectMember(id: string, data: Partial<InsertProjectMember>): Promise<ProjectMember | undefined> {
    const [member] = await db
      .update(projectMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectMembers.id, id))
      .returning();
    return member;
  }

  async deleteProjectMember(id: string): Promise<boolean> {
    await db.delete(stageAssignments).where(eq(stageAssignments.memberId, id));
    await db.delete(projectInvites).where(eq(projectInvites.memberId, id));
    await db.delete(projectMembers).where(eq(projectMembers.id, id));
    return true;
  }

  // Stage with assignments helper
  async getStagesWithAssignments(projectId: string): Promise<any[]> {
    const projectStages = await db.select().from(stages).where(eq(stages.projectId, projectId));
    if (projectStages.length === 0) return [];

    const stageIds = projectStages.map(s => s.id);
    const allAssignments = await db.select().from(stageAssignments).where(
      sql`${stageAssignments.stageId} IN (${sql.join(stageIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    const memberIds = [...new Set(allAssignments.map(a => a.memberId))];
    let membersMap: Record<string, any> = {};
    if (memberIds.length > 0) {
      const membersResult = await db.select().from(projectMembers).where(
        sql`${projectMembers.id} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`
      );
      membersMap = Object.fromEntries(membersResult.map(m => [m.id, m]));
    }
    
    return projectStages.map(stage => ({
      ...stage,
      assignments: allAssignments
        .filter(a => a.stageId === stage.id && membersMap[a.memberId])
        .map(a => ({ ...a, member: membersMap[a.memberId] }))
    }));
  }

  // Stage Assignment operations
  async getStageAssignments(stageId: string): Promise<StageAssignment[]> {
    return db.select().from(stageAssignments).where(eq(stageAssignments.stageId, stageId));
  }

  async getStageAssignment(id: string): Promise<StageAssignment | undefined> {
    const [assignment] = await db.select().from(stageAssignments).where(eq(stageAssignments.id, id));
    return assignment;
  }

  async getAssignmentsByMember(memberId: string): Promise<StageAssignment[]> {
    return db.select().from(stageAssignments).where(eq(stageAssignments.memberId, memberId));
  }

  async createStageAssignment(data: InsertStageAssignment): Promise<StageAssignment> {
    const [assignment] = await db.insert(stageAssignments).values(data).returning();
    return assignment;
  }

  async deleteStageAssignment(id: string): Promise<boolean> {
    await db.delete(stageAssignments).where(eq(stageAssignments.id, id));
    return true;
  }

  // Progress Log operations
  async getProgressLogs(stageId: string): Promise<ProgressLog[]> {
    return db.select().from(progressLogs).where(eq(progressLogs.stageId, stageId)).orderBy(desc(progressLogs.createdAt));
  }

  async getRecentActivityLogs(userId: string, limit: number = 10): Promise<any[]> {
    const ownedProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const memberProjects = await this.getProjectsByMemberUserId(userId);
    
    const allProjectIds = new Set([
      ...ownedProjects.map(p => p.id),
      ...memberProjects.map(p => p.id),
    ]);
    
    if (allProjectIds.size === 0) return [];
    
    const projectIds = Array.from(allProjectIds);
    const projectStages = await db.select().from(stages).where(
      sql`${stages.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    const stageIds = projectStages.map(s => s.id);
    
    // Build query to find logs by projectId OR stageId
    let logs: ProgressLog[] = [];
    if (stageIds.length > 0) {
      logs = await db.select().from(progressLogs).where(
        sql`(${progressLogs.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}) 
            OR ${progressLogs.stageId} IN (${sql.join(stageIds.map(id => sql`${id}`), sql`, `)}))`
      ).orderBy(desc(progressLogs.createdAt)).limit(limit);
    } else {
      logs = await db.select().from(progressLogs).where(
        sql`${progressLogs.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
      ).orderBy(desc(progressLogs.createdAt)).limit(limit);
    }
    
    const allProjects = [...ownedProjects, ...memberProjects];
    const stageMap = Object.fromEntries(projectStages.map(s => [s.id, s]));
    const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p]));
    
    return logs.map(log => {
      const stage = log.stageId ? stageMap[log.stageId] : null;
      const project = log.projectId ? projectMap[log.projectId] : (stage ? projectMap[stage.projectId] : null);
      return {
        ...log,
        stage,
        project,
      };
    });
  }

  async getAllActivityLogs(userId: string): Promise<any[]> {
    const ownedProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const memberProjects = await this.getProjectsByMemberUserId(userId);
    
    const allProjectIds = new Set([
      ...ownedProjects.map(p => p.id),
      ...memberProjects.map(p => p.id),
    ]);
    
    if (allProjectIds.size === 0) return [];
    
    const projectIds = Array.from(allProjectIds);
    const projectStages = await db.select().from(stages).where(
      sql`${stages.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    const stageIds = projectStages.map(s => s.id);
    
    let logs: ProgressLog[] = [];
    if (stageIds.length > 0) {
      logs = await db.select().from(progressLogs).where(
        sql`(${progressLogs.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}) 
            OR ${progressLogs.stageId} IN (${sql.join(stageIds.map(id => sql`${id}`), sql`, `)}))`
      ).orderBy(desc(progressLogs.createdAt));
    } else {
      logs = await db.select().from(progressLogs).where(
        sql`${progressLogs.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
      ).orderBy(desc(progressLogs.createdAt));
    }
    
    const allProjects = [...ownedProjects, ...memberProjects];
    const stageMap = Object.fromEntries(projectStages.map(s => [s.id, s]));
    const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p]));
    
    // Get users info for each log
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const usersData = userIds.length > 0 ? 
      await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(
        sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`
      ) : [];
    const userMap = Object.fromEntries(usersData.map(u => [u.id, { id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() }]));
    
    return logs.map(log => {
      const stage = log.stageId ? stageMap[log.stageId] : null;
      const project = log.projectId ? projectMap[log.projectId] : (stage ? projectMap[stage.projectId] : null);
      const user = log.userId ? userMap[log.userId] : null;
      return {
        ...log,
        stage,
        project,
        user,
      };
    });
  }

  async createProgressLog(data: InsertProgressLog): Promise<ProgressLog> {
    const [log] = await db.insert(progressLogs).values(data).returning();
    return log;
  }

  // Project Invite operations
  async getInviteByToken(token: string): Promise<ProjectInvite | undefined> {
    const [invite] = await db.select().from(projectInvites).where(eq(projectInvites.token, token));
    return invite;
  }

  async createInvite(data: InsertProjectInvite): Promise<ProjectInvite> {
    const [invite] = await db.insert(projectInvites).values(data).returning();
    return invite;
  }

  async acceptInvite(token: string): Promise<ProjectInvite | undefined> {
    const [invite] = await db
      .update(projectInvites)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(projectInvites.token, token))
      .returning();
    return invite;
  }

  async expireInvite(id: string): Promise<boolean> {
    await db.update(projectInvites).set({ status: "expired" }).where(eq(projectInvites.id, id));
    return true;
  }

  // Scope Version operations
  async getScopeVersions(scopeId: string): Promise<ScopeVersion[]> {
    return db.select().from(scopeVersions).where(eq(scopeVersions.scopeId, scopeId)).orderBy(desc(scopeVersions.version));
  }

  async getScopeVersion(id: string): Promise<ScopeVersion | undefined> {
    const [version] = await db.select().from(scopeVersions).where(eq(scopeVersions.id, id));
    return version;
  }

  async getLatestScopeVersion(scopeId: string): Promise<ScopeVersion | undefined> {
    const [version] = await db.select().from(scopeVersions).where(eq(scopeVersions.scopeId, scopeId)).orderBy(desc(scopeVersions.version)).limit(1);
    return version;
  }

  async createScopeVersion(data: InsertScopeVersion): Promise<ScopeVersion> {
    const [version] = await db.insert(scopeVersions).values(data).returning();
    return version;
  }

  // Project Diagram operations
  async getProjectDiagrams(projectId: string): Promise<ProjectDiagram[]> {
    return db.select().from(projectDiagrams).where(eq(projectDiagrams.projectId, projectId)).orderBy(desc(projectDiagrams.createdAt));
  }

  async getProjectDiagram(id: string): Promise<ProjectDiagram | undefined> {
    const [diagram] = await db.select().from(projectDiagrams).where(eq(projectDiagrams.id, id));
    return diagram;
  }

  async getProjectDiagramByType(projectId: string, type: string): Promise<ProjectDiagram | undefined> {
    const [diagram] = await db.select().from(projectDiagrams).where(
      and(eq(projectDiagrams.projectId, projectId), eq(projectDiagrams.type, type))
    );
    return diagram;
  }

  async createProjectDiagram(data: InsertProjectDiagram): Promise<ProjectDiagram> {
    const [diagram] = await db.insert(projectDiagrams).values(data).returning();
    return diagram;
  }

  async updateProjectDiagram(id: string, data: Partial<InsertProjectDiagram>): Promise<ProjectDiagram | undefined> {
    const [diagram] = await db
      .update(projectDiagrams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectDiagrams.id, id))
      .returning();
    return diagram;
  }

  async deleteProjectDiagram(id: string): Promise<boolean> {
    await db.delete(projectDiagrams).where(eq(projectDiagrams.id, id));
    return true;
  }

  // Project WBS operations
  async getProjectWbs(projectId: string): Promise<ProjectWbs | undefined> {
    const [wbs] = await db.select().from(projectWbs).where(eq(projectWbs.projectId, projectId));
    return wbs;
  }

  async createProjectWbs(data: InsertProjectWbs): Promise<ProjectWbs> {
    const [wbs] = await db.insert(projectWbs).values(data).returning();
    return wbs;
  }

  async updateProjectWbs(projectId: string, data: Partial<InsertProjectWbs>): Promise<ProjectWbs | undefined> {
    const [wbs] = await db
      .update(projectWbs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectWbs.projectId, projectId))
      .returning();
    return wbs;
  }

  async deleteProjectWbs(projectId: string): Promise<boolean> {
    await db.delete(projectWbs).where(eq(projectWbs.projectId, projectId));
    return true;
  }

  // Admin - User operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getAllProjectMembers(): Promise<ProjectMember[]> {
    return db.select().from(projectMembers).orderBy(desc(projectMembers.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async blockUser(userId: string, blocked: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: blocked, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin - Platform Settings operations
  async getPlatformSettings(): Promise<PlatformSetting[]> {
    return db.select().from(platformSettings).orderBy(platformSettings.category, platformSettings.key);
  }

  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting;
  }

  async upsertPlatformSetting(data: InsertPlatformSetting): Promise<PlatformSetting> {
    const [setting] = await db
      .insert(platformSettings)
      .values(data)
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value: data.value,
          description: data.description,
          category: data.category,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async deletePlatformSetting(key: string): Promise<boolean> {
    await db.delete(platformSettings).where(eq(platformSettings.key, key));
    return true;
  }

  // Admin - AI Provider operations
  async getAiProviders(): Promise<AiProvider[]> {
    return db.select().from(aiProviders).orderBy(aiProviders.priority);
  }

  async getActiveAiProviders(): Promise<AiProvider[]> {
    return db.select().from(aiProviders)
      .where(eq(aiProviders.isActive, true))
      .orderBy(aiProviders.priority);
  }

  async getAiProvider(id: string): Promise<AiProvider | undefined> {
    const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, id));
    return provider;
  }

  async createAiProvider(data: InsertAiProvider): Promise<AiProvider> {
    const [provider] = await db.insert(aiProviders).values(data).returning();
    return provider;
  }

  async updateAiProvider(id: string, data: Partial<InsertAiProvider>): Promise<AiProvider | undefined> {
    const [provider] = await db
      .update(aiProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiProviders.id, id))
      .returning();
    return provider;
  }

  async deleteAiProvider(id: string): Promise<boolean> {
    await db.delete(aiProviders).where(eq(aiProviders.id, id));
    return true;
  }

  async reorderAiProviders(providerIds: string[]): Promise<AiProvider[]> {
    const updated: AiProvider[] = [];
    for (let i = 0; i < providerIds.length; i++) {
      const [provider] = await db
        .update(aiProviders)
        .set({ priority: i + 1, updatedAt: new Date() })
        .where(eq(aiProviders.id, providerIds[i]))
        .returning();
      if (provider) updated.push(provider);
    }
    return updated.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  // Admin - Platform Usage Logs
  async createPlatformUsageLog(data: InsertPlatformUsageLog): Promise<PlatformUsageLog> {
    const [log] = await db.insert(platformUsageLogs).values(data).returning();
    return log;
  }

  async getPlatformUsageLogs(limit: number = 100): Promise<PlatformUsageLog[]> {
    return db.select().from(platformUsageLogs).orderBy(desc(platformUsageLogs.createdAt)).limit(limit);
  }

  // Admin - Audit Logs
  async createAdminAuditLog(data: InsertAdminAuditLog): Promise<AdminAuditLog> {
    const [log] = await db.insert(adminAuditLogs).values(data).returning();
    return log;
  }

  async getAdminAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
    return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
  }

  // Admin - Statistics
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    totalClients: number;
    activeProviders: number;
  }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
    const [clientCount] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const [providerCount] = await db.select({ count: sql<number>`count(*)` }).from(aiProviders).where(eq(aiProviders.isActive, true));

    return {
      totalUsers: Number(userCount?.count || 0),
      totalProjects: Number(projectCount?.count || 0),
      totalClients: Number(clientCount?.count || 0),
      activeProviders: Number(providerCount?.count || 0),
    };
  }

  // Project Export operations
  async getProjectExports(projectId: string): Promise<ProjectExport[]> {
    return db.select().from(projectExports).where(eq(projectExports.projectId, projectId)).orderBy(desc(projectExports.createdAt));
  }

  async getProjectExport(id: string): Promise<ProjectExport | undefined> {
    const [exp] = await db.select().from(projectExports).where(eq(projectExports.id, id));
    return exp;
  }

  async createProjectExport(data: InsertProjectExport): Promise<ProjectExport> {
    const [exp] = await db.insert(projectExports).values(data).returning();
    return exp;
  }

  async updateProjectExport(id: string, data: Partial<InsertProjectExport>): Promise<ProjectExport | undefined> {
    const [exp] = await db
      .update(projectExports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectExports.id, id))
      .returning();
    return exp;
  }

  async deleteProjectExport(id: string): Promise<boolean> {
    await db.delete(projectExports).where(eq(projectExports.id, id));
    return true;
  }

  // Client Feedback operations
  async getClientFeedbacks(clientId: string): Promise<ClientFeedback[]> {
    return db.select().from(clientFeedbacks).where(eq(clientFeedbacks.clientId, clientId)).orderBy(desc(clientFeedbacks.createdAt));
  }

  async getClientFeedbacksByProject(projectId: string): Promise<ClientFeedback[]> {
    return db.select().from(clientFeedbacks).where(eq(clientFeedbacks.projectId, projectId)).orderBy(desc(clientFeedbacks.createdAt));
  }

  async getClientFeedback(id: string): Promise<ClientFeedback | undefined> {
    const [feedback] = await db.select().from(clientFeedbacks).where(eq(clientFeedbacks.id, id));
    return feedback;
  }

  async createClientFeedback(data: InsertClientFeedback): Promise<ClientFeedback> {
    const [feedback] = await db.insert(clientFeedbacks).values(data).returning();
    return feedback;
  }

  async updateClientFeedback(id: string, data: Partial<InsertClientFeedback>): Promise<ClientFeedback | undefined> {
    const [feedback] = await db
      .update(clientFeedbacks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientFeedbacks.id, id))
      .returning();
    return feedback;
  }

  async deleteClientFeedback(id: string): Promise<boolean> {
    await db.delete(clientFeedbacks).where(eq(clientFeedbacks.id, id));
    return true;
  }

  async getAllClientFeedbacks(): Promise<ClientFeedback[]> {
    return db.select().from(clientFeedbacks).orderBy(desc(clientFeedbacks.createdAt));
  }

  // Client Portal operations
  async getClientByPortalEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.portalEmail, email));
    return client;
  }

  async updateClientPortalLastLogin(clientId: string): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ portalLastLoginAt: new Date() })
      .where(eq(clients.id, clientId))
      .returning();
    return client;
  }

  // Proposal operations
  async getProposal(projectId: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.projectId, projectId)).orderBy(desc(proposals.createdAt));
    return proposal;
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async getProposalsByProject(projectId: string): Promise<Proposal[]> {
    return db.select().from(proposals).where(eq(proposals.projectId, projectId)).orderBy(desc(proposals.createdAt));
  }

  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values(data).returning();
    return proposal;
  }

  async updateProposal(id: string, data: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const [proposal] = await db
      .update(proposals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return proposal;
  }

  async deleteProposal(id: string): Promise<boolean> {
    await db.delete(proposals).where(eq(proposals.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
