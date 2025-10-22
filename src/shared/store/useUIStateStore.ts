// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";
import React from "react";

export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";

/**
 * Defines the shape for a generic modal that can be opened from anywhere in the app.
 * The content is a ReactNode, allowing any component to be rendered inside.
 */
interface ModalState {
  title: string;
  content: React.ReactNode;
  size?: string | number; // Optional size prop for Mantine Modal
}

/**
 * This store manages transient UI state that should NOT be persisted.
 * It's responsible for the visibility of modals, drawers, and other temporary UI elements.
 * It also acts as a "command bus" for cross-component communication using simple triggers.
 */
interface UIStateStore {
  // --- STATE ---
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean; // Mobile-only
  isInspectorDrawerOpen: boolean; // Mobile-only
  foldingCommand: FoldingCommand | null; // Command for the Monaco editor
  modalState: ModalState | null; // State for the generic modal
  activeFormWidgetIds: Set<string>; // IDs of visible inline forms in the editor
  showCommandPalette: boolean; // Trigger for Monaco's command palette
  saveTrigger: number; // A counter that increments to signal a save action
  runAllTrigger: number; // A counter that increments to signal a "Run All" action

  // --- ACTIONS ---
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleConnectionManager: (open?: boolean) => void;
  toggleNavDrawer: (open?: boolean) => void;
  toggleInspectorDrawer: (open?: boolean) => void;
  setFoldingCommand: (command: FoldingCommand | null) => void;
  openModal: (state: ModalState) => void;
  closeModal: () => void;
  toggleFormWidget: (widgetId: string) => void;
  closeAllFormWidgets: () => void;
  triggerCommandPalette: () => void;
  resetCommandPalette: () => void;
  triggerSave: () => void;
  triggerRunAll: () => void;
}

export const useUIStateStore = create<UIStateStore>((set) => ({
  // Default initial state
  isSpotlightVisible: false,
  isConnectionManagerOpen: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,
  foldingCommand: null,
  modalState: null,
  activeFormWidgetIds: new Set(),
  showCommandPalette: false,
  saveTrigger: 0,
  runAllTrigger: 0,

  // --- ACTION IMPLEMENTATIONS ---
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
  triggerSave: () => set((state) => ({ saveTrigger: state.saveTrigger + 1 })),
  triggerRunAll: () =>
    set((state) => ({ runAllTrigger: state.runAllTrigger + 1 })),
}));
