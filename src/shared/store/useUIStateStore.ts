// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";
import React from "react";

export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";

interface ModalState {
  title: string;
  content: React.ReactNode;
}

interface UIStateStore {
  // --- STATE ---
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;
  foldingCommand: FoldingCommand | null;
  modalState: ModalState | null;

  // NEW: State to track which inline forms are visible.
  activeFormWidgetIds: Set<string>;
  showCommandPalette: boolean;

  // --- ACTIONS ---
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleConnectionManager: (open?: boolean) => void;
  toggleNavDrawer: (open?: boolean) => void;
  toggleInspectorDrawer: (open?: boolean) => void;
  setFoldingCommand: (command: FoldingCommand | null) => void;
  openModal: (state: ModalState) => void;
  closeModal: () => void;

  // NEW: Action to toggle the visibility of a specific form.
  toggleFormWidget: (widgetId: string) => void;
  // NEW: Action to close all forms (useful on page change).
  closeAllFormWidgets: () => void;
  triggerCommandPalette: () => void;
  // NEW: Action to reset the trigger
  resetCommandPalette: () => void;
}

export const useUIStateStore = create<UIStateStore>((set) => ({
  // Default initial state
  isSpotlightVisible: false,
  isConnectionManagerOpen: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,
  foldingCommand: null,
  modalState: null,
  showCommandPalette: false,

  activeFormWidgetIds: new Set(),

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
  setFoldingCommand: (command) => set({ foldingCommand: command }),
  openModal: (state) => set({ modalState: state }),
  closeModal: () => set({ modalState: null }),

  // --- NEW ACTION IMPLEMENTATIONS ---
  toggleFormWidget: (widgetId) =>
    set((state) => {
      const newSet = new Set(state.activeFormWidgetIds);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return { activeFormWidgetIds: newSet };
    }),

  closeAllFormWidgets: () => set({ activeFormWidgetIds: new Set() }),
  triggerCommandPalette: () => set({ showCommandPalette: true }),
  resetCommandPalette: () => set({ showCommandPalette: false }),
}));
