// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/views/GridView.tsx
"use client";

import { useMemo } from "react";
import { HotTable } from "@handsontable/react-wrapper";
import { Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { Handsontable } from "@/shared/lib/handsontable";

export default function GridView() {
  const { currentPage, blockResults } = useSessionStore();

  const gridData = useMemo(() => {
    if (!currentPage?.blocks) return [];

    // Map over the blocks to create a flat structure suitable for a grid
    return currentPage.blocks.map((block) => ({
      id: block.id,
      engine: block.engine,
      status: blockResults[block.id]?.status || "pending",
      // --- Definitive Fix for null/undefined inputs/outputs ---
      // Safely check if inputs/outputs are arrays before joining
      inputs: Array.isArray(block.inputs) ? block.inputs.join(", ") : "",
      outputs: Array.isArray(block.outputs) ? block.outputs.join(", ") : "",
    }));
  }, [currentPage, blockResults]);

  if (!currentPage) {
    return <Text c="dimmed">No page loaded to display in Grid View.</Text>;
  }

  if (gridData.length === 0) {
    return (
      <Text c="dimmed">This page has no blocks to display in a grid.</Text>
    );
  }

  return (
    <div
      className="handsontable-container"
      style={{ width: "100%", height: "auto" }}
    >
      <HotTable
        data={gridData}
        colHeaders={["ID", "Engine", "Status", "Inputs", "Outputs"]}
        columns={[
          { data: "id", readOnly: true },
          { data: "engine", readOnly: true },
          { data: "status", readOnly: true },
          { data: "inputs", readOnly: true },
          { data: "outputs", readOnly: true },
        ]}
        rowHeaders={true}
        height="auto"
        width="100%"
        autoWrapRow={true}
        autoWrapCol={true}
        manualColumnResize={true}
        filters={true}
        dropdownMenu={true}
        columnSorting={true}
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
      />
    </div>
  );
}
