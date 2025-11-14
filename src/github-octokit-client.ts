import { Octokit } from "octokit";

export class GitHubOctokitClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async fetchPRDetails(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching PR details:", error);
      throw error;
    }
  }

  async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any[]> {
    try {
      const response = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching PR files:", error);
      throw error;
    }
  }

  async fetchPRCommits(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<any[]> {
    try {
      const response = await this.octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching PR commits:", error);
      throw error;
    }
  }

  async createComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }
}
