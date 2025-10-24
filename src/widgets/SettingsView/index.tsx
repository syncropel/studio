"use client";

import { Title, Text, Stack } from "@mantine/core";

export default function SettingsView() {
  return (
    <Stack p="xs">
      <Title order={5}>Settings</Title>
      <Text c="dimmed" size="sm">
        Shortcuts to manage your workspace and connections. (Coming Soon)
      </Text>
    </Stack>
  );
}

