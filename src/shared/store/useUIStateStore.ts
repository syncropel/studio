// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useUIStateStore.ts
import { create } from "zustand";
import React from "react";
import { AgentResponseFields } from "@/shared/api/types";

// --- TYPE DEFINITIONS ---

// The different "views" that can be displayed in the main sidebar panel.
export type SidebarView = "explorer" | "ecosystem" | "global";

// Commands that can be sent to the Monaco editor instance.
export type FoldingCommand = "collapseAll" | "expandAll" | "collapseCode";

// The mode of the main input bar in the Output Panel.
export type OutputPanelMode = "agent" | "cli";

// --- DEFINITIVE UNIFIED CONVERSATION/TERMINAL HISTORY TYPES ---
// These define all possible "turns" or lines that can appear in the unified terminal history.

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

// The ConversationTurn is a union of all possible line types.
export type ConversationTurn =
  | UserPrompt
  | AgentResponse
  | CliInput
  | CliOutput
  | ModeSwitch;

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
  isNavDrawerOpen: boolean;
  isInspectorDrawerOpen: boolean;
  foldingCommand: FoldingCommand | null;
  modalState: ModalState | null;

  // Unified Terminal/Conversation State
  outputPanelMode: OutputPanelMode;
  promptContextPaths: string[];
  conversationHistory: ConversationTurn[];

  // Triggers
  isSaving: boolean;
  saveTrigger: number;
  runAllTrigger: number;

  // Dynamic Output Panel State
  outputPanelTabs: string[];
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

  // Unified Terminal/Conversation Actions
  setOutputPanelMode: (mode: OutputPanelMode) => void;
  setPromptContextPaths: (paths: string[]) => void;
  addConversationTurn: (turn: ConversationTurn) => void;
  clearConversation: () => void;

  // General Triggers
  setIsSaving: (saving: boolean) => void;
  triggerSave: () => void;
  triggerRunAll: () => void;

  // Dynamic Output Panel Actions
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

  outputPanelMode: "agent", // Default to the intelligent agent mode
  promptContextPaths: [],
  conversationHistory: [],

  isSaving: false,
  saveTrigger: 0,
  runAllTrigger: 0,

  outputPanelTabs: ["terminal"], // The ONLY permanent tab is 'terminal'
  activeOutputPanelTab: "terminal",

  // --- ACTION IMPLEMENTATIONS ---
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),

  // Unified Terminal/Conversation Actions
  setOutputPanelMode: (mode) => {
    // When switching modes, add a visual separator to the history for clarity
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

  // All other existing actions
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
    // The 'terminal' tab is the new permanent tab.
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
        newActiveTab = newTabs[closedTabIndex - 1] || "terminal"; // Fallback to the permanent 'terminal' tab
      }
      return {
        outputPanelTabs: newTabs,
        activeOutputPanelTab: newActiveTab,
      };
    });
  },
}));
