// /home/dpwanjala/repositories/syncropel/studio/src/mocks/server.mjs
//
// ========================================================================
//   Definitive Mock Server for Syncropel Studio Development
// ========================================================================
//
// Protocol Version: Adheres to SCP/SEP v1.0.0
//
// This file simulates the entire `cx-server` backend, enabling full-featured
// frontend development without a live Python environment. It correctly implements:
//
// 1.  **Control Plane (WebSocket):** Handles real-time, event-driven communication
//     for commands and status updates, strictly following the Syncropel Event
//     Protocol (SEP).
//
// 2.  **Data Plane (HTTP):** Serves large data artifacts on-demand, implementing
//     the "Hybrid Claim Check" pattern to keep the UI responsive.
//
// 3.  **Stateful Logic:** Simulates complex, asynchronous, and interactive server
//     responses to provide a realistic development experience.

// ----------------------------------------------------------------------
//   SECTION 1: IMPORTS & SETUP
// ----------------------------------------------------------------------

import { WebSocketServer } from "ws";
import http from "http";
import { URL } from "url";

// Import all mock data. The structure of these objects is the contract
// that this mock server fulfills.
import {
  MOCK_PAGES,
  MOCK_BLOCK_OUTPUTS,
  MOCK_ARTIFACT_CONTENT,
  MOCK_WORKSPACE_DATA,
  MOCK_SESSION_STATE,
  MOCK_HOMEPAGE_DATA,
  MOCK_RUN_HISTORY,
  MOCK_RUN_DETAILS,
  MOCK_COMMAND_RESPONSES,
  MOCK_BLOCK_ERRORS,
} from "./mock-data.js";

// --- Server Configuration ---
const WS_PORT = 8889; // WebSocket for the Control Plane (commands/events)
const HTTP_PORT = 8888; // HTTP for the Data Plane (artifact downloads)

console.log(" MOCK SERVER: Initializing...");
console.log(
  ` └─ WebSocket Control Plane will run on ws://localhost:${WS_PORT}`
);
console.log(` └─ HTTP Data Plane will run on http://localhost:${HTTP_PORT}`);
console.log("-".repeat(60));

// ========================================================================
//   SECTION 2: WEBSOCKET SERVER (THE CONTROL PLANE)
// ========================================================================

const wss = new WebSocketServer({ port: WS_PORT });

console.log(
  ` MOCK SERVER: WebSocket Control Plane listening on ws://localhost:${WS_PORT}`
);
console.log("-".repeat(60));

wss.on("connection", (ws) => {
  const sessionId = `session-${Date.now()}`;
  console.log(`[Mock WS][${sessionId}] Client connected.`);

  /**
   * Centralized event emitter. Enforces the Syncropel Event Protocol (SEP) v1.0.0
   * for every message sent to the client.
   * @param {string} command_id - The ID of the client command that initiated this event.
   * @param {string} type - The event type, e.g., "BLOCK.OUTPUT".
   * @param {string} source - A URI-like identifier of the event's origin.
   * @param {'info'|'warn'|'error'|'debug'} level - The severity level.
   * @param {string} message - A human-readable summary.
   * @param {object} fields - The structured, machine-readable data for the event.
   * @param {object} labels - Filterable key-value tags.
   */
  const sendEvent = (
    command_id,
    type,
    source,
    level,
    message,
    fields = {},
    labels = {}
  ) => {
    const event = {
      command_id: command_id,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: type,
      source: source,
      timestamp: new Date().toISOString(),
      payload: { level, message, fields, labels },
    };
    console.log(
      `[Mock WS][${sessionId}] SENDING ->`,
      JSON.stringify(event, null, 2)
    );
    ws.send(JSON.stringify(event));
  };

  ws.on("message", (message) => {
    try {
      const command = JSON.parse(message);
      console.log(`[Mock WS][${sessionId}] RECEIVED <-`, command);

      const { command_id, type, payload } = command;

      switch (type) {
        case "SESSION.INIT": {
          sendEvent(
            command_id,
            "SESSION.LOADED",
            "/session",
            "info",
            "Session initialized.",
            MOCK_SESSION_STATE
          );
          break;
        }

        case "PAGE.LOAD": {
          const pageId = payload.page_id; // Correctly using page_id from client
          const pageData = MOCK_PAGES[pageId];
          if (pageData) {
            sendEvent(
              command_id,
              "PAGE.LOADED",
              `/pages/${pageId}`,
              "info",
              `Page '${pageId}' loaded.`,
              pageData
            );
          } else {
            // Simulate a server-side error if the page isn't in our mock data
            sendEvent(
              command_id,
              "SYSTEM.ERROR",
              `/pages/${pageId}`,
              "error",
              `Page '${pageId}' not found in mock data.`
            );
          }
          break;
        }

        case "BLOCK.RUN": {
          const { block_id } = payload;
          const errorPayload = MOCK_BLOCK_ERRORS[block_id];

          // Simulate sending a "running" status immediately
          setTimeout(
            () =>
              sendEvent(
                command_id,
                "BLOCK.STATUS",
                `/blocks/${block_id}`,
                "info",
                `Block '${block_id}' is running.`,
                { block_id, status: "running" }
              ),
            100
          );

          if (errorPayload) {
            // Simulate a FAILED run after a delay
            setTimeout(
              () =>
                sendEvent(
                  command_id,
                  "BLOCK.ERROR",
                  `/blocks/${block_id}`,
                  "error",
                  `Block '${block_id}' failed.`,
                  errorPayload
                ),
              1000
            );
          } else {
            const resultOutput = MOCK_BLOCK_OUTPUTS[block_id];
            if (resultOutput) {
              // Simulate a SUCCESSFUL run after a delay
              setTimeout(
                () =>
                  sendEvent(
                    command_id,
                    "BLOCK.OUTPUT",
                    `/blocks/${block_id}`,
                    "info",
                    `Block '${block_id}' completed successfully.`,
                    {
                      block_id,
                      status: "success",
                      duration_ms: Math.floor(Math.random() * 2000) + 300,
                      output: resultOutput,
                    }
                  ),
                1500
              );
            } else {
              // **IMPROVEMENT APPLIED**: Send a specific BLOCK.ERROR if no mock is found.
              setTimeout(
                () =>
                  sendEvent(
                    command_id,
                    "BLOCK.ERROR",
                    `/blocks/${block_id}`,
                    "error",
                    `Block '${block_id}' failed.`,
                    {
                      block_id,
                      status: "error",
                      duration_ms: 500,
                      error: {
                        message: `Mock server error: No mock output or error defined for block ID '${block_id}'.`,
                      },
                    }
                  ),
                500
              );
            }
          }
          break;
        }

        case "WORKSPACE.BROWSE": {
          const browseData = MOCK_WORKSPACE_DATA[payload.path] || [];
          sendEvent(
            command_id,
            "WORKSPACE.BROWSE_RESULT",
            "/workspace",
            "info",
            "Workspace contents listed.",
            { path: payload.path, data: browseData }
          );
          break;
        }

        case "HOMEPAGE.GET_DATA": {
          sendEvent(
            command_id,
            "HOMEPAGE.DATA_RESULT",
            "/homepage",
            "info",
            "Homepage data retrieved.",
            MOCK_HOMEPAGE_DATA
          );
          break;
        }

        // --- Handlers for more advanced, interactive scenarios ---
        case "COMMAND.EXECUTE":
        case "UI.EVENT.TRIGGER": {
          const key = `${type}:${
            type === "COMMAND.EXECUTE"
              ? payload.command_text
              : payload.event_name
          }`;
          const response = MOCK_COMMAND_RESPONSES[key];

          if (response?.responseFlow) {
            response.responseFlow.forEach((item, index) => {
              setTimeout(() => {
                const { type, source, payload: eventPayload } = item.event;
                sendEvent(
                  command_id,
                  type,
                  source,
                  eventPayload.level,
                  eventPayload.message,
                  eventPayload.fields,
                  eventPayload.labels
                );
              }, item.delay * (index + 1));
            });
          } else {
            console.warn(
              `[Mock WS] No mock response flow found for key: ${key}`
            );
          }
          break;
        }

        // --- Handlers for the Activity Hub ---
        case "GET_RUN_HISTORY": {
          // **IMPROVEMENT APPLIED**: Send the data directly as the `fields` object.
          sendEvent(
            command_id,
            "RUN_HISTORY_RESULT",
            "/history",
            "info",
            "Run history retrieved.",
            MOCK_RUN_HISTORY
          );
          break;
        }

        case "GET_RUN_DETAIL": {
          const runId = payload.run_id;
          const detail = MOCK_RUN_DETAILS[runId];
          // **IMPROVEMENT APPLIED**: Send the data directly as the `fields` object.
          sendEvent(
            command_id,
            "RUN_DETAIL_RESULT",
            `/history/${runId}`,
            "info",
            `Details for run ${runId} retrieved.`,
            detail || { error: `No details found for run ${runId}` }
          );
          break;
        }

        default:
          console.warn(
            `[Mock WS][${sessionId}] Unhandled command type: ${type}`
          );
          sendEvent(
            command_id,
            "SYSTEM.ERROR",
            "/system/dispatcher",
            "warn",
            `Mock server does not handle command type: ${type}`
          );
      }
    } catch (e) {
      console.error(
        `[Mock WS][${sessionId}] Error parsing incoming message:`,
        e
      );
    }
  });

  ws.on("close", () => {
    console.log(`[Mock WS][${sessionId}] Client disconnected.`);
  });
});

// ========================================================================
//   SECTION 3: HTTP SERVER (THE DATA PLANE)
// ========================================================================
// This server's sole purpose is to handle `GET /artifacts/{id}` requests,
// fulfilling the "Claim Check" pattern for large data payloads.

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { method } = req;

  console.log(`[Mock HTTP] Received: ${method} ${url.pathname}`);

  // CORS headers are essential for the browser to allow the frontend (running on a
  // different port) to make requests to this server.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204); // Standard response for CORS preflight requests
    res.end();
    return;
  }

  const artifactRegex = /^\/artifacts\/(sha256:[a-zA-Z0-9-]+)/;
  const match = url.pathname.match(artifactRegex);

  if (method === "GET" && match) {
    const artifactId = match[1];
    const artifact = MOCK_ARTIFACT_CONTENT[artifactId];

    if (artifact) {
      console.log(`[Mock HTTP] Serving artifact: ${artifactId}`);
      res.writeHead(200, { "Content-Type": artifact.contentType });

      // **IMPROVEMENT APPLIED**: Correctly use `artifact.content` for the redirect URL.
      // This pattern is a clever mock that avoids needing real image files.
      if (
        artifact.contentType.startsWith("image/") &&
        typeof artifact.content === "string" &&
        artifact.content.startsWith("http")
      ) {
        res.writeHead(302, { Location: artifact.content });
        res.end();
      } else if (typeof artifact.content === "object") {
        res.end(JSON.stringify(artifact.content, null, 2));
      } else {
        res.end(artifact.content);
      }
    } else {
      console.warn(`[Mock HTTP] Artifact not found: ${artifactId}`);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: `Artifact with id '${artifactId}' not found.` })
      );
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Endpoint not found: ${url.pathname}` }));
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(
    ` MOCK SERVER: HTTP Data Plane listening on http://localhost:${HTTP_PORT}`
  );
  console.log("-".repeat(60));
});
