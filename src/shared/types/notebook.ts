// /home/dpwanjala/repositories/syncropel/studio/src/shared/types/notebook.ts

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
  author?: string;
  tags?: string[];
  /** The ID of a `.context.md` file associated with this notebook for persistent context. */
  notebook_context_id?: string;
}

export type BlockResult =
  | { status: "pending" }
  | BlockStatusFields
  | BlockOutputFields
  | BlockErrorFields;
