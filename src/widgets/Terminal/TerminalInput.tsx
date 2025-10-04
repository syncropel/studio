"use client";

import React, { useState, useCallback } from "react";
import { Box, ActionIcon } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";

interface TerminalInputProps {
  onCommandSubmit: (commandText: string) => void;
  // We can add a 'loading' prop later to show a spinner
}

export default function TerminalInput({ onCommandSubmit }: TerminalInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onCommandSubmit(text);
      setText("");
    }
  }, [text, onCommandSubmit]);

  return (
    <Box
      pos="relative"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        placeholder="Type a cx command... (e.g., connection list)"
        className="w-full bg-gray-100 dark:bg-gray-900 p-2 pr-10 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
      />
      <ActionIcon
        size="sm"
        variant="filled"
        color="blue"
        onClick={handleSubmit}
        disabled={!text.trim()}
        pos="absolute"
        bottom={10}
        right={10}
      >
        <IconSend size={16} />
      </ActionIcon>
    </Box>
  );
}
