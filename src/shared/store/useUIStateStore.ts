// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";

// Define the possible folding commands we can issue.
export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";

interface UIStateStore {
  // --- STATE ---
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;

  // New state to act as a command bus for folding actions.
  foldingCommand: FoldingCommand | null;

  // --- ACTIONS ---
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleConnectionManager: (open?: boolean) => void;
  toggleNavDrawer: (open?: boolean) => void;
  toggleInspectorDrawer: (open?: boolean) => void;

  // New action to dispatch a folding command.
  setFoldingCommand: (command: FoldingCommand | null) => void;
}

export const useUIStateStore = create<UIStateStore>((set) => ({
  // Default initial state
  isSpotlightVisible: false,
  isConnectionManagerOpen: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,
  foldingCommand: null,

  // Actions
  openSpotlight: () => set({ isSpotlightVisible: true }),
  closeSpotlight: () => set({ isSpotlightVisible: false }),
  toggleConnectionManager: (open) =>
    set((state) => ({
      isConnectionManagerOpen:
        open === undefined ? !state.isConnectionManagerOpen : open,
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

  // New action implementation
  setFoldingCommand: (command) => set({ foldingCommand: command }),
}));
