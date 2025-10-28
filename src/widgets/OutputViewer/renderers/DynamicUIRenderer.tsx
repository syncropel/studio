// /home/dpwanjala/repositories/syncropel/studio/src/widgets/OutputViewer/renderers/DynamicUIRenderer.tsx
"use client";

import React, { Suspense, useMemo } from "react";
import Image from "next/image"; // IMPORT the next/image component
import { Code, Loader, Text } from "@mantine/core";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";

import type { SDUIPayload } from "@/shared/api/types";
import { MOCK_APPLICATION_PLUGINS } from "@/mocks/mock-data";

// Import our built-in renderers
import TextRenderer from "./sdui/TextRenderer";
import CardRenderer from "./sdui/CardRenderer";
import JsonRenderer from "./sdui/JsonRenderer";
import TableRenderer from "./sdui/TableRenderer";
import TreeRenderer from "./sdui/TreeRenderer";

// A simple image renderer using the Next.js Image component for optimization
const ImageRenderer = ({ src, alt }: { src: string; alt?: string }) => (
  // USE the next/image component.
  // We must provide width and height for it to work. We'll use layout="responsive"
  // to make it fill its container while maintaining aspect ratio.
  // The `unoptimized` prop is set to true because the src might be from an external,
  // non-whitelisted domain, which is common in a dynamic platform like this.
  <div style={{ position: "relative", width: "100%", height: "auto" }}>
    <Image
      src={src}
      alt={alt || "Rendered Image"}
      width={600} // Provide a base width
      height={300} // Provide a base height
      style={{
        width: "100%",
        height: "auto",
        maxWidth: "100%",
        borderRadius: "var(--mantine-radius-md)",
      }}
      unoptimized // Allows loading images from any domain
    />
  </div>
);

// A new component to handle the dynamic loading and rendering of a single custom component
const FederatedComponent = ({
  appName,
  componentName,
  ...props
}: {
  appName: string;
  componentName: string;
  [key: string]: any;
}) => {
  const { sendJsonMessage } = useWebSocket();

  const Component = useMemo(() => {
    const plugin =
      MOCK_APPLICATION_PLUGINS[
        appName as keyof typeof MOCK_APPLICATION_PLUGINS
      ];
    if (!plugin) {
      // Create a component for the error case
      const ErrorComponent = () => (
        <Text c="red">
          Error: Plugin &quot;{appName}&quot; not found in mock registry.
        </Text>
      );
      // ASSIGN a displayName for debugging
      ErrorComponent.displayName = `PluginNotFoundError(${appName})`;
      return ErrorComponent;
    }

    const componentPath =
      plugin.exposes[componentName as keyof typeof plugin.exposes];
    if (!componentPath) {
      // Create a component for the error case
      const ErrorComponent = () => (
        <Text c="red">
          Error: Component &quot;{componentName}&quot; not exposed by plugin
          &quot;{appName}&quot;.
        </Text>
      );
      // ASSIGN a displayName for debugging
      ErrorComponent.displayName = `ComponentNotFoundError(${appName}:${componentName})`;
      return ErrorComponent;
    }

    // This is the core of our mock. `React.lazy` with a dynamic `import()`
    // perfectly simulates the asynchronous nature of Module Federation.
    // The path alias (`@/`) must be correctly configured in `tsconfig.json`.
    return React.lazy(
      () => import(`@/mocks/plugins/${appName}/${componentName}`)
    );
  }, [appName, componentName]);

  // This is the mock of the `fireEvent` prop passed from the host to the plugin.
  const triggerEvent = (eventName: string, eventData: any) => {
    sendJsonMessage({
      command_id: `ui-event-${nanoid()}`,
      type: "UI.EVENT.TRIGGER",
      payload: {
        source_component_id: props.sourceBlockId, // Assume this is passed down
        event_name: eventName,
        event_data: eventData,
      },
    });
  };

  return (
    <Suspense fallback={<Loader />}>
      <Component {...props} triggerEvent={triggerEvent} />
    </Suspense>
  );
};
// ASSIGN a displayName for the FederatedComponent itself
FederatedComponent.displayName = "FederatedComponent";

export default function DynamicUIRenderer({ schema }: { schema: SDUIPayload }) {
  // If the schema is malformed or not an SDUI schema, default to showing the raw JSON.
  if (!schema || typeof schema !== "object" || !("ui_component" in schema)) {
    return <JsonRenderer data={schema} />;
  }

  // Check if it's a custom component (contains a namespace)
  if (schema.ui_component.includes(":")) {
    const [appName, componentName] = schema.ui_component.split(":");
    return (
      <FederatedComponent
        appName={appName}
        componentName={componentName}
        {...schema.props}
      />
    );
  }

  // Otherwise, render a built-in component
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
    default:
      return (
        <Text c="red" size="sm">
          Error: Unknown standard UI component type{" "}
          <Code>{schema.ui_component}</Code>
        </Text>
      );
  }
}
