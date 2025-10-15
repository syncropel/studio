"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader, Center, Modal, Box, Drawer, Text } from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ReadyState } from "react-use-websocket";

import { useIsClient } from "@/shared/hooks/useIsClient";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
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
  const searchParams = useSearchParams(); // Now safe to use in a Client Component
  const isClient = useIsClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialLoadHandled = useRef(false);

  // --- GLOBAL STATE & ACTIONS ---
  const { currentPage, ...sessionActions } = useSessionStore();
  const { getActiveProfile } = useConnectionStore();
  const { sendJsonMessage, readyState } = useWebSocket();
  const [isConnectionManagerOpen, setConnectionManagerOpen] = useState(false);

  const {
    isNavigatorVisible,
    isInspectorVisible,
    isTerminalVisible,
    isSpotlightVisible,
    isNavDrawerOpen,
    isInspectorDrawerOpen,
    openSpotlight,
    closeSpotlight,
    toggleNavDrawer,
    toggleInspectorDrawer,
  } = sessionActions;

  const activeProfile = getActiveProfile();

  useHotkeys([
    [
      "mod+K",
      (e) => {
        e.preventDefault();
        openSpotlight();
      },
    ],
  ]);

  // --- SIDE EFFECTS for URL Syncing ---
  useEffect(() => {
    if (
      isClient &&
      readyState === ReadyState.OPEN &&
      !initialLoadHandled.current
    ) {
      const pageNameFromUrl = searchParams.get("page");
      if (pageNameFromUrl) {
        sendJsonMessage({
          type: "LOAD_PAGE",
          command_id: `load-page-from-url-${nanoid()}`,
          payload: { page_name: pageNameFromUrl },
        });
      }
      initialLoadHandled.current = true;
    }
  }, [isClient, readyState, searchParams, sendJsonMessage]);

  useEffect(() => {
    if (!isClient) return;
    const pageInUrl = searchParams.get("page");
    if (currentPage && currentPage.id !== pageInUrl) {
      router.push(`/?page=${currentPage.id}`, { scroll: false });
    } else if (!currentPage && pageInUrl) {
      router.push(`/`, { scroll: false });
    }
  }, [currentPage, searchParams, router, isClient]);

  const handleModalItemClick = (item: HomepageItem) => {
    closeSpotlight();
    if (item.action.type === "open_page") {
      sendJsonMessage({
        type: "LOAD_PAGE",
        command_id: `load-page-${nanoid()}`,
        payload: { page_name: item.action.payload.path },
      });
    }
  };

  if (!isClient) {
    // This will be shown briefly by the parent Suspense, but is good practice as a fallback.
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  // --- Main Content Render Logic ---
  const renderMainContent = () => {
    // On first load, activeProfile will be null, and this condition will be true.
    if (!activeProfile) {
      return (
        <WelcomeScreen onConnectClick={() => setConnectionManagerOpen(true)} />
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

  return (
    <main className="relative h-screen w-screen flex flex-col bg-white dark:bg-gray-950 text-black dark:text-white overflow-hidden">
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
          <Spotlight onItemClick={handleModalItemClick} />
        </Box>
      </Modal>

      <Modal
        opened={isConnectionManagerOpen}
        onClose={() => setConnectionManagerOpen(false)}
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
              onConnectionClick={() => setConnectionManagerOpen(true)}
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
                      onConnectionClick={() => setConnectionManagerOpen(true)}
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
