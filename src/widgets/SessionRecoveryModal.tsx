// /home/dpwanjala/repositories/syncropel/studio/src/widgets/SessionRecoveryModal.tsx
"use client";

import { Modal, Text, Button, Group } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface SessionRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDiscard: () => void;
  pageName: string;
}

/**
 * A modal that prompts the user to restore their session if unsaved
 * changes are detected on application load.
 */
export default function SessionRecoveryModal({
  isOpen,
  onClose,
  onRestore,
  onDiscard,
  pageName,
}: SessionRecoveryModalProps) {
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} className="text-yellow-500" />
          <Text fw={500}>Unsaved Changes Detected</Text>
        </Group>
      }
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Text size="sm" mb="md">
        It looks like you have unsaved changes for the notebook{" "}
        <Text span fw={700}>
          "{pageName}"
        </Text>
        .
      </Text>
      <Text size="sm">
        Would you like to restore your session or discard the changes?
      </Text>

      <Group justify="flex-end" mt="xl">
        <Button variant="outline" color="red" onClick={onDiscard}>
          Discard Changes
        </Button>
        <Button onClick={onRestore}>Restore Session</Button>
      </Group>
    </Modal>
  );
}
