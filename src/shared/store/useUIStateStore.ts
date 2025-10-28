// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";
import React from "react";
import { AgentResponseFields } from "@/shared/api/types";

// --- TYPE DEFINITIONS ---

export type SidebarView = "explorer" | "ecosystem" | "global";
export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";
export type OutputPanelMode = "agent" | "cli";

export interface UserPrompt {
  type: "user_prompt";
  prompt: string;
  context_paths: string[];
}
export interface AgentResponse extends AgentResponseFields {
  type: "agent_response";
}
export interface CliInput {
  type: "cli_input";
  content: string;
}
export interface CliOutput {
  type: "cli_output";
  content: string;
  interactive_run_id?: string;
}
export interface ModeSwitch {
  type: "mode_switch";
  newMode: OutputPanelMode;
}

export type ConversationTurn =
  | UserPrompt
  | AgentResponse
  | CliInput
  | CliOutput
  | ModeSwitch;

interface ModalState {
  title: string;
  content: React.ReactNode;
  size?: string | number;
}

interface UIStateStore {
  // --- STATE ---
  activeSidebarView: SidebarView;
  isSpotlightVisible: boolean;
  isConnectionManagerOpen: boolean;
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;
  foldingCommand: FoldingCommand | null;
  modalState: ModalState | null;
  outputPanelMode: OutputPanelMode;
  promptContextPaths: string[];
  conversationHistory: ConversationTurn[];
  isSaving: boolean;
  saveTrigger: number;
  runAllTrigger: number;
  outputPanelTabs: string[];
  activeOutputPanelTab: string | null;
  activeFormWidgetIds: Set<string>;
  commandPaletteTrigger: number; // ADDED

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
  setOutputPanelMode: (mode: OutputPanelMode) => void;
  setPromptContextPaths: (paths: string[]) => void;
  addConversationTurn: (turn: ConversationTurn) => void;
  clearConversation: () => void;
  setIsSaving: (saving: boolean) => void;
  triggerSave: () => void;
  triggerRunAll: () => void;
  addOutputPanelTab: (tabId: string) => void;
  removeOutputPanelTab: (tabId: string) => void;
  setActiveOutputPanelTab: (tabId: string | null) => void;
  toggleFormWidget: (widgetId: string) => void;
  triggerCommandPalette: () => void; // ADDED
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
  outputPanelMode: "agent",
  promptContextPaths: [],
  conversationHistory: [],
  isSaving: false,
  saveTrigger: 0,
  runAllTrigger: 0,
  outputPanelTabs: ["terminal"],
  activeOutputPanelTab: "terminal",
  activeFormWidgetIds: new Set(),
  commandPaletteTrigger: 0, // ADDED

  // --- ACTION IMPLEMENTATIONS ---
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),
  setOutputPanelMode: (mode) => {
    if (get().outputPanelMode !== mode) {
      set((state) => ({
        outputPanelMode: mode,
        conversationHistory: [
          ...state.conversationHistory,
          { type: "mode_switch", newMode: mode },
        ],
      }));
    }
  },
  setPromptContextPaths: (paths) => set({ promptContextPaths: paths }),
  addConversationTurn: (turn) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, turn],
    })),
  clearConversation: () => set({ conversationHistory: [] }),
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
  setIsSaving: (saving) => set({ isSaving: saving }),
  triggerSave: () => set((state) => ({ saveTrigger: state.saveTrigger + 1 })),
  triggerRunAll: () =>
    set((state) => ({ runAllTrigger: state.runAllTrigger + 1 })),
  setActiveOutputPanelTab: (tabId) => set({ activeOutputPanelTab: tabId }),
  addOutputPanelTab: (tabId) => {
    const { outputPanelTabs } = get();
    if (!outputPanelTabs.includes(tabId)) {
      set({
        outputPanelTabs: [...outputPanelTabs, tabId],
        activeOutputPanelTab: tabId,
      });
    } else {
      set({ activeOutputPanelTab: tabId });
    }
  },
  removeOutputPanelTab: (tabIdToRemove) => {
    if (tabIdToRemove === "terminal") return;
    set((state) => {
      const newTabs = state.outputPanelTabs.filter(
        (id) => id !== tabIdToRemove
      );
      let newActiveTab = state.activeOutputPanelTab;
      if (state.activeOutputPanelTab === tabIdToRemove) {
        const closedTabIndex = state.outputPanelTabs.findIndex(
          (id) => id === tabIdToRemove
        );
        newActiveTab = newTabs[closedTabIndex - 1] || "terminal";
      }
      return {
        outputPanelTabs: newTabs,
        activeOutputPanelTab: newActiveTab,
      };
    });
  },
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
  triggerCommandPalette: () =>
    // ADDED
    set((state) => ({
      commandPaletteTrigger: state.commandPaletteTrigger + 1,
    })),
}));
