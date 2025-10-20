import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "document" | "grid" | "graph";

interface SettingsStore {
  // --- STATE ---
  // Main layout panel visibility
  isNavigatorVisible: boolean;
  isInspectorVisible: boolean;
  isTerminalVisible: boolean;

  // Notebook perspective
  viewMode: ViewMode;

  // New Content Filters for Document View
  showNarrative: boolean;
  showConfig: boolean;
  showCode: boolean;

  // --- ACTIONS ---
  toggleNavigator: (open?: boolean) => void;
  toggleInspector: (open?: boolean) => void;
  toggleTerminal: (open?: boolean) => void;
  setViewMode: (mode: ViewMode) => void;

  // New actions for Content Filters
  setShowNarrative: (show: boolean) => void;
  setShowConfig: (show: boolean) => void;
  setShowCode: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Default initial state
      isNavigatorVisible: true,
      isInspectorVisible: false,
      isTerminalVisible: false,
      viewMode: "document",
      showNarrative: true,
      showConfig: true,
      showCode: true,

      // Actions
      toggleNavigator: (open) =>
        set((state) => ({
          isNavigatorVisible:
            open === undefined ? !state.isNavigatorVisible : open,
        })),
      toggleInspector: (open) =>
        set((state) => ({
          isInspectorVisible:
            open === undefined ? !state.isInspectorVisible : open,
        })),
      toggleTerminal: (open) =>
        set((state) => ({
          isTerminalVisible:
            open === undefined ? !state.isTerminalVisible : open,
        })),
      setViewMode: (mode) => set({ viewMode: mode }),

      // New filter actions
      setShowNarrative: (show) => set({ showNarrative: show }),
      setShowConfig: (show) => set({ showConfig: show }),
      setShowCode: (show) => set({ showCode: show }),
    }),
    {
      name: "syncropel-studio-settings-storage",
    }
  )
);
