"use client";

import React from "react";
import { Code, Loader, Text } from "@mantine/core";
import type { SDUIPayload } from "@/shared/api/types";

import TextRenderer from "./sdui/TextRenderer";
import CardRenderer from "./sdui/CardRenderer";
import JsonRenderer from "./sdui/JsonRenderer";
import TableRenderer from "./sdui/TableRenderer";
import TreeRenderer from "./sdui/TreeRenderer";

// We need a simple image renderer now
const ImageRenderer = ({ src, alt }: { src: string; alt?: string }) => (
  <img src={src} alt={alt} className="max-w-full rounded" />
);

const CustomComponentLoader = ({ src, props }: { src: string; props: any }) => {
  return (
    <Text c="orange">TODO: Implement Custom Component Loader for: {src}</Text>
  );
};

export default function DynamicUIRenderer({ schema }: { schema: SDUIPayload }) {
  if (!schema || !schema.ui_component) {
    return <JsonRenderer data={schema} />;
  }

  // --- START: DEFINITIVE FIX ---
  // The logic is correct, but we need to help TypeScript's control flow analysis.

  // Layer 3: Handle custom namespaced components first.
  if (schema.ui_component.includes(":")) {
    return (
      <CustomComponentLoader src={schema.ui_component} props={schema.props} />
    );
  }
  // Layer 1 & 2: Handle all standard, pre-built components.
  else {
    switch (schema.ui_component) {
      case "text":
        return <TextRenderer {...(schema.props as any)} />;
      case "card":
        return <CardRenderer {...(schema.props as any)} />;
      case "table":
        return <TableRenderer {...(schema.props as any)} />;
      case "json":
        return <JsonRenderer {...(schema.props as any)} />;
      case "tree":
        return <TreeRenderer {...(schema.props as any)} />;
      case "image":
        return <ImageRenderer {...(schema.props as any)} />;
      // case 'layout': // Add this when LayoutRenderer is built
      //   return <LayoutRenderer schema={schema} />;

      default:
        return (
          <Text c="red" size="sm">
            Error: Unknown standard UI component type{" "}
            <Code>{schema.ui_component}</Code>
          </Text>
        );
    }
  }
  // --- END: DEFINITIVE FIX ---
}
