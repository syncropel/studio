"use client";

import {
  Box,
  Title,
  Text,
  SimpleGrid,
  Badge,
  Group,
  ActionIcon,
  ScrollArea,
  Paper,
  UnstyledButton,
} from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";
import { IconArrowRight, IconX } from "@tabler/icons-react";
import DynamicUIRenderer from "../OutputViewer/renderers/DynamicUIRenderer";
import { Block } from "@/shared/types/notebook";
import { InspectedArtifact, SDUIPayload } from "@/shared/api/types";

// --- SUB-COMPONENT for displaying details of the selected block ---
const BlockMetadata = ({ block }: { block: Block }) => {
  const { setSelectedBlockId } = useSessionStore();

  return (
    <Box className="p-4 border-b border-gray-200 dark:border-gray-800">
      <Title order={4}>
        <Text span truncate>
          Inspector: {block.name || block.id}
        </Text>
      </Title>

      <SimpleGrid cols={2} spacing="xs" mt="md">
        <Text size="sm" fw={500}>
          Engine:
        </Text>
        <Badge variant="outline" color="gray">
          {block.engine.toUpperCase()}
        </Badge>
      </SimpleGrid>

      <Text size="xs" tt="uppercase" fw={700} c="dimmed" mt="lg">
        Inputs
      </Text>
      <Box mt="xs">
        {(block.inputs || []).length > 0 ? (
          (block.inputs || []).map((input) => (
            <UnstyledButton
              key={input}
              onClick={() => setSelectedBlockId(input.split(".")[0])}
              className="w-full p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Group gap="xs">
                <IconArrowRight size={14} className="text-blue-500" />
                <Text size="sm" ff="monospace" truncate>
                  {input}
                </Text>
              </Group>
            </UnstyledButton>
          ))
        ) : (
          <Text size="sm" c="dimmed">
            No inputs
          </Text>
        )}
      </Box>

      <Text size="xs" tt="uppercase" fw={700} c="dimmed" mt="lg">
        Outputs
      </Text>
      <Box mt="xs">
        {(block.outputs || []).length > 0 ? (
          <Group gap="xs">
            {(block.outputs || []).map((output) => (
              <Badge key={output} color="green" variant="light" radius="sm">
                {output}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            No defined outputs
          </Text>
        )}
      </Box>
    </Box>
  );
};

// --- SUB-COMPONENT for displaying a single previewed artifact ---
const ArtifactPreviewCard = ({ artifact }: { artifact: InspectedArtifact }) => {
  const { removeInspectedArtifact } = useSessionStore();

  const sduiSchema: SDUIPayload = (() => {
    switch (artifact.type) {
      case "table":
        return { ui_component: "table", props: { data: artifact.content } };
      case "json":
        return { ui_component: "json", props: { data: artifact.content } };
      case "image":
        // The content for an image is a URL string
        return {
          ui_component: "image",
          props: { src: artifact.content, alt: artifact.artifactName },
        };
      default:
        // Fallback for 'unknown' type
        return {
          ui_component: "json",
          props: {
            data: { error: "Unknown artifact type", content: artifact.content },
          },
        };
    }
  })();

  return (
    <Paper withBorder shadow="sm" p="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500} truncate>
          {artifact.type === "image" ? "🖼️" : "📄"} {artifact.artifactName}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => removeInspectedArtifact(artifact.id)}
          title="Close Preview"
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
      <Box>
        {/* The DynamicUIRenderer expects a valid SDUI schema */}
        <DynamicUIRenderer schema={sduiSchema} />
      </Box>
    </Paper>
  );
};

// --- MAIN INSPECTOR WIDGET ---
export default function InspectorWidget() {
  const { currentPage, selectedBlockId, inspectedArtifacts } =
    useSessionStore();

  const selectedBlock = currentPage?.blocks.find(
    (b) => b.id === selectedBlockId
  );

  const showPlaceholder = !selectedBlock && inspectedArtifacts.length === 0;

  return (
    <aside className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-800">
      <ScrollArea className="flex-grow">
        {/* Placeholder shown only when nothing is selected or inspected */}
        {showPlaceholder && (
          <Box p="md">
            <Title order={4}>Inspector</Title>
            <Text c="dimmed" mt="sm">
              Select a block or preview an artifact to see details here.
            </Text>
          </Box>
        )}

        {/* Section 1: Renders details for the currently selected block */}
        {selectedBlock && <BlockMetadata block={selectedBlock} />}

        {/* Section 2: Renders the stack of previewed artifacts */}
        {inspectedArtifacts.length > 0 && (
          <Box p="md" className="space-y-4">
            {/* Show a title only if there's no block selected, otherwise it's redundant */}
            {!selectedBlock && <Title order={5}>Artifact Previews</Title>}
            {inspectedArtifacts.map((artifact) => (
              <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
            ))}
          </Box>
        )}
      </ScrollArea>
    </aside>
  );
}
