// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Spotlight/index.tsx
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
  IconSparkles,
} from "@tabler/icons-react";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";

export type HomepageItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  action: { type: string; payload: any };
};

interface SpotlightProps {
  onItemClick: (item: HomepageItem) => void;
}

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
    case "IconSparkles":
      return <IconSparkles size={18} />;
    default:
      return <IconFileCode size={18} />;
  }
});
ItemIcon.displayName = "ItemIcon";

export default function Spotlight({ onItemClick }: SpotlightProps) {
  const { homepageData, isHomepageLoading, setIsHomepageLoading } =
    useSessionStore();
  const { sendJsonMessage, readyState } = useWebSocket();
  const [activeTab, setActiveTab] = useState("Continue");

  // --- REFACTORED DATA FETCHING LOGIC ---
  useEffect(() => {
    // This condition is now declarative and robust:
    // "If we are connected, and we don't have any data yet, then we are in a loading state and should fetch."
    if (readyState === ReadyState.OPEN && !homepageData) {
      setIsHomepageLoading(true);
      sendJsonMessage({
        type: "HOMEPAGE.GET_DATA",
        command_id: `get-home-data-${nanoid()}`,
        payload: {},
      });
    }
  }, [readyState, homepageData, sendJsonMessage, setIsHomepageLoading]);

  // Render logic remains the same
  const renderItems = (items: HomepageItem[] | undefined) => {
    if (!items || items.length === 0) {
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

  const getVisibleData = () => {
    if (!homepageData) return [];
    switch (activeTab) {
      case "Pinned":
        return homepageData.pinned_items;
      case "Discover":
        return homepageData.discover_items;
      case "Continue":
      default:
        return homepageData.recent_files;
    }
  };

  return (
    <Box className="w-full max-w-2xl">
      <TextInput
        placeholder="What do you want to do or find?"
        size="lg"
        leftSection={<IconSearch size={20} />}
        rightSection={<Kbd>Ctrl+K</Kbd>}
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
          disabled
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

      {isHomepageLoading ? (
        <Center h={100}>
          <Loader />
        </Center>
      ) : (
        <Box mi-h={100}>{renderItems(getVisibleData())}</Box>
      )}
    </Box>
  );
}
