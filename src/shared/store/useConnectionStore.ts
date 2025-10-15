import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      activeProfileId: LOCAL_SERVER_PROFILE.id,

      setActiveProfileId: (id) => {
        const profileExists = get().profiles.some((p) => p.id === id);
        if (profileExists) {
          set({ activeProfileId: id });
          // IMPORTANT: We reload the page to force a full re-connection and state reset.
          // This is the simplest and most robust way to handle switching contexts.
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

      removeProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id && !p.isDefault), // Prevent deleting default
        }));
      },

      disconnect: () => {
        set({ activeProfileId: null });
        // Force a reload to clear all state and show the WelcomeScreen
        window.location.reload();
      },

      getActiveProfile: () => {
        const state = get();
        return state.profiles.find((p) => p.id === state.activeProfileId);
      },
    }),
    {
      name: "syncropel-connections-storage", // Name for the localStorage key
    }
  )
);
