"use client";

import React from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { WebSocketProvider } from "@/shared/providers/WebSocketProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "rc-tree/assets/index.css";

// Import Mantine's core styles (as before)
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/shared/lib/handsontable";

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        <WebSocketProvider>{children}</WebSocketProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
