import React, { Suspense } from "react";
import { Loader, Center } from "@mantine/core";
import StudioClientRoot from "./StudioClientRoot";

// Import the core CSS for rc-tree. This provides the styles for checkboxes,
// expand/collapse icons, and other essential visual elements.

export default function StudioPage() {
  return (
    // The Suspense boundary tells Next.js what to show while the client-side
    // JavaScript is loading and rendering.
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader />
        </Center>
      }
    >
      <StudioClientRoot />
    </Suspense>
  );
}
