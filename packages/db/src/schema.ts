import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations, teams, users } from "./auth-schema.ts";

export * from "./auth-schema.ts";

/**
 * Projects owned by an organization (agency or individual freelancer).
 */
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => `proj_${createId()}`),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Freelancers or freelancer teams assigned to a project, scoped to the owning org.
 */
export const projectMembers = pgTable(
  "project_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `proj_mem_${createId()}`),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    role: text("role"), // e.g. "lead", "collaborator"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("projectMembers_projectId_idx").on(table.projectId),
    index("projectMembers_orgId_idx").on(table.organizationId),
  ]
);

/**
 * Client parties (individual or team) attached to a project.
 */
export const projectClients = pgTable(
  "project_clients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `proj_client_${createId()}`),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientUserId: text("client_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    clientTeamId: text("client_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    label: text("label"), // optional display label for the client party
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("projectClients_projectId_idx").on(table.projectId),
    index("projectClients_clientUser_idx").on(table.clientUserId),
    index("projectClients_clientTeam_idx").on(table.clientTeamId),
  ]
);

/**
 * Requirements for a project, authored in markdown, with approval rule.
 */
export const requirements = pgTable(
  "requirements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `req_${createId()}`),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(), // markdown content
    approvalRule: text("approval_rule").notNull().default("any"), // "any" or "all"
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("requirements_projectId_idx").on(table.projectId)]
);

/**
 * Client recipients for a given requirement, tied to a project client party.
 */
export const requirementRecipients = pgTable(
  "requirement_recipients",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `req_recipient_${createId()}`),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    projectClientId: text("project_client_id")
      .notNull()
      .references(() => projectClients.id, {
        onDelete: "cascade",
      }),
    required: boolean("required").default(true).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("requirementRecipients_reqId_idx").on(table.requirementId),
    index("requirementRecipients_client_idx").on(table.projectClientId),
  ]
);

/**
 * Sign-off state for each requirement recipient.
 */
export const requirementSignoffs = pgTable(
  "requirement_signoffs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `req_signoff_${createId()}`),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => requirementRecipients.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending|approved|rejected
    approvedAt: timestamp("approved_at"),
    note: text("note"),
  },
  (table) => [
    index("requirementSignoffs_reqId_idx").on(table.requirementId),
    index("requirementSignoffs_recipientId_idx").on(table.recipientId),
  ]
);

/**
 * Discussion threads attached to a requirement.
 */
export const requirementThreads = pgTable(
  "requirement_threads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `req_thread_${createId()}`),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("requirementThreads_requirementId_idx").on(table.requirementId),
  ]
);

/**
 * Comments within requirement threads; supports replies via parentCommentId.
 */
export const requirementComments = pgTable(
  "requirement_comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `req_comment_${createId()}`),
    threadId: text("thread_id")
      .notNull()
      .references(() => requirementThreads.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(), // markdown fragment
    parentCommentId: text("parent_comment_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    threadIdx: index("requirementComments_threadId_idx").on(table.threadId),
    parentIdx: index("requirementComments_parentId_idx").on(
      table.parentCommentId
    ),
  })
);
