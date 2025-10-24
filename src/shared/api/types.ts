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
  id: string;
  status: string;
  duration_ms: number;
}

export interface RunDetailArtifact {
  name: string;
  size_bytes: number;
  access_url: string;
}

export interface RunDetail {
  run_id: string;
  flow_id: string;
  status: string;
  steps: RunDetailStep[];
  artifacts: RunDetailArtifact[];
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
