"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Loader,
  TextInput,
  Group,
  Button,
  UnstyledButton,
  Center,
  Kbd,
} from "@mantine/core";
import {
  IconSearch,
  IconFileCode,
  IconPlayerPlay,
  IconDatabase,
  IconBulb,
  IconPlus,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";

// --- TYPE DEFINITIONS ---
// Exporting this type allows parent components to be strongly-typed.
export type HomepageItem = {
  id: string;
  type:
    | "page"
    | "query"
    | "flow"
    | "connection"
    | "command"
    | "external_link"
    | "tip";
  title: string;
  description: string;
  timestamp?: string;
  icon: string;
  action: {
    type:
      | "open_page"
      | "open_connection_editor"
      | "run_command"
      | "open_external_url";
    payload: any;
  };
};

// Define the props that this component accepts from its parent.
interface SpotlightProps {
  onItemClick: (item: HomepageItem) => void;
}

// --- HELPER COMPONENTS ---

// A small, memoized component to prevent re-rendering all icons on every state change.
const ItemIcon = React.memo(({ iconName }: { iconName: string }) => {
  switch (iconName) {
    case "IconFileCode":
      return <IconFileCode size={18} />;
    case "IconPlayerPlay":
      return <IconPlayerPlay size={18} />;
    case "IconDatabase":
      return <IconDatabase size={18} />;
    case "IconBulb":
      return <IconBulb size={18} />;
    case "IconPlus":
      return <IconPlus size={18} />;
    default:
      return <IconFileCode size={18} />;
  }
});
ItemIcon.displayName = "ItemIcon";

// --- MAIN COMPONENT ---

export default function Spotlight({ onItemClick }: SpotlightProps) {
  // Get state and actions from our hooks.
  const { lastJsonMessage } = useSessionStore();
  const { sendJsonMessage } = useWebSocket();

  // Local state for the component's UI.
  const [activeTab, setActiveTab] = useState("Continue");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    recent_files: HomepageItem[];
    pinned_items: HomepageItem[];
    discover_items: HomepageItem[];
  }>({ recent_files: [], pinned_items: [], discover_items: [] });

  // --- DATA FETCHING ---
  // Fetch data on component mount.
  useEffect(() => {
    setIsLoading(true);
    sendJsonMessage({
      type: "GET_HOMEPAGE_DATA",
      command_id: `get-home-data-${nanoid()}`,
      payload: {},
    });
  }, [sendJsonMessage]);

  // Handle incoming data from the WebSocket and update local state.
  useEffect(() => {
    if (lastJsonMessage?.type === "HOMEPAGE_DATA_RESULT") {
      setData(lastJsonMessage.payload as any);
      setIsLoading(false);
    }
  }, [lastJsonMessage]);

  // --- RENDER LOGIC ---

  // Renders a single list item.
  const renderItems = (items: HomepageItem[]) => {
    if (items.length === 0) {
      return (
        <Text c="dimmed" size="sm" ta="center" mt="xl">
          Nothing to show here.
        </Text>
      );
    }
    return items.map((item) => (
      <UnstyledButton
        key={item.id}
        onClick={() => onItemClick(item)}
        className="w-full text-left p-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Group>
          <Box className="text-gray-500 dark:text-gray-400">
            <ItemIcon iconName={item.icon} />
          </Box>
          <Box>
            <Text size="sm" fw={500}>
              {item.title}
            </Text>
            <Text size="xs" c="dimmed">
              {item.description}
            </Text>
          </Box>
        </Group>
      </UnstyledButton>
    ));
  };

  // Determines which list of data to show based on the active tab.
  const getVisibleData = () => {
    switch (activeTab) {
      case "Pinned":
        return data.pinned_items;
      case "Discover":
        return data.discover_items;
      // TODO: Add a "Create New" data source
      // case 'Create New': return CREATE_NEW_ITEMS;
      case "Continue":
      default:
        return data.recent_files;
    }
  };

  return (
    <Box className="w-full max-w-2xl">
      <TextInput
        placeholder="What do you want to do or find?"
        size="lg"
        leftSection={<IconSearch size={20} />}
        mb="xl"
        autoFocus
        className="w-full"
      />

      <Group mb="md" gap="xs">
        <Button
          size="xs"
          variant={activeTab === "Continue" ? "light" : "subtle"}
          onClick={() => setActiveTab("Continue")}
        >
          Continue
        </Button>
        <Button
          size="xs"
          variant={activeTab === "Pinned" ? "light" : "subtle"}
          onClick={() => setActiveTab("Pinned")}
        >
          Pinned
        </Button>
        <Button
          size="xs"
          variant={activeTab === "Create New" ? "light" : "subtle"}
          onClick={() => setActiveTab("Create New")}
        >
          Create New
        </Button>
        <Button
          size="xs"
          variant={activeTab === "Discover" ? "light" : "subtle"}
          onClick={() => setActiveTab("Discover")}
        >
          Discover
        </Button>
      </Group>

      {isLoading ? (
        <Center h={100}>
          <Loader />
        </Center>
      ) : (
        <Box mi-h={100}>{renderItems(getVisibleData())}</Box>
      )}
    </Box>
  );
}
