import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionStore } from "./useSessionStore";

export interface ConnectionProfile {
  id: string; // e.g., 'local', 'staging', 'prod'
  name: string; // e.g., 'Local Server', 'Staging Environment'
  url: string; // The WebSocket URL, e.g., 'ws://localhost:8889'
  isDefault?: boolean; // For the built-in local connection
}

interface ConnectionStore {
  profiles: ConnectionProfile[];
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
  addProfile: (profile: Omit<ConnectionProfile, "id">) => void;
  removeProfile: (id: string) => void;
  getActiveProfile: () => ConnectionProfile | undefined;
  disconnect: () => void;
}

// The default local server profile. This is the "it just works" fallback.
const DEFAULT_SERVER_PROFILE: ConnectionProfile = {
  id: "default",
  name: "Default Server",
  url:
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
          window.location.host
        }/ws`
      : "ws://localhost:3000/ws", // Fallback for SSR
  isDefault: true,
};

const LOCAL_SERVER_PROFILE: ConnectionProfile = {
  id: "local",
  name: "Local Server",
  url:
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
          window.location.host
        }/ws`
      : "ws://localhost:3000/ws", // Fallback for SSR
  isDefault: true,
};

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      profiles: [LOCAL_SERVER_PROFILE],
      activeProfileId: null,

      setActiveProfileId: (id) => {
        const profileExists = get().profiles.some((p) => p.id === id);
        if (profileExists) {
          set({ activeProfileId: id });
          window.location.reload();
        } else {
          console.error(
            `Attempted to switch to non-existent profile ID: ${id}`
          );
        }
      },

      addProfile: (profile) => {
        const newProfile: ConnectionProfile = {
          ...profile,
          id: `remote-${Date.now()}`,
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));
      },

      // --- START: DEFINITIVE FIX FOR removeProfile ---
      removeProfile: (idToRemove) => {
        const { activeProfileId, disconnect } = get();

        // If the profile we are removing is the currently active one,
        // we must trigger a full disconnect first.
        if (activeProfileId === idToRemove) {
          disconnect();
          return; // The disconnect action handles the reload, so we stop here.
        }

        // Otherwise, just filter the profile out of the list.
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== idToRemove),
        }));
      },
      // --- END: DEFINITIVE FIX ---

      disconnect: () => {
        useSessionStore.getState().reset();
        set({ activeProfileId: null });
        window.location.reload();
      },

      getActiveProfile: () => {
        const state = get();
        return state.profiles.find((p) => p.id === state.activeProfileId);
      },
    }),
    {
      name: "syncropel-connections-storage",
    }
  )
);
