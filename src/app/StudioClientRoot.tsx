// /home/dpwanjala/repositories/syncropel/studio/src/app/StudioClientRoot.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader,
  Center,
  Modal,
  Box,
  Drawer,
  Text,
  Stack,
  Title,
  Button,
} from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ReadyState } from "react-use-websocket";
import { nanoid } from "nanoid";

import { useIsClient } from "@/shared/hooks/useIsClient";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useSettingsStore } from "@/shared/store/useSettingsStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import type { HomepageItem } from "@/widgets/Spotlight";

import TopBar from "@/widgets/TopBar";
import SidebarWidget from "@/widgets/SidebarWidget";
import Notebook from "@/widgets/Notebook";
import InspectorWidget from "@/widgets/InspectorWidget";
import ActivityHubWidget from "@/widgets/ActivityHubWidget";
import Spotlight from "@/widgets/Spotlight";
import BottomActionBar from "@/widgets/BottomActionBar";
import ConnectionManager from "@/widgets/ConnectionManager";
import SessionRecoveryModal from "@/widgets/SessionRecoveryModal";
import ConnectionStatusIndicator from "@/widgets/ConnectionStatusIndicator";

export default function StudioClientRoot() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialLoadHandled = useRef(false);

  const [showRecovery, setShowRecovery] = useState(false);

  const { currentPage, reset: resetSession } = useSessionStore();
  const { getActiveProfile } = useConnectionStore();
  const { isInspectorVisible, isTerminalVisible } = useSettingsStore();
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
    modalState,
    closeModal,
  } = useUIStateStore();

  const { sendJsonMessage, readyState, isReconnecting } = useWebSocket();
  const activeProfile = getActiveProfile();
  const isConnected = readyState === ReadyState.OPEN;

  useEffect(() => {
    if (isClient) {
      const persistedState = useSessionStore.getState();
      if (persistedState.isDirty && persistedState.currentPage) {
        setShowRecovery(true);
      }
    }
  }, [isClient]);

  const handleRestore = () => setShowRecovery(false);
  const handleDiscard = () => {
    resetSession();
    setShowRecovery(false);
    window.location.reload();
  };

  useHotkeys([
    [
      "mod+K",
      (e) => {
        e.preventDefault();
        openSpotlight();
      },
    ],
  ]);

  useEffect(() => {
    if (isClient && isConnected && !initialLoadHandled.current) {
      if (showRecovery) return;
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
  }, [isClient, isConnected, searchParams, sendJsonMessage, showRecovery]);

  useEffect(() => {
    if (!isClient) return;
    const pageInUrl = searchParams.get("page");
    const pageIdInState = currentPage?.id;
    if (pageIdInState && pageIdInState !== pageInUrl) {
      router.push(`/?page=${pageIdInState}`, { scroll: false });
    } else if (!pageIdInState && pageInUrl) {
      router.push(`/`, { scroll: false });
    }
  }, [currentPage, searchParams, router, isClient]);

  const handleSpotlightItemClick = (item: HomepageItem) => {
    closeSpotlight();
    if (item.action.type === "open_page") {
      sendJsonMessage({
        type: "PAGE.LOAD",
        command_id: `load-page-${nanoid()}`,
        payload: { page_id: item.action.payload.page_id },
      });
    }
  };

  const renderMainContent = () => {
    // If no profile is active, we are in the welcome state.
    if (!activeProfile) {
      return (
        <Center h="100%" className="p-4">
          <Stack align="center" gap="xl">
            <Stack align="center" gap="xs">
              <Title order={2}>Welcome to Syncropel Studio</Title>
              <Text c="dimmed">Connect to a server to get started.</Text>
            </Stack>
            <Button size="md" onClick={() => toggleConnectionManager(true)}>
              Manage Connections
            </Button>
          </Stack>
        </Center>
      );
    }

    // If a profile is active, we use the readyState to determine the UI.
    switch (readyState) {
      case ReadyState.CONNECTING:
        return (
          <Center h="100%">
            <Stack align="center" gap="lg">
              <Loader />
              <ConnectionStatusIndicator
                readyState={readyState}
                isReconnecting={isReconnecting}
                activeProfileName={activeProfile.name}
              />
              {isReconnecting && (
                <Button
                  variant="default"
                  onClick={() => toggleConnectionManager(true)}
                >
                  Manage Connections
                </Button>
              )}
            </Stack>
          </Center>
        );
      case ReadyState.OPEN:
        return <Notebook />;
      case ReadyState.CLOSED:
        return (
          <Center h="100%" className="p-4">
            <Stack align="center" gap="lg">
              <Title order={2} c="red">
                ❌ Connection Failed
              </Title>
              <Text c="dimmed" ta="center">
                Could not connect to{" "}
                <Text span fw={700}>
                  '{activeProfile.name}'
                </Text>
                . <br />
                The server may be offline or the URL may be incorrect.
              </Text>
              <Button
                variant="default"
                size="md"
                onClick={() => toggleConnectionManager(true)}
              >
                Review Connection Settings
              </Button>
            </Stack>
          </Center>
        );
      default:
        // Fallback for CLOSING, UNINSTANTIATED states
        return (
          <Center h="100%">
            <Loader />
          </Center>
        );
    }
  };

  if (!isClient) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <main className="relative h-screen w-screen flex flex-col bg-white dark:bg-gray-950 text-black dark:text-white overflow-hidden">
      <SessionRecoveryModal
        isOpen={showRecovery}
        onClose={handleDiscard}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
        pageName={
          useSessionStore.getState().currentPage?.name ||
          "your previous session"
        }
      />
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
      <Modal
        opened={!!modalState}
        onClose={closeModal}
        title={modalState?.title}
        size={modalState?.size || "lg"}
        centered
      >
        {modalState?.content}
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
              {!isMobile && isConnected && (
                <>
                  <Panel defaultSize={20} minSize={15} maxSize={40}>
                    <SidebarWidget
                      onConnectionClick={() => toggleConnectionManager(true)}
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
