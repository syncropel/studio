// /home/dpwanjala/repositories/syncropel/studio/src/widgets/ConnectionManager/index.tsx
"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Tooltip,
  Paper,
  UnstyledButton,
} from "@mantine/core";
import { useConnectionStore } from "@/shared/store/useConnectionStore";
import { IconCheck, IconTrash, IconPlus, IconPlugX } from "@tabler/icons-react";
import { useUIStateStore } from "@/shared/store/useUIStateStore";

export default function ConnectionManager() {
  const {
    profiles,
    activeProfileId,
    addProfile,
    removeProfile,
    setActiveProfileId,
    disconnect,
  } = useConnectionStore();
  const { toggleConnectionManager } = useUIStateStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleSave = () => {
    if (newName.trim() && newUrl.trim().match(/^(ws|wss):\/\//)) {
      addProfile({ name: newName, url: newUrl });
      toggleConnectionManager(false);
    } else {
      alert(
        "Please provide a valid name and a URL starting with ws:// or wss://"
      );
    }
  };

  if (isAdding) {
    return (
      <Stack>
        <TextInput
          label="Friendly Name"
          placeholder="Staging Environment"
          value={newName}
          onChange={(e) => setNewName(e.currentTarget.value)}
          required
          autoFocus
        />
        <TextInput
          label="Server URL"
          placeholder="wss://cx.staging.mycompany.com"
          value={newUrl}
          onChange={(e) => setNewUrl(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save & Connect</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {profiles.map((profile) => {
        const isActive = activeProfileId === profile.id;
        return (
          <Paper
            key={profile.id}
            p="sm"
            withBorder
            radius="md"
            className="w-full"
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                {isActive ? (
                  <IconCheck
                    size={20}
                    className="text-green-500 flex-shrink-0"
                  />
                ) : (
                  <Box w={20} className="flex-shrink-0" />
                )}
                <Box style={{ minWidth: 0 }}>
                  <Text fw={500} truncate>
                    {profile.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {isActive
                      ? "Connected"
                      : profile.description || profile.url}
                  </Text>
                </Box>
              </Group>
              <Group gap="xs" wrap="nowrap" className="flex-shrink-0">
                {isActive ? (
                  <Button
                    leftSection={<IconPlugX size={14} />}
                    variant="default"
                    size="xs"
                    onClick={() => {
                      disconnect();
                      toggleConnectionManager(false);
                    }}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => {
                      setActiveProfileId(profile.id);
                      toggleConnectionManager(false);
                    }}
                  >
                    Connect
                  </Button>
                )}

                {!profile.isDefault && (
                  <Tooltip label="Remove Server">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProfile(profile.id);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </Paper>
        );
      })}

      <UnstyledButton
        onClick={() => setIsAdding(true)}
        className="w-full p-3 mt-xs rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Group justify="center" gap="xs">
          <IconPlus size={16} />
          <Text fw={500} size="sm">
            Add Server...
          </Text>
        </Group>
      </UnstyledButton>
    </Stack>
  );
}
