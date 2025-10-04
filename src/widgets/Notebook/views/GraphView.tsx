// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/views/GraphView.tsx
"use client";

import { useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { Button, Text } from "@mantine/core";

export default function GraphView() {
  const currentPage = useSessionStore((state) => state.currentPage);

  // Memoize the calculation of nodes and edges for React Flow
  const { nodes, edges } = useMemo(() => {
    if (!currentPage?.blocks) return { nodes: [], edges: [] };

    // Filter out non-executable blocks like Markdown to clean up the graph
    const executableBlocks = currentPage.blocks.filter(
      (block) => block.engine !== "markdown"
    );

    const initialNodes = executableBlocks.map((block, index) => ({
      id: block.id,
      type: "default", // Using default React Flow nodes for now
      data: { label: `${block.engine}: ${block.id}` },
      // Basic auto-layout logic
      position: { x: (index % 4) * 250, y: Math.floor(index / 4) * 150 },
    }));

    const initialEdges = executableBlocks.flatMap((block) =>
      // Safely check if 'inputs' is an array before mapping
      Array.isArray(block.inputs)
        ? block.inputs.map((input) => {
            const sourceBlockId = input.split(".")[0];
            return {
              id: `e-${sourceBlockId}-${block.id}`,
              source: sourceBlockId,
              target: block.id,
              animated: true, // Animate edges to show data flow direction
              style: { strokeWidth: 2 },
            };
          })
        : []
    );

    return { nodes: initialNodes, edges: initialEdges };
  }, [currentPage]);

  if (!currentPage) {
    return <Text c="dimmed">No page loaded to display in Graph View.</Text>;
  }

  // --- Definitive Fix: The ReactFlow component MUST be wrapped in a container with explicit dimensions ---
  return (
    <div
      style={{
        height: "70vh",
        width: "100%",
        border: "1px solid #eee",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView // Automatically zoom/pan to fit all nodes on initial render
      >
        <MiniMap />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-right">
          {/* Placeholder for future auto-layouting functionality */}
          <Button size="xs" variant="default" disabled>
            Auto-Layout
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
