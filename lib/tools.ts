export const widgetTools = [
  {
    type: "function" as const,
    function: {
      name: "show_bar_chart",
      description:
        "Display a bar chart to visualize categorical comparisons. Use when comparing discrete categories like countries, products, or groups.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chart title" },
          xLabel: { type: "string", description: "X-axis label" },
          yLabel: { type: "string", description: "Y-axis label" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
              },
              required: ["name", "value"],
            },
            description: "Array of {name, value} data points",
          },
        },
        required: ["data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_line_chart",
      description:
        "Display a line chart to visualize trends over time or continuous data sequences.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chart title" },
          xLabel: { type: "string", description: "X-axis label" },
          yLabel: { type: "string", description: "Y-axis label" },
          data: {
            type: "array",
            items: { type: "object" },
            description:
              "Array of data points. Each must have a 'name' field (x-axis) plus one or more numeric series fields.",
          },
          keys: {
            type: "array",
            items: { type: "string" },
            description: "Names of the numeric series fields in data",
          },
        },
        required: ["data", "keys"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_pie_chart",
      description:
        "Display a pie chart to visualize proportions or composition. Use when showing how parts make up a whole — market share, distribution, percentage breakdowns.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chart title" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" },
              },
              required: ["name", "value"],
            },
            description: "Array of {name, value} slices",
          },
        },
        required: ["data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_metric_card",
      description:
        "Display a single key metric prominently. Use for KPIs, summary statistics, or headline numbers.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string", description: "Metric name" },
          value: {
            type: ["string", "number"],
            description: "Metric value",
          },
          change: {
            type: "string",
            description: "Change text, e.g. '+12%' or '-3.5%'",
          },
          changeType: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Whether the change is good, bad, or neutral",
          },
          description: {
            type: "string",
            description: "Brief description of the metric",
          },
        },
        required: ["label", "value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_data_table",
      description:
        "Display structured data in a table. Use when the user needs exact values or multi-attribute comparisons.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Table title" },
          columns: {
            type: "array",
            items: { type: "string" },
            description: "Column header names",
          },
          rows: {
            type: "array",
            items: { type: "object" },
            description: "Array of row objects keyed by column name",
          },
        },
        required: ["columns", "rows"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_flow_diagram",
      description:
        "Display a flow or architecture diagram with labeled boxes and directional arrows. Use for processes, system architectures, data flows, decision trees, pipelines, or any concept with connected components.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Diagram title" },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique node identifier" },
                label: { type: "string", description: "Display label" },
                group: {
                  type: "string",
                  description:
                    "Group ID — nodes in the same group are displayed together in a column",
                },
                color: {
                  type: "string",
                  description:
                    "Optional CSS color for the node background",
                },
              },
              required: ["id", "label"],
            },
            description: "Array of nodes (boxes) in the diagram",
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string", description: "Source node ID" },
                to: { type: "string", description: "Target node ID" },
                label: {
                  type: "string",
                  description: "Optional edge label",
                },
              },
              required: ["from", "to"],
            },
            description: "Array of directed connections between nodes",
          },
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
              },
              required: ["id", "label"],
            },
            description:
              "Optional group definitions with labels — displayed as column headers",
          },
          direction: {
            type: "string",
            enum: ["LR", "TB"],
            description:
              "Layout direction: LR (left-to-right, default) or TB (top-to-bottom)",
          },
        },
        required: ["nodes", "edges"],
      },
    },
  },
]

import { tradingTools, TRADING_SYSTEM_PROMPT } from "./trading-tools"

export const allTools = [...widgetTools, ...tradingTools]

export const SYSTEM_PROMPT = TRADING_SYSTEM_PROMPT
