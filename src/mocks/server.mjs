// NOTE: We use a .js file here for simplicity to run directly with Node
// without needing a separate TypeScript build step for our mock server.

import { WebSocketServer } from "ws";
// Since mock-data is a .ts file, we need a way to import it.
// For a quick setup, you can manually convert it to a .json or .js file.
// Or, for a more robust setup, use a tool like `ts-node`.
// For now, let's assume we have a converted mock-data.js.
// A simple way to achieve this without extra tools is to copy the object and save as .js
import {
  MOCK_GITHUB_PAGE,
  MOCK_BLOCK_RESULTS,
  MOCK_HOMEPAGE_DATA,
  MOCK_WORKSPACE_DATA,
  MOCK_RUN_HISTORY,
  MOCK_RUN_DETAILS,
} from "./mock-data.js";

const PORT = 8889; // Use a different port from the real server
const wss = new WebSocketServer({ port: PORT });

console.log(`[Mock Server] WebSocket server started on ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  console.log("[Mock Server] Client connected.");

  // Immediately send the initial session state on connection
  ws.send(
    JSON.stringify({
      type: "SESSION_LOADED",
      command_id: "initial-load",
      payload: {
        new_session_state: {
          connections: [{ alias: "mock-db", source: "mock-source" }],
          variables: [{ name: "mock_var", type: "string", preview: "'hello'" }],
        },
      },
    })
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("[Mock Server] Received message:", data);

    switch (data.type) {
      case "LOAD_PAGE": {
        console.log(`[Mock Server] Loading page: ${data.payload.page_name}`);
        // In a real mock, you'd look up the page. Here, we just return our one mock page.
        ws.send(
          JSON.stringify({
            type: "PAGE_LOADED",
            command_id: data.command_id,
            payload: MOCK_GITHUB_PAGE,
          })
        );
        break;
      }

      // Add cases for SAVE_PAGE, EXECUTE_COMMAND etc. as needed
      case "SAVE_PAGE": {
        console.log(
          "[Mock Server] Simulating page save...",
          data.payload.page.id
        );
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "PAGE_SAVED",
              command_id: data.command_id,
              payload: { path: `~/.cx/flows/${data.payload.page.id}.cx.md` },
            })
          );
        }, 500);
        break;
      }
      case "GET_HOMEPAGE_DATA": {
        console.log("[Mock Server] Fetching homepage data.");
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "HOMEPAGE_DATA_RESULT",
              command_id: data.command_id,
              payload: MOCK_HOMEPAGE_DATA,
            })
          );
        }, 300); // Simulate a fast network request
        break;
      }

      case "BROWSE_WORKSPACE": {
        const path = data.payload.path || "/";
        console.log(`[Mock Server] Browsing workspace path: ${path}`);

        setTimeout(() => {
          const responseData = MOCK_WORKSPACE_DATA[path] || [];

          ws.send(
            JSON.stringify({
              type: "WORKSPACE_BROWSE_RESULT",
              command_id: data.command_id,
              payload: {
                path,
                data: responseData, // The payload is now nested under 'data'
              },
            })
          );
        }, 300); // Simulate network delay
        break;
      }

      case "EXECUTE_COMMAND": {
        const { command_text } = data.payload;
        console.log(`[Mock Server] Executing command: ${command_text}`);

        let resultPayload = null;

        if (command_text === "flow list") {
          resultPayload = MOCK_FLOWS;
        } else if (command_text === "query list") {
          resultPayload = MOCK_QUERIES;
        }

        if (resultPayload) {
          // This mimics the structure the real server sends for list commands
          ws.send(
            JSON.stringify({
              type: "RESULT_SUCCESS",
              command_id: data.command_id,
              payload: {
                result: resultPayload, // The asset list is nested under 'result'
                new_session_state: {
                  connections: [], // We can send an empty state update for now
                  variables: [],
                },
              },
            })
          );
        } else {
          console.log(
            `[Mock Server] Unhandled execute command: ${command_text}`
          );
        }
        break;
      }

      case "RUN_BLOCK": {
        const { block_id, page_id } = data.payload;
        console.log(`[Mock Server] Running block: ${block_id}`);

        const sendEvent = (level, message, labels = {}, fields = {}) => {
          ws.send(
            JSON.stringify({
              type: "LOG_EVENT",
              command_id: data.command_id,
              payload: {
                level,
                timestamp: new Date().toISOString(),
                message,
                labels: {
                  run_id: `mock-run-${data.command_id}`,
                  flow_id: page_id,
                  step_id: block_id,
                  ...labels,
                },
                fields,
              },
            })
          );
        };

        // --- Simulate a realistic execution flow with delays ---

        // 1. Announce step start
        setTimeout(() => {
          sendEvent(
            "info",
            `Executing step '${block_id}'...`,
            { component: "ScriptEngine" },
            { status: "running", block_id }
          );
        }, 200);

        // 2. Announce a debug message
        setTimeout(() => {
          sendEvent("debug", "Query parameters validated successfully.", {
            component: "DeclarativeRestStrategy",
          });
        }, 800);

        // 3. Announce the final result (success or error)
        setTimeout(() => {
          const result = MOCK_BLOCK_RESULTS[block_id];
          if (result) {
            sendEvent(
              "info",
              `Step '${block_id}' completed.`,
              { component: "ScriptEngine" },
              { status: "success", block_id, result }
            );
          } else {
            sendEvent(
              "error",
              `No mock result found for block ID: ${block_id}`,
              { component: "ScriptEngine" },
              {
                status: "error",
                block_id,
                error: `Mock data not found for ${block_id}`,
              }
            );
          }
        }, 1500);

        break;
      }

      case "EXECUTE_TERMINAL_COMMAND": {
        const { command } = data.payload;
        console.log(`[Mock Terminal] Received command: ${command}`);
        let output = "";

        switch (command.trim()) {
          case "connections":
            output =
              "- alias: mock-db\n  source: mock-source\n- alias: another-db\n  source: another-source";
            break;
          case "help":
            output = 'Mock Help: Available commands are "connections", "help".';
            break;
          default:
            output = `Error: Unknown command "${command}"`;
        }

        ws.send(
          JSON.stringify({
            type: "TERMINAL_OUTPUT",
            command_id: data.command_id,
            payload: { output },
          })
        );
        break;
      }
      case "GET_RUN_HISTORY": {
        console.log(`[Mock Server] Fetching run history.`);
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "RUN_HISTORY_RESULT",
              command_id: data.command_id,
              payload: MOCK_RUN_HISTORY,
            })
          );
        }, 400); // Simulate a short delay
        break;
      }

      case "GET_RUN_DETAIL": {
        const { run_id } = data.payload;
        console.log(`[Mock Server] Fetching details for run: ${run_id}`);
        const detail = MOCK_RUN_DETAILS[run_id];
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "RUN_DETAIL_RESULT",
              command_id: data.command_id,
              payload: detail || {
                error: `No details found for run ${run_id}`,
              },
            })
          );
        }, 250);
        break;
      }

      case "GET_ARTIFACT_CONTENT": {
        const { run_id, artifact_name } = data.payload;
        const key = `${run_id}-${artifact_name}`;
        console.log(`[Mock Server] Fetching content for artifact: ${key}`);

        const artifactData = MOCK_ARTIFACT_CONTENT[key];

        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "ARTIFACT_CONTENT_RESULT",
              command_id: data.command_id,
              payload: artifactData
                ? {
                    id: key,
                    runId: run_id,
                    artifactName: artifact_name,
                    ...artifactData,
                  }
                : { error: `Artifact not found: ${key}` },
            })
          );
        }, 300);
        break;
      }

      default:
        console.log(`[Mock Server] Unhandled message type: ${data.type}`);
    }
  });

  ws.on("close", () => {
    console.log("[Mock Server] Client disconnected.");
  });
});
