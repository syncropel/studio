// Import the definitive "fields" types from our API contract.
import {
  BlockStatusFields,
  BlockOutputFields,
  BlockErrorFields,
} from "../api/types";

// --- CORE NOTEBOOK STRUCTURES ---

export interface Block {
  id: string;
  engine: string;
  content: string;
  name?: string;
  inputs: string[];
  outputs: string[];
  run?: {
    action: string;
    [key: string]: any;
  };
}

export interface PageInputParameter {
  description?: string;
  type?: string;
  required?: boolean;
  default?: any;
}

export interface ContextualPage {
  id?: string;
  name: string;
  description?: string;
  inputs?: Record<string, PageInputParameter>;
  blocks: Block[];
}

// --- NEW, DEFINITIVE BLOCK RESULT TYPE ---
// This is now the single source of truth for what a block's result looks like.
// It's a union of the possible `fields` objects from server events.
export type BlockResult =
  | { status: "pending" } // A local-only initial state
  | BlockStatusFields // { status: 'running' | 'skipped', ... }
  | BlockOutputFields // { status: 'success', output: ..., ... }
  | BlockErrorFields; // { status: 'error', error: ..., ... }
