// /home/dpwanjala/repositories/syncropel/studio/src/widgets/EcosystemView/index.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Title,
  Text,
  Stack,
  Loader,
  Center,
  TextInput,
  Select,
  Button,
  Group,
  Box,
} from "@mantine/core";
import {
  IconSearch,
  IconCube,
  IconBuildingStore,
  IconDownload,
} from "@tabler/icons-react";
import {
  useSessionStore,
  EcosystemPackage,
  EcosystemRegistry,
} from "@/shared/store/useSessionStore";
import { useWebSocket } from "@/shared/providers/WebSocketProvider";
import { useUIStateStore } from "@/shared/store/useUIStateStore";
import { nanoid } from "nanoid";
import { ReadyState } from "react-use-websocket";
import CollapsibleSection from "@/widgets/SidebarWidget/CollapsibleSection";

const PackageListItem = ({
  pkg,
  isInstalled,
  onInstall,
}: {
  pkg: EcosystemPackage;
  isInstalled: boolean;
  onInstall: (id: string) => void;
}) => (
  <Box className="py-2 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
    <Group justify="space-between" wrap="nowrap">
      <Box className="min-w-0">
        <Group gap="xs">
          {pkg.id.includes("blueprint") ? (
            <IconCube size={16} className="text-blue-500" />
          ) : (
            <IconBuildingStore size={16} className="text-teal-500" />
          )}
          <Text size="sm" fw={500} truncate>
            {pkg.name}
          </Text>
        </Group>
        <Text size="xs" c="dimmed" truncate>
          ({pkg.id}@{pkg.version})
        </Text>
        <Text size="xs" c="dimmed" mt={2} truncate>
          {pkg.description}
        </Text>
      </Box>
      {!isInstalled && (
        <Button
          size="xs"
          variant="default"
          leftSection={<IconDownload size={14} />}
          onClick={() => onInstall(pkg.id)}
          className="flex-shrink-0"
        >
          Install
        </Button>
      )}
    </Group>
  </Box>
);

export default function EcosystemView() {
  const {
    installedBlueprints,
    installedApplications,
    availableBlueprints,
    availableApplications,
    registries,
    isEcosystemLoading,
    setIsEcosystemLoading,
  } = useSessionStore();

  const { sendJsonMessage, readyState } = useWebSocket();
  const { setActiveSidebarView } = useUIStateStore();

  const [selectedRegistry, setSelectedRegistry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Initial data fetch
  useEffect(() => {
    if (readyState === ReadyState.OPEN && isEcosystemLoading) {
      sendJsonMessage({
        type: "ECOSYSTEM.LIST_INSTALLED",
        command_id: nanoid(),
        payload: {},
      });
      sendJsonMessage({
        type: "ECOSYSTEM.LIST_REGISTRIES",
        command_id: nanoid(),
        payload: {},
      });
    }
  }, [readyState, isEcosystemLoading, sendJsonMessage]);

  // Set default registry once registries are loaded
  useEffect(() => {
    if (registries.length > 0 && !selectedRegistry) {
      const defaultRegistry =
        registries.find((r) => r.isDefault) || registries[0];
      setSelectedRegistry(defaultRegistry.id);
    }
  }, [registries, selectedRegistry]);

  // Fetch packages when selected registry changes
  useEffect(() => {
    if (selectedRegistry) {
      sendJsonMessage({
        type: "ECOSYSTEM.LIST_PACKAGES",
        command_id: nanoid(),
        payload: { registry_id: selectedRegistry },
      });
    }
  }, [selectedRegistry, sendJsonMessage]);

  const handleInstall = (packageId: string) => {
    // This is the ideal UX: switch to the terminal and run the command.
    // For now, we'll just log it. The terminal implementation is next.
    console.log(`TODO: Run 'app install ${packageId}' in the terminal`);
    // Example of how it will work:
    // setActiveSidebarView('terminal'); // This needs to be added to the store type
    // sendJsonMessage({ type: "COMMAND.EXECUTE", payload: { command_text: `app install ${packageId}` } });
  };

  const installedIds = useMemo(
    () =>
      new Set([
        ...installedBlueprints.map((p) => p.id),
        ...installedApplications.map((p) => p.id),
      ]),
    [installedBlueprints, installedApplications]
  );

  const filteredAvailableBlueprints = useMemo(
    () =>
      availableBlueprints.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [availableBlueprints, searchTerm]
  );

  const filteredAvailableApplications = useMemo(
    () =>
      availableApplications.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [availableApplications, searchTerm]
  );

  if (isEcosystemLoading) {
    return (
      <Center h={100}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box p="xs">
      <Title order={5} mb="md">
        Ecosystem
      </Title>

      <CollapsibleSection
        title={`Installed (${
          installedBlueprints.length + installedApplications.length
        })`}
        icon={IconDownload}
        isExpanded={true}
        noPadding
      >
        <Box pl="sm" pt="xs">
          <Text size="xs" fw={500} c="dimmed">
            Blueprints ({installedBlueprints.length})
          </Text>
          {installedBlueprints.map((pkg) => (
            <PackageListItem
              key={pkg.id}
              pkg={pkg}
              isInstalled={true}
              onInstall={handleInstall}
            />
          ))}
          <Text size="xs" fw={500} c="dimmed" mt="sm">
            Applications ({installedApplications.length})
          </Text>
          {installedApplications.map((pkg) => (
            <PackageListItem
              key={pkg.id}
              pkg={pkg}
              isInstalled={true}
              onInstall={handleInstall}
            />
          ))}
        </Box>
      </CollapsibleSection>

      <Text size="lg" fw={500} my="md">
        Discover
      </Text>

      <Stack gap="sm">
        <Select
          label="Registry"
          data={registries.map((r) => ({ value: r.id, label: r.name }))}
          value={selectedRegistry}
          onChange={setSelectedRegistry}
        />
        <TextInput
          placeholder="Search for blueprints & apps..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
      </Stack>

      <Box mt="md">
        {filteredAvailableBlueprints.length > 0 && (
          <Text size="xs" fw={500} c="dimmed">
            Blueprints ({filteredAvailableBlueprints.length})
          </Text>
        )}
        {filteredAvailableBlueprints.map((pkg) => (
          <PackageListItem
            key={pkg.id}
            pkg={pkg}
            isInstalled={installedIds.has(pkg.id)}
            onInstall={handleInstall}
          />
        ))}

        {filteredAvailableApplications.length > 0 && (
          <Text size="xs" fw={500} c="dimmed" mt="sm">
            Applications ({filteredAvailableApplications.length})
          </Text>
        )}
        {filteredAvailableApplications.map((pkg) => (
          <PackageListItem
            key={pkg.id}
            pkg={pkg}
            isInstalled={installedIds.has(pkg.id)}
            onInstall={handleInstall}
          />
        ))}
      </Box>
    </Box>
  );
}
