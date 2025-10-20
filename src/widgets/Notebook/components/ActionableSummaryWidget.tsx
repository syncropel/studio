// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/components/ActionableSummaryWidget.tsx
"use client";

import React from "react";
import { Group, Button, Badge } from "@mantine/core";
import { IconSettings, IconCode } from "@tabler/icons-react";

interface ActionableSummaryWidgetProps {
  title: string;
  subtitle?: string;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onRawAction: () => void;
  isActive?: boolean; // <-- NEW PROP
}

export default function ActionableSummaryWidget({
  title,
  subtitle,
  onPrimaryAction,
  primaryActionLabel,
  onRawAction,
  isActive = false, // <-- Default to false
}: ActionableSummaryWidgetProps) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      className="w-full"
      style={{ padding: "0 8px", height: "100%" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Left side: Title and Subtitle Pills */}
      <Group gap="xs" wrap="nowrap">
        <Badge
          color="gray"
          variant="light"
          size="sm"
          style={{
            maxWidth: "250px",
            textOverflow: "ellipsis",
            overflow: "hidden",
            height: "20px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {title}
        </Badge>
        {subtitle && (
          <Badge
            color="blue"
            variant="outline"
            size="sm"
            style={{ height: "20px", display: "flex", alignItems: "center" }}
          >
            {subtitle}
          </Badge>
        )}
      </Group>

      {/* Right side: Action Buttons */}
      <Group gap="xs" wrap="nowrap">
        <Button
          // --- DEFINITIVE FIX FOR HIGHLIGHTING ---
          variant={isActive ? "light" : "default"} // <-- Conditionally change variant
          size="xs"
          style={{ height: "20px", padding: "0 8px", fontSize: "11px" }}
          leftSection={<IconSettings size={12} />}
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          style={{ height: "20px", padding: "0 8px", fontSize: "11px" }}
          leftSection={<IconCode size={12} />}
          onClick={onRawAction}
        >
          Raw
        </Button>
      </Group>
    </Group>
  );
}
