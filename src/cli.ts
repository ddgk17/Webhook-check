#!/usr/bin/env node

import { IntegratedPRAnalyzer } from "./integrated-analyzer.js";
import { GitHubOctokitClient } from "./github-octokit-client.js";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error(
      "Usage: npx ts-node src/cli.ts <owner> <repo> <pr_number> [analyze|post]"
    );
    process.exit(1);
  }

  const [owner, repo, prNumberStr, action = "analyze"] = args;
  const prNumber = parseInt(prNumberStr);

  if (isNaN(prNumber)) {
    console.error("PR number must be a valid number");
    process.exit(1);
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("Error: GITHUB_TOKEN environment variable is not set");
      process.exit(1);
    }

    const client = new GitHubOctokitClient(token);

    const analyzer = new IntegratedPRAnalyzer(client);

    console.log(`\n🔍 PR Analyzer for ${owner}/${repo}#${prNumber}\n`);

    if (action === "post" || action === "both") {
      console.log("Analyzing PR...");
      const analysis = await analyzer.fetchAndAnalyzePR(owner, repo, prNumber);

      console.log("\n📊 Analysis Results:");
      console.log(JSON.stringify(analysis, null, 2));

      console.log("\nPosting comment to PR...");
      await analyzer.postAnalysisComment(owner, repo, prNumber, analysis);

      console.log("\n✅ Comment posted successfully!");
    } else {
      console.log("Analyzing PR...");
      const analysis = await analyzer.fetchAndAnalyzePR(owner, repo, prNumber);

      console.log("\n📊 Analysis Results:");
      console.log(JSON.stringify(analysis, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
