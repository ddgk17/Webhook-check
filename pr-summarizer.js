// scripts/summarize-pr.js

import fetch from "node-fetch"; // Node 18+ has built-in fetch
import process from "process";

export async function summarizePR(github, pr) {
  const prTitle = pr.title;
  const prBody = pr.body || "";

  // 1. Fetch changed files in the PR
  const filesChanged = await github.rest.pulls.listFiles({
    owner: process.env.GITHUB_REPOSITORY_OWNER,
    repo: process.env.GITHUB_REPOSITORY_NAME,
    pull_number: pr.number,
  });

  // 2. Combine file diffs into a single text block
  let diffText = "";
  for (const file of filesChanged.data) {
    diffText += `File: ${file.filename}\n`;
    diffText += file.patch ? file.patch : "[Full content not available]\n";
    diffText += "\n";
  }

  // 3. Build MCP messages
  const messages = [
    {
      role: "system",
      content: "You are a GitHub PR assistant. Summarize PRs concisely for reviewers."
    },
    {
      role: "user",
      content: `Summarize this PR including code changes:\nTitle: ${prTitle}\nDescription: ${prBody}\nDiff:\n${diffText}`
    }
  ];

  // 4. Call Gemini MCP API
  const response = await fetch("https://api.gemini.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-1.5",
      input: messages
    })
  });

  const data = await response.json();
  const summary = data.output?.[0]?.content?.[0]?.text || "No summary generated.";

  return summary;
}
