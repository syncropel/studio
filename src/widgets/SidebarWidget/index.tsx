"use client";

import React, { useEffect } from "react";
import { Box, ScrollArea, Title } from "@mantine/core";
import {
  IconBox,
  IconFileCode,
  IconPlug,
  IconVariable,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import CollapsibleSection from "./CollapsibleSection";
import NavigationItem from "./NavigationItem";
import { CommandResultPayload } from "@/shared/types/server"; // Import the specific payload type

export default function SidebarWidget() {
  const {
    connections,
    variables,
    flows,
    queries,
    setFlows,
    setQueries,
    setCurrentPage,
  } = useSessionStore();
  const { sendJsonMessage, readyState } = useWebSocket();
  const lastJsonMessage = useSessionStore((state) => state.lastJsonMessage);

  useEffect(() => {
    if (readyState === 1 && flows.length === 0 && queries.length === 0) {
      sendJsonMessage({
        type: "EXECUTE_COMMAND",
        command_id: `sidebar-init-flows-${nanoid()}`,
        payload: { command_text: "flow list" },
      });
      sendJsonMessage({
        type: "EXECUTE_COMMAND",
        command_id: `sidebar-init-queries-${nanoid()}`,
        payload: { command_text: "query list" },
      });
    }
  }, [readyState, sendJsonMessage, flows.length, queries.length]);

  useEffect(() => {
    if (!lastJsonMessage) return;

    const { type, command_id, payload } = lastJsonMessage;
    if (type === "PAGE_LOADED") {
      setCurrentPage(payload as any); // Set the current page in our global store
      return;
    }
    if (
      lastJsonMessage?.type === "RESULT_SUCCESS" &&
      lastJsonMessage.command_id.startsWith("sidebar-init-")
    ) {
      // --- THIS IS THE TYPE GUARD FIX ---
      // 1. Check if the payload is a CommandResultPayload by checking for the 'result' key.
      if (
        lastJsonMessage.payload &&
        typeof lastJsonMessage.payload === "object" &&
        "result" in lastJsonMessage.payload
      ) {
        // 2. TypeScript now knows that payload is of type CommandResultPayload inside this block.
        const payload = lastJsonMessage.payload as CommandResultPayload;
        const assetList = payload.result;

        if (Array.isArray(assetList)) {
          if (lastJsonMessage.command_id.includes("-flows-")) {
            setFlows(assetList as any); // Cast to any to match store, can be refined later
          } else if (lastJsonMessage.command_id.includes("-queries-")) {
            setQueries(assetList as any); // Cast to any to match store, can be refined later
          }
        }
      }
      // --- END TYPE GUARD FIX ---
    }
  }, [lastJsonMessage, setFlows, setQueries, setCurrentPage]);

  const handleFlowClick = (flowName: string) => {
    // This 'flowName' is the full namespaced ID
    console.log("Requesting to load page:", flowName);
    sendJsonMessage({
      type: "LOAD_PAGE",
      command_id: `load-page-${nanoid()}`,
      payload: {
        // We are already sending the full namespaced ID here, which is correct.
        // The problem is that the 'ContextualPage' model doesn't store it.
        page_name: flowName,
      },
    });
  };

  return (
    <aside className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <Box className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Title order={4}>Workspace</Title>
      </Box>

      <ScrollArea className="flex-grow p-2">
        <CollapsibleSection
          title="Active Connections"
          icon={IconPlug}
          isExpanded={true}
        >
          {connections.length > 0 ? (
            connections.map((conn) => (
              <NavigationItem
                key={conn.alias}
                title={conn.alias}
                subtitle={conn.source}
                icon={IconPlug}
              />
            ))
          ) : (
            <NavigationItem title="No active connections" isSubtle />
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Session Variables"
          icon={IconVariable}
          isExpanded={true}
        >
          {variables.length > 0 ? (
            variables.map((varItem) => (
              <NavigationItem
                key={varItem.name}
                title={varItem.name}
                subtitle={varItem.type}
                icon={IconVariable}
              />
            ))
          ) : (
            <NavigationItem title="No session variables" isSubtle />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Flows" icon={IconFileCode} isExpanded={true}>
          {flows.length > 0 ? (
            flows.map((flow) => (
              // --- UPDATE NavigationItem to be clickable ---
              <div key={flow.Name} onClick={() => handleFlowClick(flow.Name)}>
                <NavigationItem title={flow.Name} icon={IconFileCode} />
              </div>
            ))
          ) : (
            <NavigationItem title="No flows found" isSubtle />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Queries" icon={IconBox} isExpanded={true}>
          {queries.length > 0 ? (
            queries.map((query) => (
              <NavigationItem
                key={query.Name}
                title={query.Name}
                icon={IconBox}
              />
            ))
          ) : (
            <NavigationItem title="No queries found" isSubtle />
          )}
        </CollapsibleSection>
      </ScrollArea>
    </aside>
  );
}
