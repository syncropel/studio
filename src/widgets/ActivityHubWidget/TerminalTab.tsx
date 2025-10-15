"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, TextInput, Text } from "@mantine/core";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { nanoid } from "nanoid";

interface TerminalLine {
  type: "input" | "output";
  content: string;
}

export default function TerminalTab() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const { sendJsonMessage } = useWebSocket();
  const { lastJsonMessage } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for terminal output from the server
  useEffect(() => {
    if (lastJsonMessage?.type === "TERMINAL_OUTPUT") {
      const output = (lastJsonMessage.payload as any).output;
      setLines((prev) => [...prev, { type: "output", content: output }]);
    }
  }, [lastJsonMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const handleCommandSubmit = () => {
    if (!input.trim()) return;

    setLines((prev) => [...prev, { type: "input", content: input }]);
    sendJsonMessage({
      type: "EXECUTE_TERMINAL_COMMAND",
      command_id: `terminal-cmd-${nanoid()}`,
      payload: { command: input },
    });
    setInput("");
  };

  return (
    <Box className="h-full flex flex-col font-mono text-sm p-2">
      <Box ref={scrollRef} className="flex-grow overflow-y-auto">
        {lines.map((line, index) => (
          <div key={index}>
            {line.type === "input" && (
              <Text>
                <span className="text-green-500">cx&gt; </span>
                {line.content}
              </Text>
            )}
            {line.type === "output" && (
              <Text className="whitespace-pre-wrap">{line.content}</Text>
            )}
          </div>
        ))}
      </Box>
      <TextInput
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommandSubmit();
        }}
        placeholder="Type a cx command..."
        leftSection={<Text c="green">cx&gt;</Text>}
        variant="unstyled"
        autoFocus
      />
    </Box>
  );
}
