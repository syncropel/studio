import { create } from "zustand";
import { InboundMessage } from "@/shared/types/server";
import { BlockResult, BlockResults, ContextualPage } from "../types/notebook";

export interface ActiveConnection {
  alias: string;
  source: string;
}
export interface SessionVariable {
  name: string;
  type: string;
  preview: string;
}
export interface Flow {
  Name: string;
  Description: string;
}
export interface Query {
  Name: string;
}
export type PageParameters = Record<string, any>;

export type ViewMode = "document" | "grid" | "graph";

interface SessionStore {
  connections: ActiveConnection[];
  variables: SessionVariable[];
  flows: Flow[];
  queries: Query[];
  lastJsonMessage: InboundMessage | null;
  currentPage: ContextualPage | null;
  pageParameters: PageParameters;
  blockResults: BlockResults;
  selectedBlockId: string | null;
  isNavigatorVisible: boolean;
  isInspectorVisible: boolean;
  isTerminalVisible: boolean;
  showCodeBlocks: boolean;
  showMarkdownBlocks: boolean;
  viewMode: ViewMode;
  setConnections: (connections: ActiveConnection[]) => void;
  setVariables: (variables: SessionVariable[]) => void;
  setFlows: (flows: Flow[]) => void;
  setQueries: (queries: Query[]) => void;
  setLastJsonMessage: (message: InboundMessage | null) => void;
  setCurrentPage: (page: ContextualPage | null) => void;
  setBlockResult: (blockId: string, result: BlockResult) => void;
  setSelectedBlockId: (blockId: string | null) => void;
  toggleNavigator: () => void;
  toggleInspector: () => void;
  toggleTerminal: () => void;
  toggleShowCodeBlocks: () => void;
  toggleShowMarkdownBlocks: () => void;
  setShowOutputsOnly: (showOnly: boolean) => void; // A special action for the quick toggle
  updateBlockContent: (blockId: string, newContent: string) => void;
  updatePageParameter: (key: string, value: any) => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  connections: [],
  variables: [],
  flows: [],
  queries: [],
  lastJsonMessage: null,
  currentPage: null, // Initialize new state
  blockResults: {}, // Initialize new state
  selectedBlockId: null, // Initialize new state
  isNavigatorVisible: true,
  isInspectorVisible: false,
  isTerminalVisible: false,
  showCodeBlocks: true,
  showMarkdownBlocks: true,
  viewMode: "document",
  pageParameters: {},
  setConnections: (connections) => set({ connections }),
  setVariables: (variables) => set({ variables }),
  setFlows: (flows) => set({ flows }),
  setQueries: (queries) => set({ queries }),
  setLastJsonMessage: (message) => set({ lastJsonMessage: message }),
  setCurrentPage: (page) => {
    const initialParams: PageParameters = {};
    if (page?.inputs) {
      for (const key in page.inputs) {
        // Use the default value from the page's front matter
        initialParams[key] = page.inputs[key].default;
      }
    }
    set({ currentPage: page, blockResults: {}, pageParameters: initialParams });
  },
  setBlockResult: (blockId, result) =>
    set((state) => ({
      blockResults: { ...state.blockResults, [blockId]: result },
    })),
  setSelectedBlockId: (blockId) => set({ selectedBlockId: blockId }),
  toggleNavigator: () =>
    set((state) => ({ isNavigatorVisible: !state.isNavigatorVisible })),
  toggleInspector: () =>
    set((state) => ({ isInspectorVisible: !state.isInspectorVisible })),
  toggleTerminal: () =>
    set((state) => ({ isTerminalVisible: !state.isTerminalVisible })),
  updateBlockContent: (blockId, newContent) =>
    set((state) => {
      if (!state.currentPage) return {};
      const newBlocks = state.currentPage.blocks.map((block) =>
        block.id === blockId ? { ...block, content: newContent } : block
      );
      return {
        currentPage: { ...state.currentPage, blocks: newBlocks },
      };
    }),
  updatePageParameter: (key, value) =>
    set((state) => ({
      pageParameters: { ...state.pageParameters, [key]: value },
    })),
  toggleShowCodeBlocks: () =>
    set((state) => ({ showCodeBlocks: !state.showCodeBlocks })),
  toggleShowMarkdownBlocks: () =>
    set((state) => ({ showMarkdownBlocks: !state.showMarkdownBlocks })),
  setShowOutputsOnly: (showOnly) =>
    set({
      showCodeBlocks: !showOnly,
      showMarkdownBlocks: !showOnly,
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
