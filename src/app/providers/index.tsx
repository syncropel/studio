"use client";

import React from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { WebSocketProvider } from "@/shared/providers/WebSocketProvider";

// Import Mantine's core styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/shared/lib/handsontable";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider>
      <Notifications />
      <WebSocketProvider>{children}</WebSocketProvider>
    </MantineProvider>
  );
}
