"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader, Center, Modal, Box, Drawer, Text } from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ReadyState } from "react-use-websocket";
import { nanoid } from "nanoid";

// --- HOOKS & STORES ---
// Custom hook to ensure client-side rendering
import { useIsClient } from "@/shared/hooks/useIsClient";
// Sliced Zustand stores for clean state management
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
// WebSocket provider for server communication
import { useWebSocket } from "@/shared/providers/WebSocketProvider";

// Type definitions
import type { HomepageItem } from "@/widgets/Spotlight";

// --- WIDGET IMPORTS ---
import TopBar from "@/widgets/TopBar";
import SidebarWidget from "@/widgets/SidebarWidget";
import Notebook from "@/widgets/Notebook";
import InspectorWidget from "@/widgets/InspectorWidget";
import ActivityHubWidget from "@/widgets/ActivityHubWidget";
import Homepage from "@/widgets/Homepage";
import Spotlight from "@/widgets/Spotlight";
import BottomActionBar from "@/widgets/BottomActionBar";
import ConnectionManager from "@/widgets/ConnectionManager";
import WelcomeScreen from "@/widgets/WelcomeScreen";

export default function StudioClientRoot() {
  // --- CORE HOOKS ---
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialLoadHandled = useRef(false);

  // --- STATE MANAGEMENT ---
  // Read state and actions from our new, sliced Zustand stores.
  // This makes dependencies explicit and improves performance.
  const { currentPage } = useSessionStore();
  const { getActiveProfile } = useConnectionStore();
  const { isNavigatorVisible, isInspectorVisible, isTerminalVisible } =
    useSettingsStore();
  const {
    isSpotlightVisible,
    isConnectionManagerOpen,
    isNavDrawerOpen,
    isInspectorDrawerOpen,
    openSpotlight,
    closeSpotlight,
    toggleConnectionManager,
    toggleNavDrawer,
    toggleInspectorDrawer,
  } = useUIStateStore();

  const { sendJsonMessage, readyState } = useWebSocket();
  const activeProfile = getActiveProfile();

  // --- HOTKEYS & SIDE EFFECTS ---
  useHotkeys([
    [
      "mod+K",
      (e) => {
        e.preventDefault();
        openSpotlight();
      },
    ],
  ]);

  // Effect for handling initial page load from URL query parameter
  useEffect(() => {
    if (
      isClient &&
      readyState === ReadyState.OPEN &&
      !initialLoadHandled.current
    ) {
      const pageIdFromUrl = searchParams.get("page");
      if (pageIdFromUrl && pageIdFromUrl !== "undefined") {
        sendJsonMessage({
          type: "PAGE.LOAD",
          command_id: `load-page-from-url-${nanoid()}`,
          payload: { page_id: pageIdFromUrl },
        });
      }
      initialLoadHandled.current = true;
    }
  }, [isClient, readyState, searchParams, sendJsonMessage]);

  // Effect for keeping the browser URL in sync with the current page state
  useEffect(() => {
    if (!isClient) return;

    const pageInUrl = searchParams.get("page");
    const pageIdInState = currentPage?.id;

    // Condition 1: We have a page in our state, and the URL is out of sync.
    // This includes the case where the URL has `page=undefined` or is just `/`.
    if (pageIdInState && pageIdInState !== pageInUrl) {
      router.push(`/?page=${pageIdInState}`, { scroll: false });
    }
    // Condition 2: We have no page in our state, but the URL still thinks we do.
    // This handles the case where the user navigates "home".
    else if (!pageIdInState && pageInUrl) {
      router.push(`/`, { scroll: false });
    }
  }, [currentPage, searchParams, router, isClient]); // Dependencies are correct

  // --- EVENT HANDLERS ---
  const handleSpotlightItemClick = (item: HomepageItem) => {
    closeSpotlight(); // Close the modal immediately
    if (item.action.type === "open_page") {
      sendJsonMessage({
        type: "PAGE.LOAD",
        command_id: `load-page-${nanoid()}`,
        payload: { page_id: item.action.payload.page_id },
      });
    }
  };

  // --- RENDER LOGIC ---

  // Server-side rendering fallback
  if (!isClient) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  // Main content switcher based on connection and page state
  const renderMainContent = () => {
    if (!activeProfile) {
      return (
        <WelcomeScreen onConnectClick={() => toggleConnectionManager(true)} />
      );
    }
    if (readyState === ReadyState.CONNECTING) {
      return (
        <Center h="100%">
          <Loader />
          <Text ml="sm">Connecting to {activeProfile.name}...</Text>
        </Center>
      );
    }
    if (readyState === ReadyState.OPEN) {
      return currentPage ? <Notebook /> : <Homepage />;
    }
    // Default to a disconnected/error state
    return (
      <Center h="100%" className="p-4">
        <Text c="red" ta="center">
          Connection to{" "}
          <Text span fw={700}>
            {activeProfile.name}
          </Text>{" "}
          failed. Please check the server or your connection settings.
        </Text>
      </Center>
    );
  };

  const isConnected = readyState === ReadyState.OPEN;

  // --- MAIN COMPONENT JSX ---
  return (
    <main className="relative h-screen w-screen flex flex-col bg-white dark:bg-gray-950 text-black dark:text-white overflow-hidden">
      {/* --- MODALS & DRAWERS (Global Overlays) --- */}
      <Modal
        opened={isSpotlightVisible}
        onClose={closeSpotlight}
        withCloseButton={false}
        size="xl"
        padding={0}
        styles={{
          content: { background: "transparent", boxShadow: "none" },
          body: { paddingTop: "10vh" },
        }}
      >
        <Box className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <Spotlight onItemClick={handleSpotlightItemClick} />
        </Box>
      </Modal>

      <Modal
        opened={isConnectionManagerOpen}
        onClose={() => toggleConnectionManager(false)}
        title="Connection Manager"
        size="lg"
        centered
      >
        <ConnectionManager />
      </Modal>

      {isMobile && (
        <>
          <Drawer
            opened={isNavDrawerOpen}
            onClose={() => toggleNavDrawer(false)}
            title="Workspace"
            padding={0}
            size="85%"
          >
            <SidebarWidget
              onConnectionClick={() => toggleConnectionManager(true)}
              disabled={!isConnected}
            />
          </Drawer>
          <Drawer
            opened={isInspectorDrawerOpen}
            onClose={() => toggleInspectorDrawer(false)}
            title="Inspector"
            position="right"
            padding={0}
            size="85%"
          >
            <InspectorWidget />
          </Drawer>
        </>
      )}

      {/* --- MAIN LAYOUT --- */}
      <TopBar />

      <div
        className="flex-grow min-h-0"
        style={{ paddingBottom: isMobile && currentPage ? "60px" : "0" }}
      >
        <PanelGroup direction="vertical">
          <Panel>
            <PanelGroup direction="horizontal">
              {!isMobile && isNavigatorVisible && (
                <>
                  <Panel defaultSize={20} minSize={15} maxSize={40}>
                    <SidebarWidget
                      onConnectionClick={() => toggleConnectionManager(true)}
                      disabled={!isConnected}
                    />
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
                </>
              )}
              <Panel>{renderMainContent()}</Panel>
              {!isMobile && isInspectorVisible && (
                <>
                  <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
                  <Panel defaultSize={25} minSize={20} maxSize={50}>
                    <InspectorWidget />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
          {!isMobile && isTerminalVisible && (
            <>
              <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              <Panel defaultSize={25} minSize={15} maxSize={60}>
                <ActivityHubWidget />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {isMobile && currentPage && <BottomActionBar />}
    </main>
  );
}
