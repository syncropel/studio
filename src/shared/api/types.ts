// /home/dpwanjala/repositories/syncropel/studio/src/shared/api/types.ts
//
// Definitive Type Definitions for the Syncropel Communication Protocol (SCP/SEP) v1.0.0
// This file is the canonical contract between the cx-studio client and the cx-server.

import type { ContextualPage } from "@/shared/types/notebook";

// ========================================================================
//   SECTION 1: SERVER -> CLIENT EVENT PROTOCOL (SEP)
// ========================================================================

/**
 * The main payload envelope for every server-to-client event.
 * The actual data is nested inside the `fields` property.
 */
export interface SepPayload {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, any>; // The structured data for the event
  labels?: Record<string, string>;
}

/**
 * The top-level message envelope for every server-to-client event.
 */
export interface InboundMessage {
  command_id: string; // Correlates to the client command that initiated this
  id: string; // Unique ID for this specific event
  type: string; // The event type, e.g., "BLOCK.OUTPUT"
  source: string;
  timestamp: string;
  payload: SepPayload; // The payload is now this structured envelope
}

// --- Specific `fields` Schemas for Block Events ---

export interface BlockStatusFields {
  block_id: string;
  status: "running" | "pending" | "skipped";
}

// The "Claim Check" for large data artifacts, sent via the Data Plane
export interface DataRef {
  artifact_id: string;
  renderer_hint: string;
  metadata?: Record<string, any>;
  access_url: string;
}

// The output of a block, implementing the Hybrid Claim Check pattern
export interface BlockOutput {
  inline_data?: SDUIPayload; // For small results
  data_ref?: DataRef; // For large results
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
  page: ContextualPage;
}

export interface WorkspaceBrowseResultFields {
  path: string;
  data: {
    projects: any[]; // Define more strictly if needed
    library: any[];
  };
}

export interface HomepageDataResultFields {
  recent_files: any[];
  pinned_items: any[];
  discover_items: any[];
}

// ========================================================================
//   SECTION 2: SYNCROPEL DECLARATIVE UI (SDUI) SCHEMAS
// ========================================================================
// These types define the contract for the server to declaratively render UI
// components on the client.

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

// Add other SDUI component types here (Tree, Form, etc.)

// The master discriminated union for all possible SDUI payloads.
export type SDUIPayload =
  | SDUITablePayload
  | SDUIJsonPayload
  | SDUICardPayload
  | SDUIImagePayload
  | SDUIPayloadBase; // Fallback for custom components

/**
 * Defines the shape of an artifact's content when it's fetched for preview
 * in the Inspector panel. This is the expected payload for an ARTIFACT_CONTENT_RESULT event.
 */
export interface InspectedArtifact {
  id: string; // A unique ID for the preview, usually `${runId}-${artifactName}`
  runId: string;
  artifactName: string;
  content: any; // The actual fetched content (JSON object, text, etc.)
  type: "table" | "image" | "json" | "text" | "unknown"; // A hint for rendering
}
