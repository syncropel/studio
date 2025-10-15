// /home/dpwanjala/repositories/syncropel/studio/src/mocks/mock-data.js

// A realistic mock of a .cx.md file, parsed into a plain JavaScript object.
export const MOCK_GITHUB_PAGE = {
  id: "local-project/github-user-report",
  name: "GitHub User Report",
  description: "Fetches a user profile and their repositories from GitHub.",
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
      id: "intro-text",
      engine: "markdown",
      content:
        "## GitHub User Analysis\n\nThis report analyzes the public activity of a GitHub user. Use the parameters form to specify a user.",
      inputs: [],
      outputs: [],
    },
    {
      id: "fetch_user_profile",
      engine: "run",
      content: `
action: run_declarative_action
template_key: usersGetByUsername
context:
  username: "{{ parameters.username }}"
      `,
      run: {
        action: "run_declarative_action",
        template_key: "usersGetByUsername",
        context: {
          username: "{{ parameters.username }}",
        },
      },
      inputs: [],
      outputs: ["user_data"],
    },
    {
      id: "save_user_profile_as_json",
      engine: "publish",
      name: "Save profile as JSON artifact",
      content: `
action: write_files
files:
  - path: "github-{{ parameters.username }}.json"
    content: "{{ fetch_user_profile.user_data }}"
      `,
      inputs: ["fetch_user_profile.user_data"],
      outputs: [], // Publish steps often have no data outputs, only artifact outputs
    },
    {
      id: "display_profile",
      engine: "markdown",
      content:
        "### User Profile\n\n**Name**: {{ fetch_user_profile.user_data.name }}\n\n**Followers**: {{ fetch_user_profile.user_data.followers }}",
      inputs: ["fetch_user_profile.user_data"],
      outputs: [],
    },
  ],
};

// Mock results for when a block is "run"
export const MOCK_BLOCK_RESULTS = {
  fetch_user_profile: {
    id: 9135,
    login: "torvalds",
    name: "Linus Torvalds",
    company: "Linux Foundation",
    location: "Portland, OR",
    followers: 198000,
    following: 0,
    created_at: "2008-05-01T21:38:33Z",
  },
  save_user_profile_as_json: {
    // This payload is sent when the block finishes running
    run_id: "mock-run-12345",
    artifact: {
      name: "github-torvalds.json",
      size_bytes: 1234,
    },
  },
};

export const MOCK_FLOWS = [
  {
    Name: "local-project/github-user-report",
    Description: "Fetches user data from GitHub.",
  },
  {
    Name: "shared/generate-monthly-sales",
    Description: "Generates the monthly sales report.",
  },
  {
    Name: "data-quality/validate-customer-data",
    Description: "Runs DQ checks on the customer table.",
  },
];

export const MOCK_QUERIES = [
  { Name: "get_all_users" },
  { Name: "get_active_subscriptions" },
  { Name: "get_failed_transactions" },
];

export const MOCK_WORKSPACE = {
  "/": [
    {
      name: "finance-project",
      path: "finance-project",
      isLeaf: false,
      type: "project",
    },
    {
      name: "marketing-project",
      path: "marketing-project",
      isLeaf: false,
      type: "project",
    },
  ],
  "finance-project": [
    {
      name: "Flows",
      path: "finance-project/flows",
      isLeaf: false,
      type: "group",
    },
    {
      name: "Queries",
      path: "finance-project/queries",
      isLeaf: false,
      type: "group",
    },
  ],
  "finance-project/flows": [
    {
      name: "monthly-billing",
      path: "finance-project/flows/monthly-billing",
      isLeaf: true,
      type: "flow",
    },
    {
      name: "quarterly-forecast",
      path: "finance-project/flows/quarterly-forecast",
      isLeaf: true,
      type: "flow",
    },
  ],
  "finance-project/queries": [
    {
      name: "get-transactions",
      path: "finance-project/queries/get-transactions",
      isLeaf: true,
      type: "query",
    },
  ],
  "marketing-project": [
    {
      name: "Flows",
      path: "marketing-project/flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "marketing-project/flows": [
    {
      name: "campaign-report",
      path: "marketing-project/flows/campaign-report",
      isLeaf: true,
      type: "flow",
    },
  ],
};

export const MOCK_HOMEPAGE_DATA = {
  recent_files: [
    {
      id: "finance-project/flows/monthly-billing.cx.md",
      type: "flow",
      title: "monthly-billing.cx.md",
      description: "in finance-project",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      icon: "IconFileCode",
      action: {
        type: "open_page",
        payload: { path: "finance-project/flows/monthly-billing.cx.md" },
      },
    },
    {
      id: "my-first-project/github-user-report.cx.md",
      type: "page",
      title: "github-user-report.cx.md",
      description: "in my-first-project",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
      icon: "IconFileCode",
      action: {
        type: "open_page",
        payload: { path: "my-first-project/github-user-report.cx.md" },
      },
    },
  ],
  pinned_items: [
    {
      id: "run-monthly-sales",
      type: "command",
      title: "Run Monthly Sales Report",
      description: "Flow",
      icon: "IconPlayerPlay",
      action: {
        type: "run_command",
        payload: { command: "flow run shared/generate-monthly-sales" },
      },
    },
    {
      id: "conn-prod-db",
      type: "connection",
      title: "prod-db",
      description: "Connection",
      icon: "IconDatabase",
      action: { type: "open_connection_editor", payload: { path: "prod-db" } },
    },
  ],
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
  ],
};

// A hierarchical map where keys are paths and values are their children.
export const MOCK_WORKSPACE_DATA = {
  // --- The special root object ---
  "/": {
    projects: [
      {
        key: "finance-project",
        title: "finance-project",
        isLeaf: false,
        type: "project",
      },
      {
        key: "marketing-project",
        title: "marketing-project",
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
      {
        key: "library/system-flows",
        title: "System Flows",
        isLeaf: false,
        type: "group",
      },
    ],
  },

  // --- User Projects ---
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
      key: "finance-project/flows/monthly-billing.cx.md",
      title: "monthly-billing.cx.md",
      isLeaf: true,
      type: "flow",
    },
    {
      key: "finance-project/flows/quarterly-forecast.cx.md",
      title: "quarterly-forecast.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],
  "finance-project/queries": [
    {
      key: "finance-project/queries/get-transactions.sql",
      title: "get-transactions.sql",
      isLeaf: true,
      type: "query",
    },
  ],

  "marketing-project": [
    {
      key: "marketing-project/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "marketing-project/flows": [
    {
      key: "marketing-project/flows/campaign-report.cx.md",
      title: "campaign-report.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],

  // --- Library Assets ---
  "library/apps": [
    {
      key: "library/apps/github-manager",
      title: "github-manager",
      isLeaf: false,
      type: "application",
    },
    {
      key: "library/apps/stripe-reports",
      title: "stripe-reports",
      isLeaf: false,
      type: "application",
    },
  ],
  "library/apps/github-manager": [
    {
      key: "library/apps/github-manager/flows",
      title: "Flows",
      isLeaf: false,
      type: "group",
    },
  ],
  "library/apps/github-manager/flows": [
    {
      key: "library/apps/github-manager/flows/list-issues.cx.md",
      title: "list-issues.cx.md",
      isLeaf: true,
      type: "flow",
    },
  ],

  "library/system-flows": [
    {
      key: "library/system-flows/get-db-details.flow.yaml",
      title: "get-db-details.flow.yaml",
      isLeaf: true,
      type: "flow",
    },
  ],
};

export const MOCK_RUN_HISTORY = [
  {
    run_id: "run-20251015-ABCDEFG",
    flow_id: "finance-project/monthly-report",
    status: "✅ Success",
    timestamp_utc: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    parameters: { month: "2025-09" },
  },
  {
    run_id: "run-20251015-HIJKLMN",
    flow_id: "github-user-report",
    status: "❌ Failed",
    timestamp_utc: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    parameters: { username: "invalid-user-!@#" },
  },
  {
    run_id: "run-20251014-OPQRSTU",
    flow_id: "marketing-project/campaign-report",
    status: "✅ Success",
    timestamp_utc: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    parameters: { campaign_id: "fall-2025" },
  },
];

export const MOCK_RUN_DETAILS = {
  "run-20251015-ABCDEFG": {
    run_id: "run-20251015-ABCDEFG",
    flow_id: "finance-project/monthly-report",
    status: "✅ Success",
    timestamp_utc: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    parameters: { month: "2025-09" },
    steps: [
      {
        id: "get_transactions",
        status: "✅ Success",
        duration_ms: 150.0,
        cache_hit: true,
      },
      {
        id: "process_data",
        status: "✅ Success",
        duration_ms: 3200.0,
        cache_hit: false,
      },
      {
        id: "generate_report",
        status: "✅ Success",
        duration_ms: 1100.0,
        cache_hit: false,
      },
    ],
    artifacts: [
      { name: "report.xlsx", size_bytes: 124500 },
      { name: "sales_chart.png", size_bytes: 78340 },
    ],
  },
  // Add another for the failed run
  "run-20251015-HIJKLMN": {
    run_id: "run-20251015-HIJKLMN",
    flow_id: "github-user-report",
    status: "❌ Failed",
    timestamp_utc: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    parameters: { username: "invalid-user-!@#" },
    steps: [
      {
        id: "fetch_user_profile",
        status: "❌ Failed",
        duration_ms: 500.0,
        cache_hit: false,
      },
    ],
    artifacts: [],
  },
};

export const MOCK_ARTIFACT_CONTENT = {
  "run-20251015-ABCDEFG-report.xlsx": {
    type: "table",
    content: [
      { id: 1, product: "Widget A", region: "North", sales: 1500 },
      { id: 2, product: "Widget B", region: "South", sales: 2500 },
      { id: 3, product: "Widget A", region: "North", sales: 1200 },
    ],
  },
  "run-20251015-ABCDEFG-sales_chart.png": {
    type: "image",
    // In a real app this would be a URL, for mock we can use a placeholder
    content: "https://via.placeholder.com/400x300.png?text=Sales+Chart",
  },
  // The key here MUST match what the UI will request: `${run_id}-${artifact_name}`
  "mock-run-12345-github-torvalds.json": {
    type: "json", // Use 'json' type for our JSON viewer
    // We can just reuse the data from the previous block for the content
    content: MOCK_BLOCK_RESULTS.fetch_user_profile,
  },
};
