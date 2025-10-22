// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useSessionStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BlockResult, ContextualPage, Block } from "../types/notebook";
import {
  InboundMessage,
  WorkspaceBrowseResultFields,
  HomepageDataResultFields,
  InspectedArtifact,
  PageStatusFields,
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

/**
 * Manages the state for the active user session. This includes the currently
 * loaded notebook, block results, and workspace data.
 * It is persisted to localStorage for session recovery.
 */
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
  inspectedArtifacts: InspectedArtifact[];
  isDirty: boolean;
  pageRunStatus: PageStatusFields | null;

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
  addInspectedArtifact: (artifact: InspectedArtifact) => void;
  removeInspectedArtifact: (id: string) => void;
  clearBlockResult: (blockId: string) => void;
  clearAllBlockResults: () => void;
  reset: () => void;
  updatePageMetadata: (
    metadata: Partial<{ name: string; description: string }>
  ) => void;
  setIsDirty: (isDirty: boolean) => void;
  setClean: () => void;
  setSavedPage: (pageId: string, pageName: string) => void;
  updateBlockMetadata: (blockId: string, metadata: Partial<Block>) => void;
  setPageRunStatus: (status: PageStatusFields | null) => void;
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
  isDirty: false,
  pageRunStatus: null,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

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
          inspectedArtifacts: [],
          isDirty: page?.id?.startsWith("local-") ?? false,
          pageRunStatus: null,
        });
      },
      setBlockResult: (blockId, result) =>
        set((state) => ({
          blockResults: { ...state.blockResults, [blockId]: result },
        })),
      setConnections: (connections) => set({ connections }),
      setVariables: (variables) => set({ variables }),
      setIsWorkspaceLoading: (isLoading) =>
        set({ isWorkspaceLoading: isLoading }),
      setIsHomepageLoading: (isLoading) =>
        set({ isHomepageLoading: isLoading }),
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
            return {
              projectsTreeData: updateTreeDataWithChildren(
                state.projectsTreeData,
                path,
                nodes
              ),
              libraryTreeData: updateTreeDataWithChildren(
                state.libraryTreeData,
                path,
                nodes
              ),
            };
          }
        }),
      setSelectedBlockId: (blockId) => set({ selectedBlockId: blockId }),
      updateBlockContent: (blockId, newContent) =>
        set((state) => {
          if (!state.currentPage) return {};
          const newBlocks = state.currentPage.blocks.map((block) =>
            block.id === blockId ? { ...block, content: newContent } : block
          );
          return {
            currentPage: { ...state.currentPage, blocks: newBlocks },
            isDirty: true,
          };
        }),
      updatePageParameter: (key, value) =>
        set((state) => ({
          pageParameters: { ...state.pageParameters, [key]: value },
          isDirty: true,
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
          inspectedArtifacts: state.inspectedArtifacts.filter(
            (a) => a.id !== id
          ),
        })),
      clearBlockResult: (blockId) =>
        set((state) => {
          const { [blockId]: _, ...remainingResults } = state.blockResults;
          return { blockResults: remainingResults };
        }),
      clearAllBlockResults: () =>
        set({ blockResults: {}, pageRunStatus: null }),
      reset: () => {
        set(initialState);
        // On a full reset (like discarding a session), we must also clear the persisted storage.
        localStorage.removeItem("syncropel-session-recovery");
      },
      updatePageMetadata: (metadata) =>
        set((state) => ({
          currentPage: state.currentPage
            ? { ...state.currentPage, ...metadata }
            : null,
          isDirty: true,
        })),
      setIsDirty: (isDirty) => set({ isDirty }),
      setClean: () => set({ isDirty: false }),
      setSavedPage: (pageId, pageName) =>
        set((state) => ({
          isDirty: false,
          currentPage: state.currentPage
            ? { ...state.currentPage, id: pageId, name: pageName }
            : null,
        })),
      updateBlockMetadata: (blockId, metadata) =>
        set((state) => {
          if (!state.currentPage) return {};
          const newBlocks = state.currentPage.blocks.map((block) =>
            block.id === blockId ? { ...block, ...metadata } : block
          );
          return {
            currentPage: { ...state.currentPage, blocks: newBlocks },
            isDirty: true,
          };
        }),
      setPageRunStatus: (status) => set({ pageRunStatus: status }),
    }),
    {
      name: "syncropel-session-recovery",
      partialize: (state) => ({
        currentPage: state.currentPage,
        pageParameters: state.pageParameters,
        isDirty: state.isDirty,
      }),
    }
  )
);
