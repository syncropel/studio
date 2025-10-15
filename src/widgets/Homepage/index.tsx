"use client";

import React, { useState, useEffect } from "react";
import { Box, Text } from "@mantine/core";
import Spotlight from "@/widgets/Spotlight";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import type { HomepageItem } from "@/widgets/Spotlight";

export default function Homepage() {
  const { sendJsonMessage, readyState } = useWebSocket();

  // This handler will be passed down to the Spotlight component.
  // It contains the logic for what to do when a user clicks an item.
  const handleSpotlightItemClick = (item: HomepageItem) => {
    if (item.action.type === "open_page") {
      sendJsonMessage({
        type: "LOAD_PAGE",
        command_id: `load-page-${nanoid()}`,
        payload: { page_name: item.action.payload.path },
      });
    } else {
      // You can add handlers for other action types here later
      // e.g., running a command, opening a URL, etc.
      console.log("Homepage action triggered:", item.action);
    }
  };

  // This component acts as the main container for the "Mission Control" view.
  return (
    <Box className="h-full flex flex-col items-center pt-8 md:pt-20 p-4 md:p-8">
      <Text size="xl" fw={500} mb="xs">
        Good morning, David.
      </Text>

      {/*
        The Spotlight component is rendered here. It contains its own internal logic
        for fetching data, but we pass it the `handleSpotlightItemClick` function
        so this Homepage component can decide what to do when an item is selected.
      */}
      <Spotlight onItemClick={handleSpotlightItemClick} />
    </Box>
  );
}
