import { PR_ANALYSIS_RULES, AnalysisResult } from "./rules.js";

export interface GitHubClient {
  fetchPRDetails(owner: string, repo: string, prNumber: number): Promise<any>;
  fetchPRFiles(owner: string, repo: string, prNumber: number): Promise<any[]>;
  fetchPRCommits(owner: string, repo: string, prNumber: number): Promise<any[]>;
  createComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<any>;
}

export interface PRData {
  number: number;
  title: string;
  description: string;
  files: PRFile[];
  commits: Commit[];
  owner: string;
  repo: string;
}

export interface PRFile {
  name: string;
  changes: number;
  additions: number;
  deletions: number;
  patch?: string;
  status: string;
}

export interface Commit {
  message: string;
  filesChanged: number;
  sha: string;
}

export class IntegratedPRAnalyzer {
  private client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  async fetchAndAnalyzePR(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<AnalysisResult> {
    try {
      // Fetch data using GitHub client
      const prDetails = await this.client.fetchPRDetails(owner, repo, prNumber);
      const prFiles = await this.client.fetchPRFiles(owner, repo, prNumber);
      const prCommits = await this.client.fetchPRCommits(owner, repo, prNumber);

      // Convert responses to PRData format
      const prData = this.convertToPRData(
        prDetails,
        prFiles,
        prCommits,
        owner,
        repo,
        prNumber
      );

      // Analyze the PR
      return this.analyzePR(prData);
    } catch (error) {
      console.error(`Error fetching/analyzing PR: ${error}`);
      throw error;
    }
  }

  async postAnalysisComment(
    owner: string,
    repo: string,
    prNumber: number,
    analysis: AnalysisResult
  ): Promise<void> {
    const comment = this.formatAnalysisComment(analysis);
    try {
      await this.client.createComment(owner, repo, prNumber, comment);
      console.log(`Posted analysis comment on PR #${prNumber}`);
    } catch (error) {
      console.error(`Error posting comment: ${error}`);
      throw error;
    }
  }

  private analyzePR(prData: PRData): AnalysisResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Code Quality Analysis
    score = this.analyzeCodeQuality(prData, violations, suggestions, score);

    // Commit Analysis
    score = this.analyzeCommits(prData, violations, suggestions, score);

    // File Analysis
    score = this.analyzeFiles(prData, violations, suggestions, score);

    // Documentation Analysis
    score = this.analyzeDocumentation(prData, violations, suggestions, score);

    // Security Analysis
    score = this.analyzeSecurity(prData, violations, suggestions, score);

    const status = violations.length > 0 ? "fail" : suggestions.length > 0 ? "warning" : "pass";
    score = Math.max(0, Math.min(100, score));

    return {
      status,
      violations,
      suggestions,
      score,
    };
  }

  private analyzeCodeQuality(
    prData: PRData,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let newScore = score;

    for (const file of prData.files) {
      if ((file.name.endsWith(".js") || file.name.endsWith(".ts")) && file.patch) {
        // Check for console.log
        if (
          file.patch.includes("console.log") &&
          PR_ANALYSIS_RULES.codeQuality.avoidConsoleLogsInProduction
        ) {
          suggestions.push(`Remove console.log statements in production code (${file.name})`);
          newScore -= 5;
        }

        // Check line length
        const lines = file.patch.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].length > PR_ANALYSIS_RULES.codeQuality.maxLineLength) {
            suggestions.push(
              `Line ${i + 1} in ${file.name} exceeds max length of ${PR_ANALYSIS_RULES.codeQuality.maxLineLength}`
            );
            newScore -= 2;
            break;
          }
        }
      }
    }

    return newScore;
  }

  private analyzeCommits(
    prData: PRData,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let newScore = score;

    for (const commit of prData.commits) {
      // Check conventional commit format
      if (PR_ANALYSIS_RULES.commits.requireConventionalCommits) {
        if (!this.hasConventionalCommitFormat(commit.message)) {
          violations.push(
            `Commit "${commit.message.substring(0, 50)}..." does not follow conventional commit format`
          );
          newScore -= 5;
        }
      }

      // Check commit message length
      if (commit.message.length < PR_ANALYSIS_RULES.commits.commitMessageMinLength) {
        suggestions.push(
          `Commit message too short: "${commit.message}" (min ${PR_ANALYSIS_RULES.commits.commitMessageMinLength} chars)`
        );
        newScore -= 3;
      }
    }

    return newScore;
  }

  private analyzeFiles(
    prData: PRData,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let newScore = score;

    // Check file count
    if (prData.files.length > PR_ANALYSIS_RULES.commits.maxFilesPerCommit) {
      violations.push(
        `PR has ${prData.files.length} files (max ${PR_ANALYSIS_RULES.commits.maxFilesPerCommit})`
      );
      newScore -= 10;
    }

    // Check for large files
    for (const file of prData.files) {
      if (file.changes > 500) {
        suggestions.push(
          `Large file change detected: ${file.name} (${file.changes} changes). Consider breaking into smaller commits.`
        );
        newScore -= 5;
      }
    }

    return newScore;
  }

  private analyzeDocumentation(
    prData: PRData,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let newScore = score;

    // Check PR description
    if (!prData.description || prData.description.length < 20) {
      violations.push("PR description is too short or missing");
      newScore -= 10;
    }

    // Check for README update
    const hasReadmeUpdate = prData.files.some((f) =>
      f.name.toLowerCase().includes("readme")
    );
    if (!hasReadmeUpdate && prData.description.length < 100) {
      if (PR_ANALYSIS_RULES.documentation.requireReadmeUpdate) {
        suggestions.push("Consider updating README.md for significant changes");
        newScore -= 5;
      }
    }

    // Check for CHANGELOG
    const hasChangelogUpdate = prData.files.some(
      (f) =>
        f.name.toLowerCase().includes("changelog") ||
        f.name.toLowerCase().includes("change log")
    );
    if (!hasChangelogUpdate && prData.description.length < 100) {
      if (PR_ANALYSIS_RULES.documentation.requireChangelogEntry) {
        suggestions.push("Consider adding an entry to CHANGELOG");
        newScore -= 3;
      }
    }

    return newScore;
  }

  private analyzeSecurity(
    prData: PRData,
    violations: string[],
    suggestions: string[],
    score: number
  ): number {
    let newScore = score;

    for (const file of prData.files) {
      if (file.patch) {
        // Check for secrets patterns
        if (PR_ANALYSIS_RULES.security.noHardcodedSecrets) {
          if (
            this.containsSecretPatterns(file.patch) &&
            !file.name.includes(".example") &&
            !file.name.includes(".template")
          ) {
            violations.push(
              `Potential hardcoded secret detected in ${file.name}. Use environment variables instead.`
            );
            newScore -= 15;
          }
        }

        // Check for API keys
        if (/api[_-]?key|apikey|secret[_-]?key/i.test(file.patch)) {
          suggestions.push(
            `Possible API key or secret in ${file.name}. Ensure it's not hardcoded.`
          );
          newScore -= 10;
        }
      }
    }

    return newScore;
  }

  private hasConventionalCommitFormat(message: string): boolean {
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\(.+\))?!?: .+/;
    return conventionalPattern.test(message);
  }

  private containsSecretPatterns(patch: string): boolean {
    const secretPatterns = [
      /(['"]?)(password|passwd|pwd)(['"]?\s*[:=])/i,
      /(['"]?)(api[_-]?key|apikey)(['"]?\s*[:=])/i,
      /(['"]?)(secret)(['"]?\s*[:=])/i,
      /(['"]?)(token)(['"]?\s*[:=])/i,
      /(['"]?)(auth)(['"]?\s*[:=])/i,
    ];

    return secretPatterns.some((pattern) => pattern.test(patch));
  }

  private convertToPRData(
    prDetails: any,
    prFiles: any[],
    prCommits: any[],
    owner: string,
    repo: string,
    prNumber: number
  ): PRData {
    const files: PRFile[] = prFiles.map((file) => ({
      name: file.filename,
      changes: file.changes,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      status: file.status,
    }));

    const commits: Commit[] = prCommits.map((commit) => ({
      message: commit.commit.message,
      filesChanged: commit.files?.length || 0,
      sha: commit.sha,
    }));

    return {
      number: prNumber,
      title: prDetails.title || "",
      description: prDetails.body || "",
      files,
      commits,
      owner,
      repo,
    };
  }

  private formatAnalysisComment(analysis: AnalysisResult): string {
    let comment = `## 🔍 PR Analysis Report\n\n`;
    comment += `**Status:** ${analysis.status.toUpperCase()}\n`;
    comment += `**Score:** ${analysis.score}/100\n\n`;

    if (analysis.violations.length > 0) {
      comment += `### ❌ Violations\n`;
      analysis.violations.forEach((v) => {
        comment += `- ${v}\n`;
      });
      comment += "\n";
    }

    if (analysis.suggestions.length > 0) {
      comment += `### ⚠️ Suggestions\n`;
      analysis.suggestions.forEach((s) => {
        comment += `- ${s}\n`;
      });
      comment += "\n";
    }

    if (analysis.violations.length === 0 && analysis.suggestions.length === 0) {
      comment += `✅ All checks passed! Great PR!\n`;
    }

    comment += `\n---\n*Generated by PR Analyzer Agent*`;

    return comment;
  }
}
