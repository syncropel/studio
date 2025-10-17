"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Box, Text } from "@mantine/core";
import Spotlight from "@/widgets/Spotlight";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import type { HomepageItem } from "@/widgets/Spotlight";

export default function Homepage() {
  const { sendJsonMessage, readyState } = useWebSocket();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeOfDayGreeting = "Hello";
    if (hour < 12) {
      timeOfDayGreeting = "Good morning";
    } else if (hour < 18) {
      timeOfDayGreeting = "Good afternoon";
    } else {
      timeOfDayGreeting = "Good evening";
    }

    let name = "";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
        name = "."; // Use a period for local dev, so it reads "Good morning."
      } else {
        const subdomain = hostname.split(".")[0];
        // Capitalize the first letter of the name
        name = `, ${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}.`;
      }
    }

    return `${timeOfDayGreeting}${name}`;
  }, []);
  // This handler will be passed down to the Spotlight component.
  // It contains the logic for what to do when a user clicks an item.
  const handleSpotlightItemClick = (item: HomepageItem) => {
    if (item.action.type === "open_page") {
      sendJsonMessage({
        type: "PAGE.LOAD",
        command_id: `load-page-${nanoid()}`,
        payload: { page_id: item.action.payload.page_id },
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
        {greeting}
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
