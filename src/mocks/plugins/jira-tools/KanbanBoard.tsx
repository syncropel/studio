"use client";

// NOTE: To run this, you will need to install react-beautiful-dnd:
// npm install react-beautiful-dnd @types/react-beautiful-dnd

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Box, Paper, Text, Title } from "@mantine/core";

// This is the function signature our component expects from the host (Syncropel Studio)
type TriggerEvent = (eventName: string, eventData: any) => void;

interface KanbanProps {
  initialIssues: Array<{ id: string; title: string; status: string }>;
  boardColumns: string[];
  triggerEvent: TriggerEvent;
}

export default function KanbanBoard({
  initialIssues,
  boardColumns,
  triggerEvent,
}: KanbanProps) {
  const [issues, setIssues] = useState(initialIssues);

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Update local UI state immediately for a smooth experience
    const newIssues = Array.from(issues);
    const draggedIssue = newIssues.find((issue) => issue.id === draggableId);
    if (draggedIssue) {
      draggedIssue.status = destination.droppableId;
      setIssues(newIssues);

      // --- THE INTERACTIVE BRIDGE ---
      // Fire the event back to the Syncropel engine via the host.
      // The component doesn't know what will happen; it just reports what it did.
      console.log("[KanbanBoard] Firing 'cardDragEnd' event.");
      triggerEvent("cardDragEnd", {
        cardId: draggableId,
        newColumn: destination.droppableId,
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box style={{ display: "flex", gap: "16px" }}>
        {boardColumns.map((columnId) => (
          <Droppable key={columnId} droppableId={columnId}>
            {(provided) => (
              <Paper
                ref={provided.innerRef}
                {...provided.droppableProps}
                p="md"
                withBorder
                style={{ flex: 1, minHeight: 300 }}
              >
                <Title order={5} mb="md">
                  {columnId}
                </Title>
                {issues
                  .filter((issue) => issue.status === columnId)
                  .map((issue, index) => (
                    <Draggable
                      key={issue.id}
                      draggableId={issue.id}
                      index={index}
                    >
                      {(provided) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          p="sm"
                          mb="sm"
                          shadow="xs"
                        >
                          <Text size="sm">{issue.title}</Text>
                          <Text size="xs" c="dimmed">
                            {issue.id}
                          </Text>
                        </Paper>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </Paper>
            )}
          </Droppable>
        ))}
      </Box>
    </DragDropContext>
  );
}
