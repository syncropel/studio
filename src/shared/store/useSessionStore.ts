import { create } from "zustand";
import { BlockResult, BlockResults, ContextualPage } from "../types/notebook";
import { InboundMessage, InspectedArtifact } from "../api/types";

// --- TYPE DEFINITIONS for state objects ---

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
  // Core Session & Workspace Data
  connections: ActiveConnection[];
  variables: SessionVariable[];
  flows: Flow[];
  queries: Query[];
  lastJsonMessage: InboundMessage | null;

  // Current Page & Execution State
  currentPage: ContextualPage | null;
  pageParameters: PageParameters;
  blockResults: BlockResults;
  selectedBlockId: string | null;

  // UI Visibility State (Desktop Panels)
  isNavigatorVisible: boolean;
  isInspectorVisible: boolean;
  isTerminalVisible: boolean; // This will become the "Activity Hub"

  // --- START: NEW MOBILE & SPOTLIGHT STATE ---
  // UI Visibility State (Mobile Drawers)
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;

  // UI Visibility State (Global Spotlight Modal)
  isSpotlightVisible: boolean;
  // --- END: NEW MOBILE & SPOTLIGHT STATE ---

  // Notebook View Options
  viewMode: ViewMode;
  showCodeBlocks: boolean;
  showMarkdownBlocks: boolean;

  inspectedArtifacts: InspectedArtifact[];
  addInspectedArtifact: (artifact: InspectedArtifact) => void;
  removeInspectedArtifact: (id: string) => void;

  // --- ACTIONS to modify the state ---

  // Data Setters
  setConnections: (connections: ActiveConnection[]) => void;
  setVariables: (variables: SessionVariable[]) => void;
  setFlows: (flows: Flow[]) => void;
  setQueries: (queries: Query[]) => void;
  setLastJsonMessage: (message: InboundMessage | null) => void;
  setCurrentPage: (page: ContextualPage | null) => void;
  setBlockResult: (blockId: string, result: BlockResult) => void;
  setSelectedBlockId: (blockId: string | null) => void;

  // UI Toggles (Desktop)
  toggleNavigator: (open?: boolean) => void;
  toggleInspector: (open?: boolean) => void;
  toggleTerminal: (open?: boolean) => void;
  toggleNavDrawer: (open?: boolean) => void;
  toggleInspectorDrawer: (open?: boolean) => void;

  // UI Toggles (Spotlight)
  openSpotlight: () => void;
  closeSpotlight: () => void;
  // --- END: NEW MOBILE & SPOTLIGHT ACTIONS ---

  // Notebook View Actions
  setViewMode: (mode: ViewMode) => void;
  toggleShowCodeBlocks: () => void;
  toggleShowMarkdownBlocks: () => void;
  setShowOutputsOnly: (showOnly: boolean) => void;

  // Content Updaters
  updateBlockContent: (blockId: string, newContent: string) => void;
  updatePageParameter: (key: string, value: any) => void;
  reset: () => void;
}

// --- The `create` implementation of the store ---

const initialState = {
  connections: [],
  variables: [],
  flows: [],
  queries: [],
  lastJsonMessage: null,
  currentPage: null,
  pageParameters: {},
  blockResults: {},
  selectedBlockId: null,
  isNavigatorVisible: true,
  isInspectorVisible: false,
  isTerminalVisible: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,
  isSpotlightVisible: false,
  viewMode: "document" as ViewMode,
  showCodeBlocks: true,
  showMarkdownBlocks: true,
  inspectedArtifacts: [],
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  // Default initial state values

  // --- ACTION IMPLEMENTATIONS ---
  setConnections: (connections) => set({ connections }),
  setVariables: (variables) => set({ variables }),
  setFlows: (flows) => set({ flows }),
  setQueries: (queries) => set({ queries }),
  setLastJsonMessage: (message) => set({ lastJsonMessage: message }),
  setCurrentPage: (page) => {
    const initialParams: PageParameters = {};
    if (page?.inputs) {
      for (const key in page.inputs) {
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

  toggleNavigator: (open) =>
    set((state) => ({
      isNavigatorVisible: open === undefined ? !state.isNavigatorVisible : open,
    })),
  toggleInspector: (open) =>
    set((state) => ({
      isInspectorVisible: open === undefined ? !state.isInspectorVisible : open,
    })),
  toggleTerminal: (open) =>
    set((state) => ({
      isTerminalVisible: open === undefined ? !state.isTerminalVisible : open,
    })),

  toggleNavDrawer: (open) =>
    set((state) => ({
      isNavDrawerOpen: open === undefined ? !state.isNavDrawerOpen : open,
    })),
  toggleInspectorDrawer: (open) =>
    set((state) => ({
      isInspectorDrawerOpen:
        open === undefined ? !state.isInspectorDrawerOpen : open,
    })),

  openSpotlight: () => set({ isSpotlightVisible: true }),
  closeSpotlight: () => set({ isSpotlightVisible: false }),

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleShowCodeBlocks: () =>
    set((state) => ({ showCodeBlocks: !state.showCodeBlocks })),
  toggleShowMarkdownBlocks: () =>
    set((state) => ({ showMarkdownBlocks: !state.showMarkdownBlocks })),
  setShowOutputsOnly: (showOnly) =>
    set({
      showCodeBlocks: !showOnly,
      showMarkdownBlocks: !showOnly,
    }),

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

  addInspectedArtifact: (artifact) =>
    set((state) => ({
      // Add the new artifact, preventing duplicates
      inspectedArtifacts: [
        ...state.inspectedArtifacts.filter((a) => a.id !== artifact.id),
        artifact,
      ],
    })),
  removeInspectedArtifact: (id) =>
    set((state) => ({
      inspectedArtifacts: state.inspectedArtifacts.filter((a) => a.id !== id),
    })),
  reset: () => set(initialState),
}));
