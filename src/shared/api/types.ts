// /home/dpwanjala/repositories/syncropel/studio/src/shared/api/types.ts

import type { ContextualPage } from "@/shared/types/notebook";

// ========================================================================
//   SECTION 1: SERVER -> CLIENT EVENT PROTOCOL (SEP)
// ========================================================================

export interface SepPayload {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, any>;
  labels?: Record<string, string>;
}

export interface InboundMessage {
  command_id: string;
  id: string;
  type: string;
  source: string;
  timestamp: string;
  payload: SepPayload;
}

// --- Specific `fields` Schemas for Block Events ---

export interface BlockStatusFields {
  block_id: string;
  status: "running" | "pending" | "skipped";
}

export interface DataRef {
  artifact_id: string;
  renderer_hint: string;
  metadata?: Record<string, any>;
  access_url: string;
}

export interface BlockOutput {
  inline_data?: SDUIPayload;
  data_ref?: DataRef;
}

export interface BlockOutputFields {
  block_id: string;
  status: "success";
  duration_ms: number;
  output: BlockOutput;
}

export interface BlockErrorFields {
  block_id: string;
  status: "error";
  duration_ms: number;
  error: {
    message: string;
    traceback?: string;
  };
}

// --- Specific `fields` Schemas for Other Events ---

export interface SessionLoadedFields {
  new_session_state: {
    connections: { alias: string; source: string }[];
    variables: { name: string; type: string; preview: string }[];
  };
}

export interface PageLoadedFields {
  uri: string;
  content: string;
  initial_model: ContextualPage;
}

export interface PageSavedFields {
  uri: string;
  name: string;
  version: string;
}

export interface PageStatusFields {
  status: "running" | "completed" | "failed";
  current_block_id?: string;
}

export interface WorkspaceBrowseResultFields {
  path: string;
  data: {
    projects: any[];
    library: any[];
    cx_home?: any[];
  };
}

export interface HomepageDataResultFields {
  recent_files: any[];
  pinned_items: any[];
  discover_items: any[];
}

export interface RunHistoryItem {
  run_id: string;
  flow_id: string;
  status: string;
  timestamp_utc: string;
  parameters: Record<string, any>;
}

export interface RunDetailStep {
  step_id: string;
  status: string;
  duration_ms: number; // This was missing
  summary: string;
  cache_hit: boolean;
  output_hash?: string;
}

export interface RunDetailArtifact {
  name: string; // This is the key in the artifacts dictionary
  content_hash: string;
  mime_type: string;
  size_bytes: number;
  type: string; // e.g., 'primary_output', 'log_file'
  access_url?: string;
}

export interface RunDetail {
  run_id: string;
  flow_id: string;
  status: string;
  timestamp_utc: string; // This was missing
  duration_total_ms: number; // This was missing
  parameters: Record<string, any>; // This was missing
  steps: RunDetailStep[];
  // The key is the artifact's user-facing filename
  artifacts: Record<string, RunDetailArtifact>;
}

export type RunHistoryResultFields = DataRef;
export type RunDetailResultFields = RunDetail;

export type LogQueryResultFields = DataRef;

// ========================================================================
//   SECTION 2: SYNCROPEL DECLARATIVE UI (SDUI) SCHEMAS
// ========================================================================

export interface SDUIPayloadBase {
  ui_component: string;
  props?: Record<string, any>;
}

export interface SDUITablePayload extends SDUIPayloadBase {
  ui_component: "table";
  props: { data: Record<string, any>[] };
}

export interface SDUIJsonPayload extends SDUIPayloadBase {
  ui_component: "json";
  props: { data: any };
}

export interface SDUICardPayload extends SDUIPayloadBase {
  ui_component: "card";
  props: {
    title: string;
    metric: string;
    change?: string;
    change_direction?: "up" | "down";
  };
}

export interface SDUIImagePayload extends SDUIPayloadBase {
  ui_component: "image";
  props: { src: string; alt?: string };
}

export type SDUIPayload =
  | SDUITablePayload
  | SDUIJsonPayload
  | SDUICardPayload
  | SDUIImagePayload
  | SDUIPayloadBase;

export interface InspectedArtifact {
  id: string;
  runId: string;
  artifactName: string;
  content: any;
  type: "table" | "image" | "json" | "text" | "unknown";
}

export type VfsArtifactLinkResultFields = DataRef;

// ========================================================================
//   SECTION 3: AGENT & CONTEXT PROTOCOL (ACP) v1.4
// ========================================================================

// --- Client -> Server Commands ---

export interface AgentPromptPayload {
  prompt: string;
  page_id?: string;
  notebook_context_id?: string;
  context_paths?: string[];
}

// --- Server -> Client Events ---

/**
 * A complete, client-dispatchable command provided by the agent.
 * This is a fully-formed SCP message that the client can send directly.
 */
export type AgentSuggestedCommand = {
  command_id: string; // A pre-generated UUID for tracing, provided by the server.
  type: string; // The command type, e.g., "BLOCK.RUN", "PAGE.SAVE".
  payload: Record<string, unknown>;
};

/**
 * Defines a single, clickable action button presented by the agent.
 */
export interface AgentResponseAction {
  id: string; // A unique ID for the UI element, e.g., "act_approve_plan_xyz".
  label: string; // The text on the button, e.g., "✅ Fix and Rerun".
  command: AgentSuggestedCommand; // The full command to dispatch if this action is clicked.
}

/**
 * The definitive structure for the `payload.fields` of an AGENT.RESPONSE event.
 */
export interface AgentResponseFields {
  content: string; // The markdown-formatted text content of the message.
  actions?: AgentResponseAction[]; // An optional list of interactive buttons.
}

/**
 * The structure for a context suggestion from the agent.
 */
export interface AgentContextSuggestion {
  vfs_path: string;
  reason: string;
}

/**
 * The definitive structure for the `payload.fields` of an AGENT.SUGGEST_CONTEXT event.
 */
export interface AgentSuggestContextFields {
  suggestions: AgentContextSuggestion[];
  actions: AgentResponseAction[];
}
