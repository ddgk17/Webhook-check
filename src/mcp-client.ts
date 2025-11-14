import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

export interface StdioClientTransportOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export class GitHubMCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private isConnected: boolean = false;

  constructor(options: StdioClientTransportOptions) {
    this.transport = new StdioClientTransport(options);
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

  async fetchPRDetails(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<unknown> {
    return this.callTool("github/get_pull_request", {
      owner,
      repo,
      pull_number: prNumber,
    });
  }

  async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<unknown> {
    return this.callTool("github/list_pull_request_files", {
      owner,
      repo,
      pull_number: prNumber,
    });
  }

  async fetchPRCommits(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<unknown> {
    return this.callTool("github/list_pull_request_commits", {
      owner,
      repo,
      pull_number: prNumber,
    });
  }

  async createComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<unknown> {
    return this.callTool("github/create_issue_comment", {
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}

