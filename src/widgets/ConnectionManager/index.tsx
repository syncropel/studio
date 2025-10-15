"use client";

import { useState } from "react";
import {
  Box,
  Title,
  Button,
  Stack,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  useConnectionStore,
  ConnectionProfile,
} from "@/shared/store/useConnectionStore";
import { IconCheck, IconTrash, IconPlus, IconPlugX } from "@tabler/icons-react";

export default function ConnectionManager() {
  const {
    profiles,
    activeProfileId,
    addProfile,
    removeProfile,
    setActiveProfileId,
    disconnect,
  } = useConnectionStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleSave = () => {
    if (newName.trim() && newUrl.trim().match(/^(ws|wss):\/\//)) {
      const newProfile: ConnectionProfile = {
        name: newName,
        url: newUrl,
        id: `remote-${Date.now()}`,
      };
      addProfile({ name: newName, url: newUrl });
      setIsAdding(false);
      setNewName("");
      setNewUrl("");
      // Automatically connect to the new profile
      setActiveProfileId(newProfile.id);
    } else {
      alert(
        "Please provide a valid name and URL (starting with ws:// or wss://)."
      );
    }
  };

  if (isAdding) {
    return (
      <Box>
        <Title order={3} mb="lg">
          Add New Server
        </Title>
        <Stack>
          <TextInput
            label="Friendly Name"
            placeholder="Staging Environment"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <TextInput
            label="Server URL"
            placeholder="wss://cx.staging.mycompany.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save & Connect</Button>
          </Group>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Title order={3} mb="lg">
        Connect to a Syncropel Server
      </Title>
      <Stack gap="xs">
        <Button
          leftSection={<IconPlus size={16} />}
          variant="default"
          onClick={() => setIsAdding(true)}
        >
          Add New Remote Server...
        </Button>
        <Text size="sm" c="dimmed" mt="md" mb="xs">
          Available Servers
        </Text>
        {profiles.map((profile) => {
          const isActive = activeProfileId === profile.id;
          return (
            <Box
              key={profile.id}
              className="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
            >
              <Group justify="space-between">
                <Group gap="sm">
                  {isActive ? (
                    <IconCheck size={20} className="text-green-500" />
                  ) : (
                    <Box w={20} />
                  )}
                  <Box>
                    <Text fw={500}>{profile.name}</Text>
                    <Text size="xs" c="dimmed">
                      {profile.isDefault ? "Local bundled server" : profile.url}
                    </Text>
                  </Box>
                </Group>
                <Group>
                  {isActive ? (
                    <Button
                      leftSection={<IconPlugX size={14} />}
                      variant="default"
                      size="xs"
                      onClick={disconnect}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => setActiveProfileId(profile.id)}
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
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
