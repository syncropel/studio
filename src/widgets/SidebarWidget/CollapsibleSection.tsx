"use client";
import React, { useState } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isExpanded?: boolean;
}

export default function CollapsibleSection({
  title,
  icon: Icon,
  children,
  isExpanded: defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Box>
      <UnstyledButton
        onClick={() => setIsExpanded((e) => !e)}
        className="w-full p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
      >
        <Group justify="space-between">
          <Group gap="xs">
            <Icon size={16} />
            <Text size="sm" fw={500}>
              {title}
            </Text>
          </Group>
          <IconChevronRight
            size={16}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Group>
      </UnstyledButton>
      {isExpanded && <Box pl="lg">{children}</Box>}
    </Box>
  );
}
