import { create } from "zustand";
import { BlockResult, ContextualPage } from "../types/notebook";
import {
  InboundMessage,
  WorkspaceBrowseResultFields,
  HomepageDataResultFields,
  InspectedArtifact,
} from "../api/types";

export interface AssetTreeNode {
  key: string;
  title: string;
  isLeaf: boolean;
  type: "project" | "group" | "flow" | "query" | "application";
  children?: AssetTreeNode[];
}

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
  pageParameters: PageParameters;
  blockResults: Record<string, BlockResult | undefined>;
  selectedBlockId: string | null;
  inspectedArtifacts: InspectedArtifact[]; // For the "Data Tray" / Inspector

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
  updatePageParameter: (key: string, value: any) => void;

  // New actions for output and inspector management
  addInspectedArtifact: (artifact: InspectedArtifact) => void;
  removeInspectedArtifact: (id: string) => void;
  clearBlockResult: (blockId: string) => void;
  clearAllBlockResults: () => void;
  reset: () => void;
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
  pageParameters: {},
  blockResults: {},
  selectedBlockId: null,
  inspectedArtifacts: [],
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  // --- ACTION IMPLEMENTATIONS ---
  setLastJsonMessage: (message) => set({ lastJsonMessage: message }),
  setCurrentPage: (page) => {
    const initialParams: PageParameters = {};
    if (page?.inputs) {
      for (const key in page.inputs) {
        if (page.inputs[key].default !== undefined) {
          initialParams[key] = page.inputs[key].default;
        }
      }
    }
    set({
      currentPage: page,
      blockResults: {},
      selectedBlockId: null,
      pageParameters: initialParams,
      inspectedArtifacts: [], // Also clear pinned items on page change
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
        const nodes = Array.isArray(data) ? (data as any[]) : [];
        if (path.startsWith("library/")) {
          return {
            libraryTreeData: updateTreeDataWithChildren(
              state.libraryTreeData,
              path,
              nodes
            ),
          };
        } else {
          return {
            projectsTreeData: updateTreeDataWithChildren(
              state.projectsTreeData,
              path,
              nodes
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
  updatePageParameter: (key, value) =>
    set((state) => ({
      pageParameters: { ...state.pageParameters, [key]: value },
    })),

  // --- NEW ACTION IMPLEMENTATIONS ---
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
  clearBlockResult: (blockId) =>
    set((state) => {
      const { [blockId]: _, ...remainingResults } = state.blockResults;
      return { blockResults: remainingResults };
    }),
  clearAllBlockResults: () => set({ blockResults: {} }),

  reset: () => set(initialState),
}));
