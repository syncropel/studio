// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";
import React from "react";

// The different "views" that can be displayed in the main sidebar panel.
// 'history' is removed as it's now an action, not a persistent view.
export type SidebarView = "explorer" | "ecosystem" | "global";

// Commands that can be sent to the Monaco editor instance.
export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";

// The shape of a generic modal that can be opened from anywhere.
interface ModalState {
  title: string;
  content: React.ReactNode;
  size?: string | number;
}

/**
 * Manages transient UI state that should NOT be persisted across sessions.
 * This store is responsible for the visibility of modals, drawers, and other
 * temporary UI elements. It also acts as a "command bus" for cross-component
 * communication via simple triggers.
 */
interface UIStateStore {
  // --- STATE ---
  activeSidebarView: SidebarView;
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean; // Mobile-only
  isInspectorDrawerOpen: boolean; // Mobile-only
  foldingCommand: FoldingCommand | null;
  modalState: ModalState | null;
  activeFormWidgetIds: Set<string>;
  showCommandPalette: boolean;
  isSaving: boolean;
  saveTrigger: number;
  runAllTrigger: number;

  // State for the dynamic Output Panel
  outputPanelTabs: string[]; // e.g., ['terminal', 'runs', 'run-detail-xyz']
  activeOutputPanelTab: string | null;

  // --- ACTIONS ---
  setActiveSidebarView: (view: SidebarView) => void;
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
  setIsSaving: (saving: boolean) => void;
  triggerSave: () => void;
  triggerRunAll: () => void;

  // Actions for the dynamic Output Panel
  addOutputPanelTab: (tabId: string) => void;
  removeOutputPanelTab: (tabId: string) => void;
  setActiveOutputPanelTab: (tabId: string | null) => void;
}

export const useUIStateStore = create<UIStateStore>((set, get) => ({
  // --- Default Initial State ---
  activeSidebarView: "explorer",
  isSpotlightVisible: false,
  isConnectionManagerOpen: false,
  isNavDrawerOpen: false,
  isInspectorDrawerOpen: false,
  foldingCommand: null,
  modalState: null,
  activeFormWidgetIds: new Set(),
  showCommandPalette: false,
  isSaving: false,
  saveTrigger: 0,
  runAllTrigger: 0,
  outputPanelTabs: ["terminal"], // Default to only showing the terminal tab.
  activeOutputPanelTab: "terminal",

  // --- ACTION IMPLEMENTATIONS ---
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),
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
  setIsSaving: (saving) => set({ isSaving: saving }),
  triggerSave: () => set((state) => ({ saveTrigger: state.saveTrigger + 1 })),
  triggerRunAll: () =>
    set((state) => ({ runAllTrigger: state.runAllTrigger + 1 })),

  // --- Actions for the dynamic Output Panel ---
  setActiveOutputPanelTab: (tabId) => set({ activeOutputPanelTab: tabId }),

  addOutputPanelTab: (tabId) => {
    const { outputPanelTabs } = get();
    // If the tab doesn't already exist, add it.
    if (!outputPanelTabs.includes(tabId)) {
      set({
        outputPanelTabs: [...outputPanelTabs, tabId],
        activeOutputPanelTab: tabId, // Automatically switch to the new tab
      });
    } else {
      // If the tab already exists, just switch to it.
      set({ activeOutputPanelTab: tabId });
    }
  },

  removeOutputPanelTab: (tabIdToRemove) => {
    // The 'terminal' tab is permanent and cannot be removed.
    if (tabIdToRemove === "terminal") return;

    set((state) => {
      const newTabs = state.outputPanelTabs.filter(
        (id) => id !== tabIdToRemove
      );
      let newActiveTab = state.activeOutputPanelTab;

      // If the closed tab was the active one, decide which tab to activate next.
      if (state.activeOutputPanelTab === tabIdToRemove) {
        const closedTabIndex = state.outputPanelTabs.findIndex(
          (id) => id === tabIdToRemove
        );
        // Intelligently activate the tab to the left, or fallback to the terminal.
        newActiveTab = newTabs[closedTabIndex - 1] || "terminal";
      }

      return {
        outputPanelTabs: newTabs,
        activeOutputPanelTab: newActiveTab,
      };
    });
  },
}));
