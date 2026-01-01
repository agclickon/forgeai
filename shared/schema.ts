import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // user, admin, platform_admin
  isBlocked: boolean("is_blocked").default(false),
  lastLoginAt: timestamp("last_login_at"),
  jobTitle: varchar("job_title", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  instagram: varchar("instagram", { length: 100 }),
  facebook: varchar("facebook", { length: 100 }),
  xHandle: varchar("x_handle", { length: 100 }),
  linkedin: varchar("linkedin", { length: 100 }),
  youtube: varchar("youtube", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  notes: text("notes"),
  imageUrl: varchar("image_url", { length: 500 }),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type", { length: 10 }), // cpf or cnpj
  document: varchar("document", { length: 20 }), // CPF or CNPJ number
  razaoSocial: varchar("razao_social", { length: 255 }), // Required if CNPJ
  address: jsonb("address").default({}), // { street, number, complement, neighborhood, city, state, zipCode }
  hasPortalAccess: boolean("has_portal_access").default(false),
  portalEmail: varchar("portal_email", { length: 255 }),
  portalPassword: varchar("portal_password", { length: 255 }), // Hashed password
  portalLastLoginAt: timestamp("portal_last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("briefing"),
  methodology: varchar("methodology", { length: 50 }).default("hybrid"),
  progress: integer("progress").default(0),
  startDate: timestamp("start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: varchar("category", { length: 50 }),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Feedbacks table - for client observations and suggestions
export const clientFeedbacks = pgTable("client_feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  projectId: varchar("project_id").references(() => projects.id),
  type: varchar("type", { length: 50 }).default("observation"), // observation, suggestion, issue
  content: text("content").notNull(),
  images: jsonb("images").default([]), // Array of image URLs
  status: varchar("status", { length: 50 }).default("pending"), // pending, reviewed, resolved
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Briefings table
export const briefings = pgTable("briefings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  projectType: text("project_type"),
  businessObjective: text("business_objective"),
  targetAudience: text("target_audience"),
  marketNiche: text("market_niche"),
  desiredScope: text("desired_scope"),
  stack: text("stack"),
  deadlineText: text("deadline_text"),
  deadline: timestamp("deadline"),
  budget: text("budget"),
  successCriteria: text("success_criteria"),
  technicalRestrictions: text("technical_restrictions"),
  language: varchar("language", { length: 50 }).default("technical"),
  compliance: text("compliance"),
  visualIdentity: jsonb("visual_identity").default({}),
  visualReferences: jsonb("visual_references").default([]),
  audioRecordings: jsonb("audio_recordings").default([]),
  status: varchar("status", { length: 50 }).default("incomplete"),
  conversation: jsonb("conversation").default([]),
  rawInput: text("raw_input"),
  currentField: varchar("current_field", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scopes table
export const scopes = pgTable("scopes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  objective: text("objective"),
  deliverables: jsonb("deliverables").default([]),
  outOfScope: jsonb("out_of_scope").default([]),
  assumptions: jsonb("assumptions").default([]),
  dependencies: jsonb("dependencies").default([]),
  risks: jsonb("risks").default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roadmaps table
export const roadmaps = pgTable("roadmaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  phases: jsonb("phases").default([]),
  milestones: jsonb("milestones").default([]),
  suggestedDates: jsonb("suggested_dates").default({}),
  slas: jsonb("slas").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stages table
export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  weight: integer("weight").default(20),
  progress: integer("progress").default(0),
  status: varchar("status", { length: 50 }).default("pending"),
  order: integer("order").notNull(),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalHistory: jsonb("approval_history").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").notNull().references(() => stages.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  weight: integer("weight").default(1),
  status: varchar("status", { length: 50 }).default("pending"),
  assignee: varchar("assignee", { length: 255 }),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Checklists table
export const checklists = pgTable("checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  type: varchar("type", { length: 50 }).notNull(),
  items: jsonb("items").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  content: text("content"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Commands table
export const aiCommands = pgTable("ai_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  promptText: text("prompt_text"),
  jsonCommand: jsonb("json_command"),
  targetPlatform: varchar("target_platform", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vault (sensitive assets) table
export const vaultItems = pgTable("vault_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  value: text("value").notNull(),
  description: text("description"),
  environment: varchar("environment", { length: 50 }).default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  projects: many(projects),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  briefing: one(briefings),
  scope: one(scopes),
  roadmap: one(roadmaps),
  stages: many(stages),
  checklists: many(checklists),
  documents: many(documents),
  aiCommands: many(aiCommands),
}));

export const briefingsRelations = relations(briefings, ({ one }) => ({
  project: one(projects, { fields: [briefings.projectId], references: [projects.id] }),
}));

export const scopesRelations = relations(scopes, ({ one }) => ({
  project: one(projects, { fields: [scopes.projectId], references: [projects.id] }),
}));

export const roadmapsRelations = relations(roadmaps, ({ one }) => ({
  project: one(projects, { fields: [roadmaps.projectId], references: [projects.id] }),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  project: one(projects, { fields: [stages.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  stage: one(stages, { fields: [tasks.stageId], references: [stages.id] }),
}));

export const checklistsRelations = relations(checklists, ({ one }) => ({
  project: one(projects, { fields: [checklists.projectId], references: [projects.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
}));

export const aiCommandsRelations = relations(aiCommands, ({ one }) => ({
  project: one(projects, { fields: [aiCommands.projectId], references: [projects.id] }),
}));

export const vaultItemsRelations = relations(vaultItems, ({ one }) => ({
  project: one(projects, { fields: [vaultItems.projectId], references: [projects.id] }),
}));

// Scope Versions table - version history for scope documents
export const scopeVersions = pgTable("scope_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeId: varchar("scope_id").notNull().references(() => scopes.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  version: integer("version").notNull(),
  objective: text("objective"),
  deliverables: jsonb("deliverables").default([]),
  outOfScope: jsonb("out_of_scope").default([]),
  assumptions: jsonb("assumptions").default([]),
  dependencies: jsonb("dependencies").default([]),
  risks: jsonb("risks").default([]),
  metadata: jsonb("metadata").default({}),
  changeNotes: text("change_notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scopeVersionsRelations = relations(scopeVersions, ({ one }) => ({
  scope: one(scopes, { fields: [scopeVersions.scopeId], references: [scopes.id] }),
  project: one(projects, { fields: [scopeVersions.projectId], references: [projects.id] }),
  user: one(users, { fields: [scopeVersions.createdBy], references: [users.id] }),
}));

// Project Diagrams table - stores generated diagrams (flow, architecture, mindmap)
export const projectDiagrams = pgTable("project_diagrams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  type: varchar("type", { length: 50 }).notNull(), // 'flow', 'architecture', 'mindmap'
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  data: jsonb("data").notNull(), // Diagram structure data
  svgContent: text("svg_content"), // Generated SVG
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectDiagramsRelations = relations(projectDiagrams, ({ one }) => ({
  project: one(projects, { fields: [projectDiagrams.projectId], references: [projects.id] }),
}));

// WBS (Work Breakdown Structure) table
export const projectWbs = pgTable("project_wbs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  phases: jsonb("phases").notNull().default([]),
  totalEstimatedHours: integer("total_estimated_hours").default(0),
  criticalPath: jsonb("critical_path").default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectWbsRelations = relations(projectWbs, ({ one }) => ({
  project: one(projects, { fields: [projectWbs.projectId], references: [projects.id] }),
}));

// Mind Maps table
export const mindMaps = pgTable("mind_maps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rootNode: jsonb("root_node").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mindMapsRelations = relations(mindMaps, ({ one }) => ({
  project: one(projects, { fields: [mindMaps.projectId], references: [projects.id] }),
}));

// Agent Analyses table - stores results from specialized AI agents
export const agentAnalyses = pgTable("agent_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  result: jsonb("result").default({}),
  confidence: integer("confidence").default(0),
  recommendations: jsonb("recommendations").default([]),
  warnings: jsonb("warnings").default([]),
  metadata: jsonb("metadata").default({}),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentAnalysesRelations = relations(agentAnalyses, ({ one }) => ({
  project: one(projects, { fields: [agentAnalyses.projectId], references: [projects.id] }),
}));

// Orchestrator Sessions table - tracks multi-agent orchestration runs
export const orchestratorSessions = pgTable("orchestrator_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  status: varchar("status", { length: 50 }).default("running"),
  agentsExecuted: jsonb("agents_executed").default([]),
  consolidatedResult: jsonb("consolidated_result").default({}),
  totalConfidence: integer("total_confidence").default(0),
  executionLog: jsonb("execution_log").default([]),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orchestratorSessionsRelations = relations(orchestratorSessions, ({ one }) => ({
  project: one(projects, { fields: [orchestratorSessions.projectId], references: [projects.id] }),
}));

// Project Members table - team members with roles
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("contributor"),
  specialty: varchar("specialty", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectMembersRelations = relations(projectMembers, ({ one, many }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
  stageAssignments: many(stageAssignments),
}));

// Stage Assignments table - assigns stages to team members
export const stageAssignments = pgTable("stage_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").notNull().references(() => stages.id),
  memberId: varchar("member_id").notNull().references(() => projectMembers.id),
  assignedBy: varchar("assigned_by").references(() => users.id),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stageAssignmentsRelations = relations(stageAssignments, ({ one }) => ({
  stage: one(stages, { fields: [stageAssignments.stageId], references: [stages.id] }),
  member: one(projectMembers, { fields: [stageAssignments.memberId], references: [projectMembers.id] }),
  assignedByUser: one(users, { fields: [stageAssignments.assignedBy], references: [users.id] }),
}));

// Project Invites table - team member invitations
export const projectInvites = pgTable("project_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  memberId: varchar("member_id").notNull().references(() => projectMembers.id),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectInvitesRelations = relations(projectInvites, ({ one }) => ({
  project: one(projects, { fields: [projectInvites.projectId], references: [projects.id] }),
  member: one(projectMembers, { fields: [projectInvites.memberId], references: [projectMembers.id] }),
}));

// Progress Logs table - tracks who updated what (generic activity logs)
export const progressLogs = pgTable("progress_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id),
  projectId: varchar("project_id").references(() => projects.id),
  documentId: varchar("document_id").references(() => documents.id),
  memberId: varchar("member_id").references(() => projectMembers.id),
  userId: varchar("user_id").references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).default("progress_update"), // progress_update, stage_approval, document_created, member_added, project_status_changed
  previousProgress: integer("previous_progress"),
  newProgress: integer("new_progress"),
  previousStatus: varchar("previous_status"),
  newStatus: varchar("new_status"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressLogsRelations = relations(progressLogs, ({ one }) => ({
  stage: one(stages, { fields: [progressLogs.stageId], references: [stages.id] }),
  project: one(projects, { fields: [progressLogs.projectId], references: [projects.id] }),
  document: one(documents, { fields: [progressLogs.documentId], references: [documents.id] }),
  member: one(projectMembers, { fields: [progressLogs.memberId], references: [projectMembers.id] }),
  user: one(users, { fields: [progressLogs.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBriefingSchema = createInsertSchema(briefings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScopeSchema = createInsertSchema(scopes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoadmapSchema = createInsertSchema(roadmaps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStageSchema = createInsertSchema(stages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiCommandSchema = createInsertSchema(aiCommands).omit({ id: true, createdAt: true });
export const insertVaultItemSchema = createInsertSchema(vaultItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMindMapSchema = createInsertSchema(mindMaps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScopeVersionSchema = createInsertSchema(scopeVersions).omit({ id: true, createdAt: true });
export const insertProjectDiagramSchema = createInsertSchema(projectDiagrams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectWbsSchema = createInsertSchema(projectWbs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgentAnalysisSchema = createInsertSchema(agentAnalyses).omit({ id: true, createdAt: true, updatedAt: true, executedAt: true });
export const insertOrchestratorSessionSchema = createInsertSchema(orchestratorSessions).omit({ id: true, createdAt: true, startedAt: true, completedAt: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, createdAt: true, updatedAt: true, invitedAt: true, joinedAt: true });
export const insertStageAssignmentSchema = createInsertSchema(stageAssignments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProgressLogSchema = createInsertSchema(progressLogs).omit({ id: true, createdAt: true });
export const insertProjectInviteSchema = createInsertSchema(projectInvites).omit({ id: true, createdAt: true, acceptedAt: true });
export const insertClientFeedbackSchema = createInsertSchema(clientFeedbacks).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertBriefing = z.infer<typeof insertBriefingSchema>;
export type Briefing = typeof briefings.$inferSelect;
export type InsertScope = z.infer<typeof insertScopeSchema>;
export type Scope = typeof scopes.$inferSelect;
export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type Roadmap = typeof roadmaps.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stages.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertAiCommand = z.infer<typeof insertAiCommandSchema>;
export type AiCommand = typeof aiCommands.$inferSelect;
export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;
export type VaultItem = typeof vaultItems.$inferSelect;
export type InsertMindMap = z.infer<typeof insertMindMapSchema>;
export type MindMap = typeof mindMaps.$inferSelect;
export type InsertScopeVersion = z.infer<typeof insertScopeVersionSchema>;
export type ScopeVersion = typeof scopeVersions.$inferSelect;
export type InsertProjectDiagram = z.infer<typeof insertProjectDiagramSchema>;
export type ProjectDiagram = typeof projectDiagrams.$inferSelect;
export type InsertProjectWbs = z.infer<typeof insertProjectWbsSchema>;
export type ProjectWbs = typeof projectWbs.$inferSelect;
export type InsertAgentAnalysis = z.infer<typeof insertAgentAnalysisSchema>;
export type AgentAnalysis = typeof agentAnalyses.$inferSelect;
export type InsertOrchestratorSession = z.infer<typeof insertOrchestratorSessionSchema>;
export type OrchestratorSession = typeof orchestratorSessions.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertStageAssignment = z.infer<typeof insertStageAssignmentSchema>;
export type StageAssignment = typeof stageAssignments.$inferSelect;
export type InsertProgressLog = z.infer<typeof insertProgressLogSchema>;
export type ProgressLog = typeof progressLogs.$inferSelect;
export type InsertProjectInvite = z.infer<typeof insertProjectInviteSchema>;
export type ProjectInvite = typeof projectInvites.$inferSelect;
export type InsertClientFeedback = z.infer<typeof insertClientFeedbackSchema>;
export type ClientFeedback = typeof clientFeedbacks.$inferSelect;

// Platform Settings table (global platform configuration)
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Providers table (LLM configuration)
// Note: API keys are stored in environment variables for security, not in the database
// The apiKeyEnvVar field stores the NAME of the environment variable (e.g., "ANTHROPIC_API_KEY")
export const aiProviders = pgTable("ai_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // anthropic, openai, google, etc
  model: varchar("model", { length: 100 }).notNull(),
  apiKeyEnvVar: varchar("api_key_env_var", { length: 100 }), // Name of env var containing the API key
  baseUrlEnvVar: varchar("base_url_env_var", { length: 100 }), // Name of env var containing base URL (optional)
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Lower = higher priority (1 = primary)
  maxTokens: integer("max_tokens").default(4096),
  temperature: integer("temperature").default(70), // Stored as integer (0.7 = 70)
  description: text("description"),
  lastUsedAt: timestamp("last_used_at"),
  totalTokensUsed: integer("total_tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Usage Logs (for admin statistics)
export const platformUsageLogs = pgTable("platform_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }),
  resourceId: varchar("resource_id"),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Audit Logs (security audit trail)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }), // user, provider, settings
  targetId: varchar("target_id"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Exports table - executable project structure exports
export const projectExports = pgTable("project_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  targetPlatform: varchar("target_platform", { length: 50 }).notNull(), // replit, github, gitlab, zip
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, generating, completed, failed
  stack: varchar("stack", { length: 100 }), // react, node, python, etc
  framework: varchar("framework", { length: 100 }), // vite, nextjs, express, etc
  fileTree: jsonb("file_tree").default([]), // array of file paths
  files: jsonb("files").default({}), // { path: content } mapping
  packageJson: jsonb("package_json"), // generated package.json
  readmeContent: text("readme_content"),
  configFiles: jsonb("config_files").default({}), // tsconfig, vite.config, etc
  zipUrl: text("zip_url"), // object storage URL for ZIP
  externalUrl: text("external_url"), // Replit/GitHub/GitLab project URL
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}), // AI generation metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectExportsRelations = relations(projectExports, ({ one }) => ({
  project: one(projects, { fields: [projectExports.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectExports.userId], references: [users.id] }),
}));

// Insert schemas for admin tables
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiProviderSchema = createInsertSchema(aiProviders).omit({ id: true, createdAt: true, updatedAt: true, lastUsedAt: true });
export const insertPlatformUsageLogSchema = createInsertSchema(platformUsageLogs).omit({ id: true, createdAt: true });
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });
export const insertProjectExportSchema = createInsertSchema(projectExports).omit({ id: true, createdAt: true, updatedAt: true });

// Types for admin tables
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertAiProvider = z.infer<typeof insertAiProviderSchema>;
export type AiProvider = typeof aiProviders.$inferSelect;
export type InsertPlatformUsageLog = z.infer<typeof insertPlatformUsageLogSchema>;
export type PlatformUsageLog = typeof platformUsageLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertProjectExport = z.infer<typeof insertProjectExportSchema>;
export type ProjectExport = typeof projectExports.$inferSelect;

// Proposals table - commercial proposals for projects
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  version: integer("version").default(1),
  status: varchar("status", { length: 50 }).default("draft"), // draft, sent, approved, rejected
  // Content sections (editable before export)
  executiveSummary: text("executive_summary"),
  methodology: text("methodology"),
  deliverables: jsonb("deliverables").default([]), // Array of deliverable items
  timeline: jsonb("timeline").default([]), // Array of phases with dates
  investment: jsonb("investment").default({}), // { phases: [], subtotal, discount, total }
  paymentTerms: text("payment_terms"),
  validity: integer("validity").default(30), // Days the proposal is valid
  termsAndConditions: text("terms_and_conditions"),
  // Scope section
  scopeSection: jsonb("scope_section").default({}), // { objective, features, exclusions }
  // Technical information
  technicalInfo: jsonb("technical_info").default({}), // { stack, architecture, integrations, requirements }
  // Schedule configuration
  startDate: timestamp("start_date"), // Project start date
  hoursPerDay: integer("hours_per_day").default(8), // Working hours per day for calculation
  schedule: jsonb("schedule").default([]), // Array of { phaseId, phaseName, startDate, endDate, hours, milestones }
  // Calculated values
  totalHours: integer("total_hours").default(0),
  hourlyRate: integer("hourly_rate").default(0), // Stored in cents
  subtotal: integer("subtotal").default(0), // Stored in cents
  discount: integer("discount").default(0), // Percentage
  totalValue: integer("total_value").default(0), // Stored in cents
  // Metadata
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  approvedBy: varchar("approved_by"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposalsRelations = relations(proposals, ({ one }) => ({
  project: one(projects, { fields: [proposals.projectId], references: [projects.id] }),
  creator: one(users, { fields: [proposals.createdBy], references: [users.id] }),
}));

export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// Enums for type safety
export const userRoles = ["user", "admin", "platform_admin"] as const;
export const projectStatuses = ["briefing", "planning", "design", "development", "testing", "deploy", "completed"] as const;
export const methodologies = ["scrum", "kanban", "waterfall", "hybrid"] as const;
export const stageTypes = ["planning", "design", "development", "testing", "deploy"] as const;
export const taskStatuses = ["pending", "in_progress", "completed", "blocked"] as const;
export const briefingStatuses = ["incomplete", "in_progress", "complete"] as const;
export const checklistTypes = ["technical", "commercial", "legal", "delivery", "validation"] as const;
export const documentTypes = ["scope", "technical", "architecture", "api", "ai_command", "installation"] as const;
export const vaultItemTypes = ["api_key", "password", "token", "certificate", "connection_string", "other"] as const;
export const environments = ["development", "staging", "production"] as const;
export const agentTypes = ["scope", "technical", "timeline", "risks", "financial", "documentation"] as const;
export const agentStatuses = ["pending", "running", "completed", "failed"] as const;
export const memberRoles = ["owner", "manager", "contributor"] as const;
export const memberStatuses = ["pending", "active", "inactive"] as const;
export const diagramTypes = ["flow", "architecture", "mindmap"] as const;
export const exportPlatforms = ["replit", "github", "gitlab", "zip"] as const;
export const exportStatuses = ["pending", "generating", "completed", "failed"] as const;
export const proposalStatuses = ["draft", "sent", "approved", "rejected"] as const;
