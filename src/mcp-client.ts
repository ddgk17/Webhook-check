import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

export class GitHubMCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private isConnected: boolean = false;

  constructor() {
    // Connect to GitHub's official MCP server
    const env: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN) {
      env.GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_TOKEN;
    }

    this.transport = new StdioClientTransport({
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      env,
    });
    
    this.client = new Client(
      {
        name: "pr-analyzer-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("Already connected to GitHub MCP Server");
      return;
    }
    await this.client.connect(this.transport);
    this.isConnected = true;
    console.log("Connected to GitHub MCP Server");
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    await this.transport.close();
    this.isConnected = false;
    console.log("Disconnected from GitHub MCP Server");
  }

  // Call any GitHub MCP tool
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const result = await this.client.callTool(
        {
          name,
          arguments: args,
        }
      );
      return result;
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }

  // Get PR details using GitHub MCP server
  async fetchPRDetails(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any> {
    return this.callTool("github_get_pull_request", {
      owner,
      repo,
      pull_number: prNumber,
    });
  }

  // List PR files using GitHub MCP server
  async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any[]> {
    return this.callTool("github_list_pull_request_files", {
      owner,
      repo,
      pull_number: prNumber,
    }) as Promise<any[]>;
  }

  // List PR commits using GitHub MCP server
  async fetchPRCommits(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any[]> {
    return this.callTool("github_list_pull_request_commits", {
      owner,
      repo,
      pull_number: prNumber,
    }) as Promise<any[]>;
  }

  // Create a comment using GitHub MCP server
  async createComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    await this.callTool("github_create_pull_request_comment", {
      owner,
      repo,
      pull_number: prNumber,
      body,
    });
  }
}


