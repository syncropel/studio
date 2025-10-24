"use client";

import { Title, Text, Stack } from "@mantine/core";

export default function HistoryView() {
  return (
    <Stack p="xs">
      <Title order={5}>History</Title>
      <Text c="dimmed" size="sm">
        A quick overview of recent runs and activity. (Coming Soon)
      </Text>
    </Stack>
  );
}

