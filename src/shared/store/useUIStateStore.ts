import { create } from "zustand";

interface UIStateStore {
  // --- STATE ---
  // Visibility state for modals and mobile drawers. These should reset on page load.
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;

  // --- ACTIONS ---
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleConnectionManager: (open?: boolean) => void;
  toggleNavDrawer: (open?: boolean) => void;
  toggleInspectorDrawer: (open?: boolean) => void;
}

export const useUIStateStore = create<UIStateStore>((set) => ({
  // Default initial state
  isSpotlightVisible: false,
  isConnectionManagerOpen: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,

  // Actions to update the state
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
}));
