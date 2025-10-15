import type { ContextualPage } from "@/shared/types/notebook";

// --- PAYLOAD TYPES ---

export type DataPayload = Record<string, unknown>;

export interface CommandResultPayload {
  result: DataPayload | DataPayload[] | string | null;
  new_session_state: {
    connections: { alias: string; source: string }[];
    variables: { name: string; type: string; preview: string }[];
  };
}

export interface ErrorPayload {
  error: string;
}

export interface LogEventPayload {
  level: "debug" | "info" | "warn" | "error";
  timestamp: string;
  message: string;
  labels: { [key: string]: any };
  fields?: Record<string, any>;
}

export interface RunHistoryItem {
  run_id: string;
  flow_id: string;
  status: string;
  timestamp_utc: string;
  parameters: Record<string, any>;
}

export interface RunDetail {
  run_id: string;
  flow_id: string;
  status: string;
  timestamp_utc: string;
  parameters: Record<string, any>;
  steps: {
    id: string;
    status: string;
    duration_ms: number;
    cache_hit: boolean;
  }[];
  artifacts: { name: string; size_bytes: number }[];
}

export interface InspectedArtifact {
  id: string;
  runId: string;
  artifactName: string;
  content: any;
  type: "table" | "image" | "json" | "unknown";
}

// Add these interfaces to your existing api/types.ts file.

// --- SYNCROPEL DECLARATIVE UI (SDUI) PROTOCOL ---

/**
 * Defines a generic action that can be triggered by a UI element, like a button.
 */
export interface SDUIAction {
  type: "run_block"; // The only action type for now
  payload: {
    target: string; // The ID of the block to run
    // Future: could include params to pass to the block
  };
}

/**
 * Base interface for a simple UI element within a form or layout.
 */
export interface SDUIElement {
  type: "text" | "text_input" | "number_input" | "select" | "button";
  variable?: string; // The key for this element's value in a form's state
}

// --- Specific Element Types ---

export interface SDUITextElement extends SDUIElement {
  type: "text";
  content: string; // The text to display, can be markdown
}

export interface SDUITextInputElement extends SDUIElement {
  type: "text_input";
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

export interface SDUIButtonElement extends SDUIElement {
  type: "button";
  label: string;
  action: SDUIAction;
  disabled?: string; // A Jinja-like expression to be evaluated on the client
}

export type SDUIFormElement =
  | SDUITextInputElement
  | SDUIButtonElement
  | SDUITextElement;

// --- PAYLOADS FOR TOP-LEVEL UI COMPONENTS (The "ui_component" property) ---

/**
 * The base for all top-level SDUI components.
 */
export interface SDUIPayloadBase {
  ui_component: string; // e.g., 'table', 'card', 'my-app:my-chart'
  props?: Record<string, any>;
}

/**
 * Renders a simple metric card.
 * ui_component: "card"
 */
export interface SDUICardPayload extends SDUIPayloadBase {
  ui_component: "card";
  props: {
    title: string;
    metric: string;
    change?: string;
    change_direction?: "up" | "down";
  };
}

/**
 * Renders a data table (e.g., using Handsontable).
 * ui_component: "table"
 */
export interface SDUITablePayload extends SDUIPayloadBase {
  ui_component: "table";
  props: {
    data: Record<string, any>[];
    // Future: add options for pagination, sorting etc.
  };
}
export interface SDUIImagePayload extends SDUIPayloadBase {
  ui_component: "image";
  props: {
    src: string;
    alt?: string;
  };
}
/**
 * Renders a syntax-highlighted JSON viewer (e.g., using Monaco).
 * ui_component: "json"
 */
export interface SDUIJsonPayload extends SDUIPayloadBase {
  ui_component: "json";
  props: {
    data: any;
  };
}

/**
 * Renders a hierarchical tree view.
 * ui_component: "tree"
 */
export interface SDUITreePayload extends SDUIPayloadBase {
  ui_component: "tree";
  props: {
    title?: string;
    data: any[]; // Expects an array of nodes with key, title, children
  };
}

/**
 * Renders a form from a list of elements.
 * ui_component: "form"
 */
export interface SDUIFormPayload extends SDUIPayloadBase {
  ui_component: "form";
  title?: string;
  elements: SDUIFormElement[];
}

/**
 * Renders a layout by composing other SDUI components.
 * ui_component: "layout"
 */
export interface SDUILayoutPayload extends SDUIPayloadBase {
  ui_component: "layout";
  layout_type: "grid" | "stack" | "tabs";
  // Each child is a full SDUI schema itself.
  children: SDUIPayload[];
  // Grid-specific props
  columns?: number;
}

/**
 * Renders a custom, user-provided React component.
 * This is triggered by a block with `engine: "custom-component"`
 */
export interface SDUICustomComponentPayload extends SDUIPayloadBase {
  // The component name is namespaced: "app-name:ComponentName"
  ui_component: `${string}:${string}`;
  props: Record<string, any>;
}

export interface SDUITextPayload extends SDUIPayloadBase {
  ui_component: "text";
  props: {
    content: string;
  };
}

/**
 * The master discriminated union for all possible UI rendering payloads.
 * The `DynamicUIRenderer` will use the `ui_component` property to decide which
 * component to render.
 */
export type SDUIPayload =
  | SDUICardPayload
  | SDUITablePayload
  | SDUIJsonPayload
  | SDUITreePayload
  | SDUIFormPayload
  | SDUILayoutPayload
  | SDUICustomComponentPayload
  | SDUIImagePayload
  | SDUITextPayload;

// The master union of all possible payload shapes
export type InboundPayload =
  | CommandResultPayload
  | ErrorPayload
  | DataPayload
  | DataPayload[]
  | ContextualPage
  | LogEventPayload
  | RunHistoryItem[]
  | RunDetail
  | InspectedArtifact
  | SDUIPayload;

// --- MESSAGE TYPE DEFINITION ---

export interface InboundMessage {
  type:
    | "COMMAND_STARTED"
    | "RESULT_SUCCESS"
    | "RESULT_ERROR"
    | "PAGE_LOADED"
    | "SESSION_LOADED"
    | "WORKSPACE_BROWSE_RESULT"
    | "HOMEPAGE_DATA_RESULT"
    | "PAGE_SAVED"
    | "LOG_EVENT"
    | "FATAL_ERROR"
    | "TERMINAL_OUTPUT"
    | "RUN_HISTORY_RESULT"
    | "RUN_DETAIL_RESULT"
    | "ARTIFACT_CONTENT_RESULT";
  command_id: string;
  payload: InboundPayload;
}
