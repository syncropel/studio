// /home/dpwanjala/repositories/syncropel/studio/src/mocks/plugins/my-charts/PieChart.tsx
"use client";

import React, { useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";
import { Box, Text } from "@mantine/core";

// Define the expected props based on our SDUI design.
// This remains the same, providing a consistent interface for our platform.
interface PieChartProps {
  title?: string;
  data: Array<{
    name: string; // The label for the slice
    value: number; // The numerical value for the slice
  }>;
  // Nivo has its own color management, so we don't need a `colors` prop for this basic version.
}

export default function MockPieChart({ title, data }: PieChartProps) {
  if (!data || data.length === 0) {
    return <Text c="dimmed">No data provided for chart.</Text>;
  }

  // Nivo's Pie component expects data with `id` and `value` keys.
  // We map our generic `name`/`value` props to the required format.
  // This makes our custom component a robust adapter.
  const nivoData = useMemo(
    () => data.map((item) => ({ id: item.name, value: item.value })),
    [data]
  );

  return (
    <Box style={{ width: "100%", height: 300 }}>
      {title && (
        <Text fw={500} ta="center" mb="sm">
          {title}
        </Text>
      )}
      {/* The ResponsivePie component handles resizing automatically */}
      <ResponsivePie
        data={nivoData}
        margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: "#999",
            itemDirection: "left-to-right",
            itemOpacity: 1,
            symbolSize: 18,
            symbolShape: "circle",
          },
        ]}
      />
    </Box>
  );
}
