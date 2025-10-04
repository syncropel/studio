// /home/dpwanjala/repositories/cx-studio/src/widgets/Notebook/ParametersForm.tsx
"use client";

import { Box, SimpleGrid, TextInput, Text } from "@mantine/core";
import { useSessionStore } from "@/shared/store/useSessionStore";

export default function ParametersForm() {
  const { currentPage, pageParameters, updatePageParameter } =
    useSessionStore();

  if (!currentPage?.inputs || Object.keys(currentPage.inputs).length === 0) {
    return null; // Don't render anything if there are no parameters
  }

  return (
    <Box p="md" mb="xl" className="border rounded-md">
      <Text size="sm" fw={700} mb="sm">
        Parameters
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {Object.entries(currentPage.inputs).map(([key, param]) => (
          <TextInput
            key={key}
            label={param.description || key}
            value={pageParameters[key] || ""}
            onChange={(event) =>
              updatePageParameter(key, event.currentTarget.value)
            }
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
