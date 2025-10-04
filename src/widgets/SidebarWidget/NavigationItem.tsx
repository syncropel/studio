"use client";
import React from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

interface NavigationItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  isSubtle?: boolean;
}

export default function NavigationItem({
  title,
  subtitle,
  icon: Icon,
  isSubtle = false,
}: NavigationItemProps) {
  return (
    <UnstyledButton className="w-full p-2 pl-4 text-left hover:bg-gray-200 dark:hover:bg-gray-800 rounded">
      <Group gap="xs">
        {Icon && <Icon size={14} className={isSubtle ? "text-gray-500" : ""} />}
        <div className="flex-1">
          <Text size="xs" c={isSubtle ? "dimmed" : undefined}>
            {title}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </div>
      </Group>
    </UnstyledButton>
  );
}
