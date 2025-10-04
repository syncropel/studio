## [0.1.0] - 2025-10-04

This is the inaugural public release of **Syncropel Studio**.

### ✨ Added

- **Core IDE Architecture:**

  - Implemented the foundational three-pane, resizable "Cockpit" layout using Mantine UI and `react-resizable-panels`.
  - Established a robust, real-time WebSocket connection to the `cx-server` backend for live state synchronization, managed by a dedicated `WebSocketProvider`.
  - Integrated `zustand` for centralized, predictable client-side state management (`useSessionStore`).

- **Interactive Notebook Experience:**

  - Built the core "Main Canvas" for authoring and executing `.cx.md` computational documents.
  - Implemented block-based editing with distinct components for rendering and editing Markdown (`<MarkdownBlock>`) and Code (`<CodeBlock>`).
  - Integrated the **Monaco Editor** for a rich, syntax-highlighted code editing experience.
  - Enabled interactive "Run" functionality on individual blocks, sending the block's current content to the server for execution and receiving real-time status updates.

- **Rich Output Rendering:**

  - Created a modular `<OutputViewer>` component with specialized renderers for different data types.
  - Implemented an interactive data grid using **Mantine DataTable** for tabular results (e.g., from SQL queries).
  - Included a syntax-highlighted JSON viewer for all other structured data.

- **Workspace & Session Management:**

  - Built a dynamic **Navigator Sidebar** that can browse workspace assets (Flows, Queries) and display the current session state (active Connections, Variables).
  - Implemented the **Inspector Sidebar** to display detailed metadata, inputs, and outputs for any selected block, enabling data lineage tracing.

- **Build & Packaging:**
  - Configured the project as a **Next.js** static export (`output: 'export'`) for maximum portability.
  - Integrated **Electron** and `electron-builder` to package the UI and the `cx-server` engine into a cross-platform desktop application.
  - Established a CI/CD workflow (`.github/workflows/release.yml`) for automatically building and archiving the static UI assets for releases.
