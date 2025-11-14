import {
  StdioServerTransport,
} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  Server,
} from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { IntegratedPRAnalyzer } from "./integrated-analyzer.js";
import { GitHubMCPClient } from "./mcp-client.js";
import { PR_ANALYSIS_RULES } from "./rules.js";

// Initialize MCP client for GitHub
const githubMCPClient = new GitHubMCPClient({
  command: "gh",
  args: ["api", "graphql"],
});

const analyzer = new IntegratedPRAnalyzer(githubMCPClient);

const server = new Server(
  {
    name: "pr-analyzer-integrated-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: "analyze_pr_with_github_mcp",
    description:
      "Analyze a GitHub PR using GitHub MCP server and apply custom rules",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description: "GitHub repository owner",
        },
        repo: {
          type: "string",
          description: "GitHub repository name",
        },
        pr_number: {
          type: "number",
          description: "Pull request number",
        },
      },
      required: ["owner", "repo", "pr_number"],
    },
  },
  {
    name: "post_analysis_to_pr",
    description: "Analyze and post results as a comment on a GitHub PR",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: {
          type: "string",
          description: "GitHub repository owner",
        },
        repo: {
          type: "string",
          description: "GitHub repository name",
        },
        pr_number: {
          type: "number",
          description: "Pull request number",
        },
      },
      required: ["owner", "repo", "pr_number"],
    },
  },
  {
    name: "get_analysis_rules",
    description: "Get the current PR analysis rules and standards",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "analyze_pr_with_github_mcp") {
      const { owner, repo, pr_number } = args as {
        owner: string;
        repo: string;
        pr_number: number;
      };

      try {
        await githubMCPClient.connect();
        const analysis = await analyzer.fetchAndAnalyzePR(
          owner,
          repo,
          pr_number
        );
        await githubMCPClient.disconnect();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing PR: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "post_analysis_to_pr") {
      const { owner, repo, pr_number } = args as {
        owner: string;
        repo: string;
        pr_number: number;
      };

      try {
        await githubMCPClient.connect();
        const analysis = await analyzer.fetchAndAnalyzePR(
          owner,
          repo,
          pr_number
        );
        await analyzer.postAnalysisComment(owner, repo, pr_number, analysis);
        await githubMCPClient.disconnect();

        return {
          content: [
            {
              type: "text",
              text: `✅ Analysis posted successfully on PR #${pr_number}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error posting analysis: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "get_analysis_rules") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(PR_ANALYSIS_RULES, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("PR Analyzer Integrated MCP Server started");
}

main().catch(console.error);
