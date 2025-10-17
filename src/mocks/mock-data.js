// /home/dpwanjala/repositories/syncropel/studio/src/mocks/mock-data.js
//
// ========================================================================
//   Definitive, Comprehensive Mock Data Source for Syncropel Studio
// ========================================================================
//
// Protocol Version: SCP v2.0 / SEP v3.0
//
// This file is the single source of truth for all frontend development and
// testing. It provides a rich, exhaustive set of mock data that simulates
// the entire Syncropel backend, enabling rapid, iterative UI development.

// ========================================================================
//   SECTION 1: PAGE DEFINITIONS (`ContextualPage` Schemas)
// ========================================================================
// This section simulates the data sent in a `PAGE.LOADED` event. Each key
// represents a `page_id`, and its value is a full `ContextualPage` model.

export const MOCK_PAGES = {
  // ----------------------------------------------------------------------
  //   1.1. Simple Linear Notebook: `my-project/simple-report`
  //   - GOAL: Test basic rendering, parameter passing, and `inline_data`.
  // ----------------------------------------------------------------------
  "my-project/simple-report": {
    id: "my-project/simple-report",
    name: "Simple GitHub User Report",
    description: "Fetches a user profile from GitHub.",
    inputs: {
      username: {
        description: "The GitHub username to look up.",
        type: "string",
        required: true,
        default: "torvalds",
      },
    },
    blocks: [
      {
        id: "md_1_1_intro",
        engine: "markdown",
        content:
          "## GitHub User Report\n\nThis notebook fetches the public profile for a GitHub user. The current target is **{{ inputs.username }}**.",
        inputs: ["inputs.username"],
        outputs: [],
      },
      {
        id: "simple_report_fetch_user",
        engine: "run",
        name: "Fetch User Profile",
        connection_source: "user:github",
        content: `action: run_declarative_action\ntemplate_key: getUser\ncontext:\n  username: "{{ inputs.username }}"`,
        inputs: ["inputs.username"],
        outputs: ["user_data"],
      },
      {
        id: "md_1_1_summary",
        engine: "markdown",
        content:
          "### Summary\n\n- **Name**: {{ steps.simple_report_fetch_user.outputs.user_data.name }}\n- **Followers**: {{ steps.simple_report_fetch_user.outputs.user_data.followers }}",
        inputs: ["simple_report_fetch_user.user_data"],
        outputs: [],
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.2. Complex Data Transformation: `finance-project/monthly-billing`
  //   - GOAL: Test chained dependencies, large data, and the `data_ref`
  //           (Claim Check) pattern for tables and files.
  // ----------------------------------------------------------------------
  "finance-project/monthly-billing": {
    id: "finance-project/monthly-billing",
    name: "Monthly Billing Report",
    description:
      "A complex workflow that generates the monthly billing report for finance.",
    inputs: {
      start_date: {
        description: "Start of the billing period.",
        default: "2025-09-01",
      },
      end_date: {
        description: "End of the billing period.",
        default: "2025-10-01",
      },
    },
    blocks: [
      {
        id: "billing_report_get_transactions",
        engine: "sql",
        name: "Fetch Raw Transactions",
        connection_source: "user:prod-db",
        content:
          "SELECT * FROM transactions WHERE created_at BETWEEN '{{ inputs.start_date }}' AND '{{ inputs.end_date }}';",
        inputs: ["inputs.start_date", "inputs.end_date"],
        outputs: ["raw_transactions"],
      },
      {
        id: "billing_report_transform_data",
        engine: "transform",
        name: "Clean and Aggregate Data",
        inputs: ["billing_report_get_transactions.raw_transactions"],
        outputs: ["summary_data"],
        content: `
          - name: "Calculate Profit"
            engine: "pandas"
            operation:
              type: "add_column"
              column_name: "profit"
              expression: "revenue - cost"
        `,
      },
      {
        id: "billing_report_save_excel",
        engine: "artifact",
        name: "Save Full Report as Excel",
        inputs: ["billing_report_transform_data.summary_data"],
        content: `
          format: excel
          target_path: "./outputs/billing-report-{{ inputs.end_date }}.xlsx"
        `,
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.3. Interactive Management UI: `system/toolkit/workspace-manager`
  //   - GOAL: Test SDUI forms, buttons, and triggering `COMMAND.EXECUTE`
  //           messages for workspace management.
  // ----------------------------------------------------------------------
  "system/toolkit/workspace-manager": {
    id: "system/toolkit/workspace-manager",
    name: "Workspace Manager",
    description:
      "A notebook for managing workspace roots, connections, and secrets.",
    inputs: {},
    blocks: [
      {
        id: "md_1_3_intro",
        engine: "markdown",
        content:
          "## Workspace Root Management\n\nRegister your local project directories to make their assets (flows, queries) available to the `cx` shell and Studio.",
      },
      {
        id: "workspace_manager_list_roots",
        engine: "cx-action",
        name: "List Registered Roots",
        content: "workspace list",
        outputs: ["roots_list"],
      },
      {
        id: "workspace_manager_add_root_form",
        engine: "ui-component",
        name: "Add a New Root",
        content: `
          ui_component: "form"
          props:
            variable: "add_root_form"
            elements:
              - type: "text_input"
                label: "Absolute Path to Project"
                variable: "path"
                placeholder: "/home/user/dev/my-cx-project"
              - type: "button"
                label: "Add Workspace Root"
                onEvent:
                  click:
                    - type: "COMMAND.EXECUTE"
                      payload:
                        command_text: "workspace add {{ state.add_root_form.values.path }}"
        `,
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.4. Advanced UI Composition: `marketing/campaign-dashboard`
  //   - GOAL: Test SDUI `layout`, `card`, `chart`, and other composed
  //           visual components.
  // ----------------------------------------------------------------------
  "marketing/campaign-dashboard": {
    id: "marketing/campaign-dashboard",
    name: "Campaign Performance Dashboard",
    description: "A live dashboard for the Q4 marketing campaign.",
    blocks: [
      {
        id: "dashboard_get_kpis",
        engine: "sql",
        name: "Fetch Campaign KPIs",
        connection_source: "user:metrics-db",
        outputs: ["kpi_data"],
        content:
          "SELECT kpi, value, change FROM campaign_summary WHERE campaign_id = 'Q4_2025';",
      },
      {
        id: "dashboard_render_layout",
        engine: "ui-component",
        name: "Render Dashboard Layout",
        inputs: ["dashboard_get_kpis.kpi_data"],
        content: `
          ui_component: "layout"
          props:
            layout_type: "grid"
            columns: 3
            children:
              - span: 1
                component:
                  ui_component: "card"
                  props:
                    title: "Impressions"
                    metric: "{{ steps.dashboard_get_kpis.outputs.kpi_data | selectattr('kpi', '==', 'impressions') | map(attribute='value') | first }}"
              - span: 1
                component:
                  ui_component: "card"
                  props:
                    title: "Clicks"
                    metric: "{{ steps.dashboard_get_kpis.outputs.kpi_data | selectattr('kpi', '==', 'clicks') | map(attribute='value') | first }}"
              - span: 1
                component:
                  ui_component: "card"
                  props:
                    title: "Conversions"
                    metric: "{{ steps.dashboard_get_kpis.outputs.kpi_data | selectattr('kpi', '==', 'conversions') | map(attribute='value') | first }}"
        `,
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.5. Agentic Workflow: `agent-playground/spotify-onboarding`
  //   - GOAL: Test the `agent` engine, dynamic block injection, and the
  //           user-in-the-loop experience.
  // ----------------------------------------------------------------------
  "agent-playground/spotify-onboarding": {
    id: "agent-playground/spotify-onboarding",
    name: "Agentic Onboarding for Spotify",
    description: "A notebook demonstrating how the AI agent builds a workflow.",
    blocks: [
      {
        id: "agent_goal_form",
        engine: "ui-component",
        outputs: ["user_goal"],
        content: `
          ui_component: "form"
          props:
            elements:
              - type: "text_input"
                label: "High-Level Goal"
                variable: "goal"
                defaultValue: "Onboard the Spotify API, create a connection for it, and then find my top 5 most played tracks."
              - type: "button"
                label: "Engage Agent"
                onEvent:
                  click:
                    - type: "BLOCK.RUN"
                      payload: { targetBlockId: "engage_agent" }
        `,
      },
      {
        id: "engage_agent",
        engine: "agent",
        if: false, // Only run when triggered by the button
        inputs: ["agent_goal_form.goal"],
        content: `
          mode: "notebook_author"
          target: "self.below"
        `,
      },
      {
        id: "agent_canvas",
        engine: "ui-component",
        content: `
          ui_component: "DynamicCanvas"
          props:
            placeholder: "The agent's generated notebook will appear here..."
        `,
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.6. Error Handling & Conditionals: `data-quality/validation-pipeline`
  //   - GOAL: Test UI rendering for failed blocks and `if` conditions.
  // ----------------------------------------------------------------------
  "data-quality/validation-pipeline": {
    id: "data-quality/validation-pipeline",
    name: "Data Validation Pipeline",
    description:
      "A notebook demonstrating error states and conditional execution.",
    blocks: [
      {
        id: "dq_check_source_data",
        engine: "sql",
        name: "Check for Nulls in Source",
        connection_source: "user:prod-db",
        outputs: ["null_count"],
        content:
          "SELECT COUNT(*) as null_count FROM users WHERE email IS NULL;",
      },
      {
        id: "dq_block_that_fails",
        engine: "sql",
        name: "Intentionally Failing Block",
        connection_source: "user:prod-db",
        if: "{{ steps.dq_check_source_data.outputs.null_count[0].null_count > 0 }}", // This will be true
        content: "SELECT * FROM a_table_that_does_not_exist;",
      },
      {
        id: "dq_block_that_is_skipped",
        engine: "markdown",
        name: "Skipped Block",
        if: false,
        content:
          "This block should appear as 'Skipped' because its `if` condition is false.",
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   1.7. Custom Component Extensibility: `jira-project/sprint-dashboard`
  //   - GOAL: Test the end-to-end flow for a custom, interactive UI component.
  // ----------------------------------------------------------------------
  "jira-project/sprint-dashboard": {
    id: "jira-project/sprint-dashboard",
    name: "Sprint Planning Dashboard",
    description: "An interactive Kanban board for managing a Jira sprint.",
    blocks: [
      {
        id: "jira_dashboard_fetch_issues",
        engine: "run",
        name: "Fetch Sprint Issues",
        connection_source: "user:jira-main",
        outputs: ["issue_data"],
        content: `
          action: run_declarative_action
          template_key: searchIssues
          context:
            jql: "project = 'PROJ' AND sprint in openSprints()"
        `,
      },
      {
        id: "jira_dashboard_render_kanban",
        engine: "custom-component",
        name: "Render Kanban Board",
        inputs: ["jira_dashboard_fetch_issues.issue_data"],
        content: `
          # This name is a namespace for the plugin and the component name
          component_name: "jira-tools:KanbanBoard"
          # These props are passed to the React component
          props:
            initialIssues: "{{ steps.jira_dashboard_fetch_issues.outputs.issue_data }}"
            boardColumns: ["To Do", "In Progress", "Done"]
            onEvent:
              cardDragEnd:
                action: "UI.EVENT.TRIGGER"
                payload:
                  source_component_id: "jira_dashboard_render_kanban"
                  event_name: "card_dragged"
                  event_data: "event.data"
        `,
      },
      {
        id: "jira_dashboard_update_issue_status",
        engine: "run",
        name: "Handle Card Drag Event",
        if: false, // This is a hidden handler block
        connection_source: "user:jira-main",
        content: `
          action: run_declarative_action
          template_key: transitionIssue
          context:
            issueIdOrKey: "{{ inputs.cardId }}"
            transition:
              id: "{{ inputs.newColumn }}"
        `,
      },
    ],
  },
  // ----------------------------------------------------------------------
  //   1.8. Image Output: `my-project/image-test`
  //   - GOAL: Test the SDUI `image` component renderer.
  // ----------------------------------------------------------------------
  "my-project/image-test": {
    id: "my-project/image-test",
    name: "Image Renderer Test",
    description: "A simple page to test the image output component.",
    inputs: {},
    blocks: [
      {
        id: "image_test_generate_chart",
        engine: "python",
        name: "Generate Sales Chart",
        outputs: ["chart_image"],
        content: `
    # This is mock Python code
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots()
    ax.plot([1, 2, 3, 4], [10, 20, 25, 30])
    plt.savefig("sales_chart.png")
    print('{"artifact": "sales_chart.png"}')
    `,
      },
    ],
  },
};

// ========================================================================
//   SECTION 2: DATA PLANE ARTIFACTS (The Claim Check Payloads)
// ========================================================================
// This simulates the content-addressable artifact store. The keys MUST match
// the `artifact_id`s from the `data_ref` objects in Section 2.

export const MOCK_ARTIFACT_CONTENT = {
  // ----------------------------------------------------------------------
  //   3.2. Artifact for `finance-project/monthly-billing`
  //   - Corresponds to the `billing_report_get_transactions` block output.
  // ----------------------------------------------------------------------
  "sha256:billing-transactions-large-table": {
    contentType: "application/json",
    // This is a large array of objects that the UI will paginate.
    content: Array.from({ length: 5000 }, (_, i) => ({
      transaction_id: `txn_${1000 + i}`,
      customer_id: `cust_${100 + (i % 50)}`,
      amount: parseFloat((Math.random() * 500).toFixed(2)),
      timestamp: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: i % 10 === 0 ? "REFUNDED" : "COMPLETED",
    })),
  },

  // ----------------------------------------------------------------------
  //   3.2. Artifact for `finance-project/monthly-billing` (continued)
  //   - Corresponds to the `billing_report_save_excel` block output.
  // ----------------------------------------------------------------------
  "sha256:billing-report-excel-file": {
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // In a real mock server, we'd serve a small, real .xlsx file.
    // For a JS mock, a message is sufficient to test the download trigger.
    content: "This is a mock Excel file binary blob.",
  },

  // ----------------------------------------------------------------------
  //   3.7. Artifact for `jira-project/sprint-dashboard`
  //   - Corresponds to the `jira_dashboard_fetch_issues` block output.
  // ----------------------------------------------------------------------
  "sha256:jira-sprint-issues-data": {
    contentType: "application/json",
    // A realistic list of Jira issue objects.
    content: [
      {
        id: "PROJ-101",
        title: "Implement user authentication",
        status: "Done",
        assignee: "Alice",
        points: 8,
      },
      {
        id: "PROJ-102",
        title: "Design the new dashboard UI",
        status: "In Progress",
        assignee: "Bob",
        points: 5,
      },
      {
        id: "PROJ-103",
        title: "Set up the CI/CD pipeline",
        status: "In Progress",
        assignee: "Bob",
        points: 8,
      },
      {
        id: "PROJ-104",
        title: "Write API documentation",
        status: "To Do",
        assignee: "Charlie",
        points: 3,
      },
      {
        id: "PROJ-105",
        title: "Fix bug in the reporting module",
        status: "To Do",
        assignee: null,
        points: 5,
      },
    ],
  },
};

// ========================================================================
//   SECTION 2: BLOCK OUTPUTS (`BlockOutput` Hybrid Claim Check Schema)
// ========================================================================
// This section simulates the `output` field from a `BLOCK.OUTPUT` event.
// It maps a block's `id` to its corresponding `BlockOutput` payload.

export const MOCK_BLOCK_OUTPUTS = {
  // ----------------------------------------------------------------------
  //   2.1. Outputs for `my-project/simple-report`
  // ----------------------------------------------------------------------
  simple_report_fetch_user: {
    // This is a small JSON object, so we use `inline_data`.
    // The server wraps the raw API response in an SDUI "json" component schema.
    inline_data: {
      ui_component: "json",
      props: {
        data: {
          id: 9135,
          login: "torvalds",
          name: "Linus Torvalds",
          company: "Linux Foundation",
          followers: 198000,
        },
      },
    },
  },

  // ----------------------------------------------------------------------
  //   2.2. Outputs for `finance-project/monthly-billing`
  // ----------------------------------------------------------------------
  billing_report_get_transactions: {
    // This result is a large table, so we use `data_ref` (the Claim Check).
    data_ref: {
      artifact_id: "sha256:billing-transactions-large-table",
      renderer_hint: "table",
      metadata: {
        record_count: 5000,
        columns: ["transaction_id", "customer_id", "amount", "timestamp"],
      },
      // The mock server will intercept this URL.
      access_url:
        "/artifacts/sha256:billing-transactions-large-table?token=mock-jwt",
    },
  },
  billing_report_save_excel: {
    // The `artifact` engine also produces a `data_ref` to the created file.
    data_ref: {
      artifact_id: "sha256:billing-report-excel-file",
      renderer_hint: "file", // A hint for a file download/link component
      metadata: {
        file_name: "billing-report-2025-10-01.xlsx",
        file_size_bytes: 123456,
      },
      access_url: "/artifacts/sha256:billing-report-excel-file?token=mock-jwt",
    },
  },

  // ----------------------------------------------------------------------
  //   2.3. Outputs for `system/toolkit/workspace-manager`
  // ----------------------------------------------------------------------
  workspace_manager_list_roots: {
    // A small table result, perfect for `inline_data`.
    inline_data: {
      ui_component: "table",
      props: {
        data: [
          { Path: "~/.cx", Status: "✅ Found" },
          {
            Path: "~/dev/projects/finance-project",
            Status: "✅ Found",
          },
          {
            Path: "~/dev/projects/old-project",
            Status: "❌ Not Found",
          },
        ],
      },
    },
  },

  // ----------------------------------------------------------------------
  //   2.4. Outputs for `marketing/campaign-dashboard`
  // ----------------------------------------------------------------------
  dashboard_get_kpis: {
    // The raw data from the SQL query.
    inline_data: {
      ui_component: "json", // The UI doesn't render this directly.
      props: {
        data: [
          { kpi: "impressions", value: "1.2M", change: "+5%" },
          { kpi: "clicks", value: "8,432", change: "+12%" },
          { kpi: "conversions", value: "971", change: "-2%" },
        ],
      },
    },
  },

  // ----------------------------------------------------------------------
  //   2.7. Outputs for `jira-project/sprint-dashboard`
  // ----------------------------------------------------------------------
  jira_dashboard_fetch_issues: {
    // A list of issue objects. We'll use a `data_ref` as it could be large.
    data_ref: {
      artifact_id: "sha256:jira-sprint-issues-data",
      renderer_hint: "json", // This data is for props, not direct rendering.
      metadata: {
        record_count: 5,
      },
      access_url: "/artifacts/sha256:jira-sprint-issues-data?token=mock-jwt",
    },
  },
  jira_dashboard_render_kanban: {
    // The `custom-component` engine's job is to produce this SDUI payload.
    // The server has done its job; it's now up to the client to find and render
    // the "jira-tools:KanbanBoard" component using this data.
    inline_data: {
      ui_component: "jira-tools:KanbanBoard",
      props: {
        // The server would have used Jinja to inject the real data here.
        // We are mocking the final, rendered result.
        initialIssues:
          MOCK_ARTIFACT_CONTENT["sha256:jira-sprint-issues-data"].content,
        boardColumns: ["To Do", "In Progress", "Done"],
        onEvent: {
          cardDragEnd: {
            action: "UI.EVENT.TRIGGER",
            payload: {
              source_component_id: "jira_dashboard_render_kanban",
              event_name: "card_dragged",
              event_data: "event.data", // Client-side expression
            },
          },
        },
      },
    },
  },
  // ----------------------------------------------------------------------
  //   2.8. Output for `my-project/image-test`
  // ----------------------------------------------------------------------
  image_test_generate_chart: {
    inline_data: {
      ui_component: "image",
      props: {
        src: "https://via.placeholder.com/600x300.png?text=Sales+Trend+Chart",
        alt: "A line chart showing an upward sales trend.",
      },
    },
  },
  dq_check_source_data: {
    inline_data: {
      ui_component: "table",
      props: {
        data: [{ null_count: 15 }], // Simulate finding 15 users with null emails
      },
    },
  },
};

// ========================================================================
//   SECTION 4: WORKSPACE & SESSION STATE
// ========================================================================
// This data populates the non-notebook specific parts of the UI, typically
// sent in `WORKSPACE.BROWSE_RESULT` and `SESSION.LOADED` events.

export const MOCK_WORKSPACE_DATA = {
  // ----------------------------------------------------------------------
  //   4.1. Hierarchical file tree for the Navigator panel.
  //   - Simulates the response to `WORKSPACE.BROWSE` commands.
  //   - The key is the path, and the value is the list of its children.
  // ----------------------------------------------------------------------
  "/": {
    projects: [
      {
        key: "my-project",
        title: "my-project",
        isLeaf: false,
        type: "project",
      },
      {
        key: "finance-project",
        title: "finance-project",
        isLeaf: false,
        type: "project",
      },
      {
        key: "data-quality",
        title: "data-quality",
        isLeaf: false,
        type: "project",
      },
      {
        key: "jira-project",
        title: "jira-project",
        isLeaf: false,
        type: "project",
      },
    ],
    library: [
      {
        key: "library/apps",
        title: "Applications",
        isLeaf: false,
        type: "group",
      },
    ],
  },
  "my-project": [
    {
      key: "my-project/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "my-project/flows": [
    {
      key: "my-project/simple-report",
      title: "simple-report.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
  "finance-project": [
    {
      key: "finance-project/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
    {
      key: "finance-project/queries",
      title: "Queries",
      isLeaf: false,
      type: "group",
    },
  ],
  "finance-project/flows": [
    {
      key: "finance-project/monthly-billing",
      title: "monthly-billing.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
  "data-quality": [
    {
      key: "data-quality/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "data-quality/flows": [
    {
      key: "data-quality/validation-pipeline",
      title: "validation-pipeline.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
  "jira-project": [
    {
      key: "jira-project/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "jira-project/flows": [
    {
      key: "jira-project/sprint-dashboard",
      title: "sprint-dashboard.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
  "library/apps": [
    {
      key: "library/apps/system-toolkit",
      title: "system-toolkit",
      isLeaf: false,
      type: "application",
    },
    {
      key: "library/apps/jira-tools",
      title: "jira-tools",
      isLeaf: false,
      type: "application",
    },
  ],
  "library/apps/system-toolkit": [
    {
      key: "library/apps/system-toolkit/notebooks",
      title: "Notebooks",
      isLeaf: false,
      type: "group",
    },
  ],
  "library/apps/system-toolkit/notebooks": [
    {
      key: "system/toolkit/workspace-manager",
      title: "workspace-manager.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
};

export const MOCK_SESSION_STATE = {
  // ----------------------------------------------------------------------
  //   4.2. Live session state for the Navigator panel.
  //   - Simulates the `new_session_state` payload in `SESSION.LOADED`
  //     and `COMMAND.RESULT` events.
  // ----------------------------------------------------------------------
  connections: [
    { alias: "prod-db", source: "user:postgres-prod-us-east-1" },
    { alias: "metrics-db", source: "user:clickhouse-analytics" },
    { alias: "jira-main", source: "user:jira-acme-corp" },
    { alias: "github", source: "user:github-public" },
  ],
  variables: [
    {
      name: "current_sprint_id",
      type: "str",
      preview: "'SPRINT-42'",
    },
    {
      name: "user_list",
      type: "list",
      preview: "[{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]",
    },
  ],
};

// ========================================================================
//   SECTION 4.2: HOMEPAGE / SPOTLIGHT DATA
// ========================================================================
// This simulates the data sent in a `HOMEPAGE_DATA_RESULT` event. It powers
// the "Mission Control" view and the Ctrl+K Spotlight search. Each item
// is an `HomepageItem` object with a declarative `action` payload.

export const MOCK_HOMEPAGE_DATA = {
  // --- "Continue" Tab: Recently accessed files ---
  recent_files: [
    {
      id: "finance-project/monthly-billing",
      type: "flow",
      title: "monthly-billing.cx.md",
      description: "in finance-project",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      icon: "IconFileCode",
      action: {
        type: "open_page",
        // The payload contains the page_id that the UI will send in the next command
        payload: { page_id: "finance-project/monthly-billing" },
      },
    },
    {
      id: "my-project/simple-report",
      type: "page",
      title: "simple-report.cx.md",
      description: "in my-project",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
      icon: "IconFileCode",
      action: {
        type: "open_page",
        payload: { page_id: "my-project/simple-report" },
      },
    },
  ],

  // --- "Pinned" Tab: User-bookmarked items for quick access ---
  pinned_items: [
    {
      id: "run-monthly-sales",
      type: "command",
      title: "Run Monthly Sales Report",
      description: "Flow",
      icon: "IconPlayerPlay",
      action: {
        type: "run_command",
        payload: { command_text: "flow run shared/generate-monthly-sales" },
      },
    },
    {
      id: "conn-prod-db",
      type: "connection",
      title: "prod-db",
      description: "Connection",
      icon: "IconDatabase",
      action: {
        type: "open_connection_editor",
        payload: { connection_id: "prod-db" },
      },
    },
  ],

  // --- "Discover" Tab: Tips, tutorials, and feature announcements ---
  discover_items: [
    {
      id: "discover-pdf",
      type: "tip",
      title: "New in v0.8.0: Publish to PDF!",
      description: "Learn how to export your reports.",
      icon: "IconBulb",
      action: {
        type: "open_external_url",
        payload: { url: "https://syncropel.com/docs/features/publishing" },
      },
    },
    {
      id: "discover-agent",
      type: "tip",
      title: "Meet Syncro, your AI assistant",
      description: "Type '//' to translate natural language to commands.",
      icon: "IconSparkles",
      action: {
        type: "open_external_url",
        payload: { url: "https://syncropel.com/docs/features/agent" },
      },
    },
  ],
};

// ========================================================================
//   SECTION 5: HISTORY & AUDIT (For the Activity Hub)
// ========================================================================

export const MOCK_RUN_HISTORY = [
  // ----------------------------------------------------------------------
  //   5.1. List of recent runs for the Activity Hub overview.
  //   - Simulates the response to a `GET_RUN_HISTORY` command.
  // ----------------------------------------------------------------------
  {
    run_id: "run-abc-123",
    flow_id: "finance-project/monthly-billing",
    status: "✅ Completed",
    timestamp_utc: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    parameters: {
      start_date: "2025-09-01",
      end_date: "2025-10-01",
    },
  },
  {
    run_id: "run-def-456",
    flow_id: "data-quality/validation-pipeline",
    status: "❌ Failed",
    timestamp_utc: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    parameters: {},
  },
  {
    run_id: "run-ghi-789",
    flow_id: "my-project/simple-report",
    status: "✅ Completed",
    timestamp_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    parameters: {
      username: "syncropel",
    },
  },
  {
    run_id: "run-jkl-012",
    flow_id: "marketing/campaign-dashboard",
    status: "✅ Completed",
    timestamp_utc: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    parameters: {},
  },
];

export const MOCK_RUN_DETAILS = {
  // ----------------------------------------------------------------------
  //   5.2. Detailed manifest for a specific run drill-down.
  //   - Simulates the response to a `GET_RUN_DETAIL` command.
  // ----------------------------------------------------------------------

  // --- Details for a successful, complex run ---
  "run-abc-123": {
    run_id: "run-abc-123",
    flow_id: "finance-project/monthly-billing",
    status: "completed",
    timestamp_utc: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    parameters: {
      start_date: "2025-09-01",
      end_date: "2025-10-01",
    },
    steps: [
      {
        step_id: "billing_report_get_transactions",
        status: "completed",
        summary: "Completed successfully.",
        cache_hit: true, // Simulate a cache hit for speed
      },
      {
        step_id: "billing_report_transform_data",
        status: "completed",
        summary: "Completed successfully.",
        cache_hit: false,
      },
      {
        step_id: "billing_report_save_excel",
        status: "completed",
        summary: "Completed successfully.",
        cache_hit: false,
      },
    ],
    artifacts: {
      "billing-report-2025-10-01.xlsx": {
        content_hash: "sha256:billing-report-excel-file",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 123456,
      },
    },
  },

  // --- Details for a failed run ---
  "run-def-456": {
    run_id: "run-def-456",
    flow_id: "data-quality/validation-pipeline",
    status: "failed",
    timestamp_utc: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    parameters: {},
    steps: [
      {
        step_id: "dq_check_source_data",
        status: "completed",
        summary: "Completed successfully.",
        cache_hit: false,
      },
      {
        step_id: "dq_block_that_fails",
        status: "failed",
        summary:
          "PostgresError: relation 'a_table_that_does_not_exist' does not exist",
        cache_hit: false,
      },
      {
        // This step was never reached
        step_id: "dq_block_that_is_skipped",
        status: "pending",
        summary: "Not executed due to previous failure.",
        cache_hit: false,
      },
    ],
    artifacts: {},
  },
};

// ========================================================================
//   SECTION 6: SIMULATED SERVER RESPONSES
// ========================================================================
// This simulates the server's stateful responses to "write" actions and
// custom UI events, enabling the mock server to feel interactive. The key
// is the command that triggers the response flow.

export const MOCK_COMMAND_RESPONSES = {
  // ----------------------------------------------------------------------
  //   6.3. Response to a management command from `workspace-manager` notebook
  //   - Simulates the user clicking the "Add Workspace Root" button.
  // ----------------------------------------------------------------------
  "COMMAND.EXECUTE:workspace add /home/user/new-project": {
    // A `responseFlow` is an array of events to be sent back in sequence.
    responseFlow: [
      {
        // First, the server immediately sends a log event to confirm receipt.
        delay: 50, // in milliseconds
        event: {
          type: "EVENT.LOG",
          payload: {
            level: "info",
            message: "Command 'workspace add' received and is being processed.",
            labels: { component: "CommandExecutor" },
          },
        },
      },
      {
        // After a short delay, it sends a final success result for the command.
        delay: 400,
        event: {
          type: "COMMAND.RESULT",
          payload: {
            level: "info",
            message: "Command executed successfully.",
            fields: {
              result:
                "✅ Added '[cyan]/home/user/new-project[/cyan]' to your workspace.",
              // The server would also send an updated session state if anything changed.
              new_session_state: MOCK_SESSION_STATE,
            },
          },
        },
      },
      {
        // Critically, after adding a workspace, the server should proactively
        // send an updated workspace tree so the UI navigator refreshes.
        delay: 500,
        event: {
          type: "WORKSPACE.BROWSE_RESULT",
          payload: {
            level: "info",
            message: "Workspace tree updated.",
            fields: {
              path: "/",
              // This would be the new, updated MOCK_WORKSPACE_DATA object
              data: {
                projects: [
                  ...MOCK_WORKSPACE_DATA["/"].projects,
                  {
                    key: "new-project",
                    title: "new-project",
                    isLeaf: false,
                    type: "project",
                  },
                ],
                library: MOCK_WORKSPACE_DATA["/"].library,
              },
            },
          },
        },
      },
    ],
  },

  // ----------------------------------------------------------------------
  //   6.7. Response to a custom UI event from the `sprint-dashboard`
  //   - Simulates the user dragging a card on the Kanban board.
  // ----------------------------------------------------------------------
  "UI.EVENT.TRIGGER:card_dragged": {
    responseFlow: [
      {
        delay: 50,
        event: {
          type: "EVENT.LOG",
          payload: {
            level: "info",
            message:
              "Received 'card_dragged' event from Kanban board. Triggering handler block 'jira_dashboard_update_issue_status'.",
            labels: { component: "WebSocketDispatcher" },
          },
        },
      },
      {
        // Then, it sends the "running" status for the handler block that was triggered.
        delay: 100,
        event: {
          type: "BLOCK.STATUS",
          source: "/blocks/jira_dashboard_update_issue_status",
          payload: {
            level: "info",
            message:
              "Block 'jira_dashboard_update_issue_status' status: running",
            fields: {
              block_id: "jira_dashboard_update_issue_status",
              status: "running",
            },
          },
        },
      },
      {
        // Finally, after a simulated network delay, it sends the success event for the handler.
        delay: 1200,
        event: {
          type: "BLOCK.OUTPUT",
          source: "/blocks/jira_dashboard_update_issue_status",
          payload: {
            level: "info",
            message:
              "Block 'jira_dashboard_update_issue_status' completed successfully.",
            fields: {
              block_id: "jira_dashboard_update_issue_status",
              status: "success",
              duration_ms: 1100,
              output: {
                inline_data: {
                  ui_component: "text", // The result could be a simple confirmation toast
                  props: {
                    content:
                      "✅ Successfully updated issue 'PROJ-102' to 'Done' in Jira.",
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};

// ========================================================================
//   SECTION 7: MOCK APPLICATION PLUGIN REGISTRY
// ========================================================================
// This simulates the response from the `GET /plugins/registry` endpoint.
// It acts as the "address book" for the DynamicUIRenderer, telling it where
// to find the code for custom components.

export const MOCK_APPLICATION_PLUGINS = {
  // --- The key 'jira-tools' matches the application namespace ---
  "jira-tools": {
    // In a real scenario, this would be a URL to a remoteEntry.js file.
    // In our mock, this value is conceptual and not directly used.
    remoteEntryUrl: "/_next/static/chunks/jira-tools.js",

    // This maps the exposed component name to its local mock path.
    // This is the key piece our mock loader will use.
    exposes: {
      KanbanBoard: "@/mocks/plugins/jira-tools/KanbanBoard",
    },
  },

  // --- Example of another potential UI plugin for the future ---
  "my-charts": {
    remoteEntryUrl: "/_next/static/chunks/my-charts.js",
    exposes: {
      PieChart: "@/mocks/plugins/my-charts/PieChart",
    },
  },
};

// ========================================================================
//   SECTION 8: BLOCK ERROR PAYLOADS (`BlockErrorFields` Schema)
// ========================================================================
// This simulates the `fields` object from a `BLOCK.ERROR` event. It allows
// us to test how the UI renders failures.

export const MOCK_BLOCK_ERRORS = {
  // Corresponds to the failing block in the `data-quality/validation-pipeline` notebook
  dq_block_that_fails: {
    block_id: "dq_block_that_fails",
    status: "error",
    duration_ms: 75,
    error: {
      message:
        "PostgresError: relation 'a_table_that_does_not_exist' does not exist",
      traceback: `Traceback (most recent call last):
  File "/path/to/cx-shell/src/cx_shell/engine/connector/engine.py", line 150, in _execute_step
    result = await strategy.run_sql_query(
  ...
psycopg2.errors.UndefinedTable: relation "a_table_that_does_not_exist" does not exist
LINE 1: SELECT * FROM a_table_that_does_not_exist;`,
    },
  },
};
