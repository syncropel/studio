// /home/dpwanjala/repositories/cx-studio/src/shared/types/notebook.ts

import { InboundMessage, InboundPayload } from "./server";

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

// --- START OF DEFINITIVE FIX ---
// The payload can be the success data, or a simple error object.
export type BlockResultPayload = InboundPayload | { error: string } | null;

export type BlockResult = {
  status: "pending" | "running" | "success" | "error";
  payload: BlockResultPayload; // This field now holds the data or the error
};
// --- END OF DEFINITIVE FIX ---

export type BlockResults = Record<string, BlockResult>;
