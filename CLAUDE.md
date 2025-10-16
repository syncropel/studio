# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Syncropel Studio** is the official web and desktop UI for the Syncropel platform. It's a Next.js/React application that acts as the "Glass" for the headless `cx-shell` engine (the "Brain"). The application follows a decoupled client-server architecture where the UI is a thin client that renders state and sends commands to the backend engine over WebSocket.

## Commands

### Development

```bash
# Install dependencies
npm install

# Start Next.js dev server (requires cx-server running separately)
npm run dev

# Start Next.js dev server with mock backend
npm run dev:mock

# Build for production
npm run build

# Start Electron app in development mode
npm run electron:dev

# Build Electron desktop app
npm run electron:build
```

### Development Workflow

For local development, you need **two terminal sessions**:

1. **Terminal 1 - Backend**: Start `cx-server` from the `cx-shell` repository:
   ```bash
   cd /path/to/cx-shell
   source .venv/bin/activate
   cx serve
   ```
   Server runs at `http://127.0.0.1:8888`

2. **Terminal 2 - Frontend**: Start Next.js dev server:
   ```bash
   npm run dev
   ```
   UI available at `http://localhost:3000`

### Linting

```bash
npm run lint
```

### Testing

This project does not currently have a test suite configured.

## Architecture

### High-Level Structure

The application is organized into three main layers:

1. **State Management** (`src/shared/store/`): Zustand stores for global state
   - `useConnectionStore`: Manages connection profiles and active connection
   - `useSessionStore`: Manages workspace state, current page, block results, UI visibility

2. **Communication Layer** (`src/shared/providers/`): WebSocket connection to backend
   - `WebSocketProvider`: Wraps `react-use-websocket`, handles reconnection logic
   - Translates inbound messages to store updates
   - Routes `LOG_EVENT` messages with block status to `setBlockResult`

3. **UI Layer** (`src/widgets/` and `src/app/`): React components organized as widgets
   - Each widget is a self-contained feature (e.g., Notebook, Sidebar, Inspector)
   - Widgets consume state from Zustand stores

### Key Architectural Patterns

#### The "Contextual Page" Model

The core data structure is `ContextualPage` (defined in `src/shared/types/notebook.ts`), which represents a notebook-style document containing:
- **Blocks**: Executable code/markdown cells with `id`, `engine`, `content`, `inputs`, `outputs`
- **Inputs**: Parameter definitions for the page
- **Metadata**: Name, description, etc.

Pages are loaded from the backend via WebSocket messages of type `PAGE_LOADED`.

#### Block Execution Model

When a block runs:
1. UI sends command via `WebSocketProvider.sendJsonMessage()`
2. Backend executes and sends back `LOG_EVENT` messages with `block_id` and `status` fields
3. `WebSocketProvider` translates these to `BlockResult` objects in `useSessionStore.blockResults`
4. `BlockComponent` subscribes to its result and renders accordingly

Block statuses: `pending`, `running`, `success`, `error`

#### SDUI (Syncropel Declarative UI)

The backend can send structured UI schemas via the SDUI protocol (defined in `src/shared/api/types.ts`). Block results can contain:
- Standard components: `table`, `card`, `json`, `tree`, `text`, `image`
- Custom components: Namespaced as `app-name:ComponentName`

The `DynamicUIRenderer` (`src/widgets/OutputViewer/renderers/DynamicUIRenderer.tsx`) dispatches to specific renderers based on `ui_component` field.

#### Connection Management

The app supports multiple connection profiles (local, remote, etc.):
- Profiles are persisted in localStorage via Zustand's `persist` middleware
- Active profile determines WebSocket URL
- Switching profiles triggers a page reload to re-establish connection
- Default profile uses dynamic URL: `ws://${window.location.host}/ws`

### Desktop (Electron) Architecture

- `electron-main.js`: Main process that manages window and `cx-server` lifecycle
- In development: Spawns `cx` from PATH
- In production: Spawns bundled `cx-server` from `process.resourcesPath`
- `next.config.ts`: Configured with `output: "export"` for static site generation
- Dev proxy: Rewrites `/ws` to `http://127.0.0.1:8888/ws` during development

### Message Flow

**Outbound** (UI → Backend):
```typescript
{
  type: string;
  command_id: string;  // Unique identifier for command tracking
  payload: Record<string, unknown>;
}
```

**Inbound** (Backend → UI):
```typescript
{
  type: "RESULT_SUCCESS" | "PAGE_LOADED" | "LOG_EVENT" | ...;
  command_id: string;
  payload: InboundPayload;  // Union type, varies by message type
}
```

The `useSessionStore.lastJsonMessage` always receives the raw inbound message for debugging/logging purposes (e.g., in the Events tab).

## Important Implementation Details

### WebSocket Reconnection

The `WebSocketProvider` uses `react-use-websocket` with:
- `shouldReconnect: () => !!activeProfile` - Only reconnects if profile is active
- `reconnectInterval: 3000` - 3 second delay between attempts
- `reconnectAttempts: 10` - Maximum retry count

### State Synchronization

When switching connection profiles or disconnecting:
1. `useSessionStore.reset()` clears all workspace state
2. `useConnectionStore` sets `activeProfileId` to new value (or null)
3. Page reloads via `window.location.reload()` to re-initialize WebSocket

This ensures clean state transitions and prevents stale data from persisting across connections.

### Block Result Translation

The `WebSocketProvider.onMessage` handler specifically looks for `LOG_EVENT` messages from the `ScriptEngine` component with `block_id` and `status` fields, translating them into `BlockResult` updates. This is the definitive mechanism for block execution status.

### Widget Visibility

The app supports both desktop (panel-based) and mobile (drawer-based) UI patterns:
- Desktop: `isNavigatorVisible`, `isInspectorVisible`, `isTerminalVisible`
- Mobile: `isNavDrawerOpen`, `isInspectorDrawerOpen`
- Global: `isSpotlightVisible` (command palette/search overlay)

These are managed in `useSessionStore` and are NOT persisted (reset on reload).

## File Organization

```
src/
├── app/                    # Next.js app router
│   ├── providers/          # React context providers (Mantine, WebSocket)
│   ├── StudioClientRoot.tsx  # Main client-side root component
│   └── page.tsx            # Homepage route
├── shared/                 # Shared utilities, types, and state
│   ├── api/                # Type definitions for WebSocket messages
│   ├── providers/          # WebSocketProvider implementation
│   ├── store/              # Zustand stores (useConnectionStore, useSessionStore)
│   ├── types/              # TypeScript types (notebook, commands)
│   └── hooks/              # Custom React hooks
├── widgets/                # Feature-based UI components
│   ├── Notebook/           # Main notebook/page viewer with blocks
│   ├── SidebarWidget/      # Navigation sidebar
│   ├── InspectorWidget/    # Right-side inspector panel
│   ├── ActivityHubWidget/  # Terminal/events/runs hub
│   ├── OutputViewer/       # Block output rendering (SDUI renderers)
│   ├── Spotlight/          # Command palette
│   └── ...
└── mocks/                  # Mock WebSocket server for development
```

## Common Patterns

### Sending Commands

```typescript
import { useWebSocket } from "@/shared/providers/WebSocketProvider";

const { sendJsonMessage } = useWebSocket();

sendJsonMessage({
  type: "EXECUTE_BLOCK",
  command_id: nanoid(),
  payload: { block_id: "my-block" }
});
```

### Subscribing to State

```typescript
import { useSessionStore } from "@/shared/store/useSessionStore";

const currentPage = useSessionStore((state) => state.currentPage);
const blockResult = useSessionStore((state) => state.blockResults[blockId]);
```

### Adding New SDUI Component Types

1. Define type in `src/shared/api/types.ts` (e.g., `SDUIMyComponentPayload`)
2. Add to `SDUIPayload` union type
3. Create renderer in `src/widgets/OutputViewer/renderers/sdui/MyComponentRenderer.tsx`
4. Update switch statement in `DynamicUIRenderer.tsx`

## Dependencies

### Core Stack
- **Next.js 15.5**: React framework with App Router
- **React 19.1**: UI library
- **TypeScript 5**: Type safety
- **Mantine 8.3**: UI component library
- **Zustand 5.0**: State management
- **react-use-websocket 4.13**: WebSocket hook

### Key Libraries
- **@monaco-editor/react**: Code editor
- **handsontable**: Spreadsheet/table component
- **reactflow**: Graph/flowchart visualization
- **markdown-it**: Markdown rendering
- **nanoid**: Unique ID generation

### Build Tools
- **Electron 38**: Desktop app wrapper
- **electron-builder**: Desktop app packager
- **Turbopack**: Next.js bundler (via --turbopack flag)
- **Tailwind CSS 4**: Utility-first CSS

## Notes for Future Development

- The `cx-server` backend is developed in the `syncropel/cx-shell` repository
- WebSocket message protocol is defined by the backend; frontend is reactive to backend changes
- Desktop builds require the `cx-server` executable to be placed in `./resources/cx-server` before running `npm run electron:build`
- The app uses static export (`output: "export"`) to be compatible with Electron's file:// protocol
- During development, Next.js dev server proxies WebSocket requests to the backend (see `next.config.ts` rewrites)
