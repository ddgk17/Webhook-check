#!/usr/bin/env node

import { IntegratedPRAnalyzer } from "./integrated-analyzer.js";
import { GitHubMCPClient } from "./mcp-client.js";

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
    const client = new GitHubMCPClient({
      command: "gh",
      args: ["api", "graphql"],
    });

    const analyzer = new IntegratedPRAnalyzer(client);

    console.log(`\n🔍 PR Analyzer for ${owner}/${repo}#${prNumber}\n`);

    if (action === "post" || action === "both") {
      console.log("Connecting to GitHub MCP Server...");
      await client.connect();

      console.log("Analyzing PR...");
      const analysis = await analyzer.fetchAndAnalyzePR(owner, repo, prNumber);

      console.log("\n📊 Analysis Results:");
      console.log(JSON.stringify(analysis, null, 2));

      console.log("\nPosting comment to PR...");
      await analyzer.postAnalysisComment(owner, repo, prNumber, analysis);

      await client.disconnect();
      console.log("\n✅ Comment posted successfully!");
    } else {
      console.log("Connecting to GitHub MCP Server...");
      await client.connect();

      console.log("Analyzing PR...");
      const analysis = await analyzer.fetchAndAnalyzePR(owner, repo, prNumber);

      console.log("\n📊 Analysis Results:");
      console.log(JSON.stringify(analysis, null, 2));

      await client.disconnect();
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
