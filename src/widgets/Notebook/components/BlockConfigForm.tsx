// /home/dpwanjala/repositories/syncropel/studio/src/widgets/Notebook/components/BlockConfigForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button, Group, Stack, TextInput, Select } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { Block } from "@/shared/types/notebook";

interface BlockConfigFormProps {
  blockId: string;
}

const VALID_ENGINES = [
  "markdown",
  "sql",
  "python",
  "transform",
  "run",
  "artifact",
  "publish",
  "ui-component",
  "cx-action",
  "shell",
  "agent",
];

export default function BlockConfigForm({ blockId }: BlockConfigFormProps) {
  const { currentPage, updateBlockMetadata } = useSessionStore();
  const { closeModal } = useUIStateStore();

  const block = currentPage?.blocks.find((b) => b.id === blockId);

  const [id, setId] = useState(block?.id || "");
  const [name, setName] = useState(block?.name || "");
  const [engine, setEngine] = useState(block?.engine || "");
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    if (block) {
      setId(block.id);
      setName(block.name || "");
      setEngine(block.engine || "");
    }
  }, [block]);

  if (!block) {
    return <div>Error: Block not found.</div>;
  }

  const validateAndSetId = (newId: string) => {
    setId(newId);
    const isValid = /^[a-zA-Z0-9_.-]+$/.test(newId);
    if (!newId.trim()) {
      setIdError("Block ID cannot be empty.");
    } else if (!isValid) {
      setIdError(
        "ID can only contain letters, numbers, underscores, hyphens, and periods."
      );
    } else if (
      currentPage?.blocks.some((b) => b.id === newId && b.id !== blockId)
    ) {
      setIdError("This ID is already used by another block on this page.");
    } else {
      setIdError(null);
    }
  };

  const handleSave = () => {
    if (idError || !id.trim()) return;

    updateBlockMetadata(blockId, {
      id,
      name,
      engine,
    });
    closeModal();
  };

  return (
    <Stack>
      <TextInput
        label="Block ID"
        description="A unique identifier for this block within the page."
        value={id}
        onChange={(e) => validateAndSetId(e.currentTarget.value)}
        error={idError}
        required
      />
      <TextInput
        label="Block Name (Optional)"
        description="A human-friendly name for this block."
        placeholder="e.g., Fetch User Data"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <Select
        label="Engine"
        description="The execution engine for this block."
        data={VALID_ENGINES}
        value={engine}
        onChange={(value) => setEngine(value || "")}
        allowDeselect={false}
        required
      />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={closeModal}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!!idError || !id.trim()}>
          Save Changes
        </Button>
      </Group>
    </Stack>
  );
}
