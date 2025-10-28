// /home/dpwanjala/repositories/syncropel/studio/src/shared/store/useConnectionStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionStore } from "./useSessionStore";
import { useSettingsStore } from "./useSettingsStore"; // ADD THIS IMPORT

export interface ConnectionProfile {
  id: string;
  name: string;
  url: string;
  description?: string;
  isDefault?: boolean;
}

interface ConnectionStore {
  profiles: ConnectionProfile[];
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  addProfile: (
    profile: Omit<ConnectionProfile, "id" | "isDefault" | "description">
  ) => void;
  removeProfile: (id: string) => void;
  getActiveProfile: () => ConnectionProfile | undefined;
  disconnect: () => void;
}

const getBundledServerUrl = (): string => {
  if (typeof window === "undefined") {
    return "ws://localhost:3000/ws";
  }

  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    return "ws://localhost:8889/ws";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

const BUNDLED_SERVER_PROFILE: ConnectionProfile = {
  id: "bundled",
  name: "Bundled Server",
  description: "Managed by this Syncropel Studio instance",
  url: getBundledServerUrl(),
  isDefault: true,
};

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      profiles: [BUNDLED_SERVER_PROFILE],
      activeProfileId: null,

      setActiveProfileId: (id) => {
        if (get().activeProfileId === id) return;

        const profileExists = get().profiles.some((p) => p.id === id);
        if (id && !profileExists) {
          console.error(`Attempted to activate non-existent profile ID: ${id}`);
          return;
        }

        useSessionStore.getState().reset();
        set({ activeProfileId: id });
      },

      addProfile: (profile) => {
        const newProfile: ConnectionProfile = {
          ...profile,
          id: `remote-${Date.now()}`,
          description: profile.url,
          isDefault: false,
        };
        set((state) => ({ profiles: [...state.profiles, newProfile] }));
        get().setActiveProfileId(newProfile.id);
      },

      removeProfile: (idToRemove) => {
        if (idToRemove === BUNDLED_SERVER_PROFILE.id) return;

        const { activeProfileId, disconnect } = get();
        if (activeProfileId === idToRemove) {
          disconnect();
        }
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== idToRemove),
        }));
      },

      disconnect: () => {
        get().setActiveProfileId(null);
        // ADD THIS LINE: Explicitly close the terminal panel on disconnect.
        useSettingsStore.getState().toggleTerminal(false);
      },

      getActiveProfile: () => {
        const state = get();
        return state.profiles.find((p) => p.id === state.activeProfileId);
      },
    }),
    {
      name: "syncropel-connections-storage",
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);
