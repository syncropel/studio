import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "document" | "grid" | "graph";

interface SettingsStore {
  // --- STATE ---
  // Visibility of the main desktop panels. Persisted so the user's layout is saved.
  isNavigatorVisible: boolean;
  isInspectorVisible: boolean;
  isTerminalVisible: boolean;

  // Notebook-specific view preferences
  viewMode: ViewMode;

  // --- ACTIONS ---
  toggleNavigator: (open?: boolean) => void;
  toggleInspector: (open?: boolean) => void;
  toggleTerminal: (open?: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  // The `persist` middleware automatically saves state to localStorage.
  persist(
    (set) => ({
      // Default initial state
      isNavigatorVisible: true,
      isInspectorVisible: false,
      isTerminalVisible: false,
      viewMode: "document",

      // Actions to update the state
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
    }),
    {
      name: "syncropel-studio-settings-storage", // Unique name for localStorage key
    }
  )
);
