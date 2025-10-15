"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { Loader, Box } from "@mantine/core";

// Props now expect a `data` property, matching our SDUI schema
interface JsonRendererProps {
  data: any;
}

export default function JsonRenderer({ data }: JsonRendererProps) {
  const jsonString = JSON.stringify(data, null, 2);
  const lineCount = jsonString.split("\n").length;
  const height = Math.min(Math.max(lineCount * 19, 100), 500);

  return (
    <Box className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <Editor
        height={`${height}px`}
        language="json"
        value={jsonString}
        theme="light"
        loading={<Loader size="sm" />}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "off",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          roundedSelection: false,
          contextmenu: false,
          padding: { top: 10, bottom: 10 },
          folding: true,
          showFoldingControls: "always",
        }}
      />
    </Box>
  );
}
