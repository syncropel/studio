"use client";
import { Paper, Text, Group } from "@mantine/core";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

interface CardProps {
  title: string;
  metric: string;
  change?: string;
  change_direction?: "up" | "down";
}

export default function CardRenderer({
  title,
  metric,
  change,
  change_direction,
}: CardProps) {
  const isUp = change_direction === "up";
  return (
    <Paper withBorder p="md" radius="md">
      <Text c="dimmed" size="sm">
        {title}
      </Text>
      <Text size="2rem" fw={700} my={4}>
        {metric}
      </Text>
      {change && (
        <Group gap="xs" c={isUp ? "teal" : "red"}>
          {isUp ? (
            <IconArrowUpRight size={16} />
          ) : (
            <IconArrowDownRight size={16} />
          )}
          <Text size="sm">{change}</Text>
        </Group>
      )}
    </Paper>
  );
}
