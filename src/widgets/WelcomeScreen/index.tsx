"use client";

import { Box, Title, Text, Button, Paper, Group } from "@mantine/core";
import { IconServer, IconPlus } from "@tabler/icons-react";
import { useConnectionStore } from "@/shared/store/useConnectionStore";

// Define the props the component will accept from its parent (page.tsx)
interface WelcomeScreenProps {
  onConnectClick: () => void;
}

export default function WelcomeScreen({ onConnectClick }: WelcomeScreenProps) {
  // Get the action to switch to the default local profile
  const setActiveProfileId = useConnectionStore(
    (state) => state.setActiveProfileId
  );

  // When the user clicks the "Local Server" option,
  // we set the active profile to 'local' and trigger a page reload.
  const handleSelectLocal = () => {
    setActiveProfileId("local");
  };

  return (
    <Box className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Box className="text-center">
        {/* Placeholder for a logo */}
        {/* <IconBrandYourLogo size={48} className="mx-auto mb-4 text-blue-500" /> */}

        <Title order={1} className="text-3xl font-bold">
          Welcome to Syncropel Studio
        </Title>
        <Text c="dimmed" mt="sm" className="max-w-md mx-auto">
          Your intelligent workspace for data and operations. To get started,
          connect to a Syncropel Server.
        </Text>
      </Box>

      <Group mt="xl" grow className="w-full max-w-lg">
        {/* --- Option 1: Connect to Local Server --- */}
        <Paper
          withBorder
          radius="md"
          p="xl"
          className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Group>
            <IconServer size={24} className="text-blue-500" />
            <Title order={4}>Local Server</Title>
          </Group>
          <Text size="sm" c="dimmed" mt="xs" mb="lg">
            Connect to the default server running on your local machine. Ideal
            for single-user development and testing.
          </Text>
          <Button onClick={handleSelectLocal} fullWidth>
            Connect to Local
          </Button>
        </Paper>

        {/* --- Option 2: Add a Remote Server --- */}
        <Paper
          withBorder
          radius="md"
          p="xl"
          className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Group>
            <IconPlus size={24} className="text-gray-500" />
            <Title order={4}>Remote Server</Title>
          </Group>
          <Text size="sm" c="dimmed" mt="xs" mb="lg">
            Connect to a shared team hub or a cloud workspace to collaborate and
            access remote resources.
          </Text>
          <Button onClick={onConnectClick} variant="default" fullWidth>
            Add a Remote Server
          </Button>
        </Paper>
      </Group>
    </Box>
  );
}
