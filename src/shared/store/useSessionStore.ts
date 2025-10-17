// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useSessionStore.ts
import { create } from "zustand";
import {
  BlockResult,
  ContextualPage,
  PageInputParameter,
} from "../types/notebook";
import {
  InboundMessage,
  WorkspaceBrowseResultFields,
  HomepageDataResultFields,
  InspectedArtifact,
} from "../api/types";
import { ViewMode } from "./useSettingsStore";

// Type definitions remain the same
export interface AssetTreeNode {
  key: string;
  title: string;
  isLeaf: boolean;
  type: "project" | "group" | "flow" | "query" | "application";
  children?: AssetTreeNode[];
  isLoadingChildren?: boolean;
}

// Helper function for tree updates remains the same
const updateTreeDataWithChildren = (
  list: AssetTreeNode[],
  key: React.Key,
  children: AssetTreeNode[]
): AssetTreeNode[] => {
  return list.map((node) => {
    if (node.key === key) {
      return { ...node, children, isLoadingChildren: false };
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeDataWithChildren(node.children, key, children),
      };
    }
    return node;
  });
};

// Define PageParameters type for clarity
export type PageParameters = Record<string, any>;

interface SessionStore {
  // --- STATE ---
  connections: any[];
  variables: any[];
  lastJsonMessage: InboundMessage | null;

  projectsTreeData: AssetTreeNode[];
  libraryTreeData: AssetTreeNode[];
  homepageData: HomepageDataResultFields | null;

  isWorkspaceLoading: boolean;
  isHomepageLoading: boolean;

  currentPage: ContextualPage | null;
  pageParameters: PageParameters; // <-- RE-INTRODUCED
  blockResults: Record<string, BlockResult | undefined>;
  selectedBlockId: string | null;

  inspectedArtifacts: InspectedArtifact[];

  showCodeBlocks: boolean; // Add this
  showMarkdownBlocks: boolean; // Add this

  // --- ACTIONS ---
  setLastJsonMessage: (message: InboundMessage | null) => void;
  setCurrentPage: (page: ContextualPage | null) => void;
  setBlockResult: (blockId: string, result: BlockResult) => void;
  setConnections: (connections: any[]) => void;
  setVariables: (variables: any[]) => void;

  handleWorkspaceBrowseResult: (payload: WorkspaceBrowseResultFields) => void;
  setHomepageData: (data: HomepageDataResultFields | null) => void;

  setIsWorkspaceLoading: (isLoading: boolean) => void;
  setIsHomepageLoading: (isLoading: boolean) => void;

  setSelectedBlockId: (blockId: string | null) => void;
  updateBlockContent: (blockId: string, newContent: string) => void;
  updatePageParameter: (key: string, value: any) => void; // <-- RE-INTRODUCED

  addInspectedArtifact: (artifact: InspectedArtifact) => void;
  removeInspectedArtifact: (id: string) => void;

  reset: () => void;
  toggleShowCodeBlocks: () => void; // Add this
  toggleShowMarkdownBlocks: () => void; // Add this
  setShowOutputsOnly: (showOnly: boolean) => void; // Add this
}

const initialState = {
  connections: [],
  variables: [],
  lastJsonMessage: null,
  projectsTreeData: [],
  libraryTreeData: [],
  homepageData: null,
  isWorkspaceLoading: true,
  isHomepageLoading: true,
  currentPage: null,
  pageParameters: {}, // <-- RE-INTRODUCED
  blockResults: {},
  selectedBlockId: null,
  inspectedArtifacts: [],
  showCodeBlocks: true,
  showMarkdownBlocks: true,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  // --- ACTION IMPLEMENTATIONS ---
  setLastJsonMessage: (message) => set({ lastJsonMessage: message }),

  // --- CRITICAL FIX in setCurrentPage ---
  setCurrentPage: (page) => {
    const initialParams: PageParameters = {};
    if (page?.inputs) {
      // Pre-populate parameters with default values from the new page
      for (const key in page.inputs) {
        if (page.inputs[key].default !== undefined) {
          initialParams[key] = page.inputs[key].default;
        }
      }
    }
    // When a new page is loaded, we must also reset its parameters and results
    set({
      currentPage: page,
      blockResults: {},
      selectedBlockId: null,
      pageParameters: initialParams,
    });
  },

  setBlockResult: (blockId, result) =>
    set((state) => ({
      blockResults: { ...state.blockResults, [blockId]: result },
    })),
  setConnections: (connections) => set({ connections }),
  setVariables: (variables) => set({ variables }),
  setIsWorkspaceLoading: (isLoading) => set({ isWorkspaceLoading: isLoading }),
  setIsHomepageLoading: (isLoading) => set({ isHomepageLoading: isLoading }),
  setHomepageData: (data) =>
    set({ homepageData: data, isHomepageLoading: false }),

  handleWorkspaceBrowseResult: (payload) =>
    set((state) => {
      const { path, data } = payload;
      if (path === "/") {
        return {
          projectsTreeData: data.projects || [],
          libraryTreeData: data.library || [],
          isWorkspaceLoading: false,
        };
      } else {
        const nodesForTree: AssetTreeNode[] = Array.isArray(data)
          ? (data as any[])
          : [];
        if (path.startsWith("library/")) {
          return {
            libraryTreeData: updateTreeDataWithChildren(
              state.libraryTreeData,
              path,
              nodesForTree
            ),
          };
        } else {
          return {
            projectsTreeData: updateTreeDataWithChildren(
              state.projectsTreeData,
              path,
              nodesForTree
            ),
          };
        }
      }
    }),

  setSelectedBlockId: (blockId) => set({ selectedBlockId: blockId }),
  updateBlockContent: (blockId, newContent) =>
    set((state) => {
      if (!state.currentPage) return {};
      const newBlocks = state.currentPage.blocks.map((block) =>
        block.id === blockId ? { ...block, content: newContent } : block
      );
      return { currentPage: { ...state.currentPage, blocks: newBlocks } };
    }),
  // --- RE-INTRODUCED ACTION ---
  updatePageParameter: (key, value) =>
    set((state) => ({
      pageParameters: { ...state.pageParameters, [key]: value },
    })),

  addInspectedArtifact: (artifact) =>
    set((state) => ({
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
  toggleShowCodeBlocks: () =>
    set((state) => ({ showCodeBlocks: !state.showCodeBlocks })),
  toggleShowMarkdownBlocks: () =>
    set((state) => ({ showMarkdownBlocks: !state.showMarkdownBlocks })),
  setShowOutputsOnly: (showOnly) =>
    set({
      showCodeBlocks: !showOnly,
      showMarkdownBlocks: !showOnly,
    }),
}));
