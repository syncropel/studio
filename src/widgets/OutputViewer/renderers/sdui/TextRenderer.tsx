"use client";
import { Text } from "@mantine/core";

export default function TextRenderer({ content }: { content: string }) {
  // Using a <pre> tag to respect whitespace from the backend
  return <Text style={{ whiteSpace: "pre-wrap" }}>{content}</Text>;
}
