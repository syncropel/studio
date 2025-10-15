"use client";

import {
  Box,
  Title,
  Text,
  Button,
  Paper,
  Stack,
  Group,
  UnstyledButton,
} from "@mantine/core";
import { IconPlus, IconServer } from "@tabler/icons-react";
import { useConnectionStore } from "@/shared/store/useConnectionStore";

interface WelcomeScreenProps {
  onConnectClick: () => void; // Prop to open the "Add New" modal
}

export default function WelcomeScreen({ onConnectClick }: WelcomeScreenProps) {
  // --- START: DEFINITIVE FIX ---
  // Read all profiles and the action to set the active one from the store.
  const { profiles, setActiveProfileId } = useConnectionStore();
  // --- END: DEFINITIVE FIX ---

  return (
    <Box className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Box className="text-center mb-xl">
        <Title order={1} className="text-3xl font-bold">
          Welcome to Syncropel Studio
        </Title>
        <Text c="dimmed" mt="sm" className="max-w-xl mx-auto">
          Your intelligent workspace for data and operations. To get started,
          select a server from your list below or add a new remote connection.
        </Text>
      </Box>

      {/* --- START: DYNAMIC SERVER LIST --- */}
      <Paper withBorder radius="md" p="lg" className="w-full max-w-2xl">
        <Stack gap="md">
          <Text fw={500}>Available Servers</Text>
          {profiles.map((profile) => (
            <UnstyledButton
              key={profile.id}
              onClick={() => setActiveProfileId(profile.id)}
              className="w-full p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <IconServer size={20} className="text-gray-500" />
                  <Box>
                    <Text fw={500}>{profile.name}</Text>
                    <Text size="xs" c="dimmed">
                      {profile.isDefault ? "Local bundled server" : profile.url}
                    </Text>
                  </Box>
                </Group>
                <Button variant="light" size="xs">
                  Connect
                </Button>
              </Group>
            </UnstyledButton>
          ))}

          {/* "Add New" button, which opens the modal via the prop */}
          <UnstyledButton
            onClick={onConnectClick}
            className="w-full p-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Group justify="center" gap="xs">
              <IconPlus size={16} />
              <Text fw={500} size="sm">
                Add New Remote Server
              </Text>
            </Group>
          </UnstyledButton>
        </Stack>
      </Paper>
      {/* --- END: DYNAMIC SERVER LIST --- */}
    </Box>
  );
}
