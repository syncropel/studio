"use client";

import { useQuery } from "@tanstack/react-query";
import { DataRef } from "@/shared/api/types";

/**
 * Fetches the content of a large data artifact from the server's Data Plane.
 * This function is the core of our "Claim Check" redemption logic.
 * @param dataRef The DataRef object received from a BLOCK.OUTPUT event.
 * @returns The parsed content of the artifact (e.g., a JSON object/array).
 */
const fetchArtifact = async (dataRef: DataRef) => {
  // Construct the full URL, handling both absolute and relative paths from the server.
  // This makes it compatible with both local dev and production deployments.
  const url = new URL(dataRef.access_url, window.location.origin);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch artifact ${dataRef.artifact_id}: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  // Intelligently parse the response based on the renderer hint or content type.
  // In a real app, you might check response.headers.get('Content-Type').
  if (dataRef.renderer_hint === "json" || dataRef.renderer_hint === "table") {
    return response.json();
  }
  // Add cases for other types like blob, text, etc., as needed.
  return response.text();
};

/**
 * A custom React Query hook for fetching and caching artifact data.
 * @param dataRef The DataRef object from a `BLOCK.OUTPUT` event.
 * @param isEnabled A boolean to control when the query should execute.
 */
export const useArtifactQuery = (dataRef: DataRef, isEnabled: boolean) => {
  return useQuery({
    // The query key is a unique identifier for this piece of data.
    // React Query uses it for caching, refetching, and invalidation.
    queryKey: ["artifact", dataRef.artifact_id],

    // The function that will be called to fetch the data.
    queryFn: () => fetchArtifact(dataRef),

    // Control when the query is active. We only want to fetch when the user clicks "Load".
    enabled: isEnabled,

    // Cache the data forever once fetched successfully. Stale data is not an issue
    // for content-addressed artifacts, as their ID will change if the content changes.
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
