// PR Analysis Rules and Standards - Extended Version
export const PR_ANALYSIS_RULES = {
  codeQuality: {
    maxLineLength: 100,
    minFunctionDocumentation: true,
    requireTypeAnnotations: true,
    avoidConsoleLogsInProduction: true,
    maxComplexity: 10,
    requireTests: true,
  },
  testing: {
    minCoveragePercentage: 80,
    requireTestsForNewFeatures: true,
    requireTestsForBugFixes: true,
    testFilePattern: "*.test.ts|*.spec.ts",
  },
  commits: {
    maxFilesPerCommit: 20,
    requireConventionalCommits: true,
    commitMessageMinLength: 10,
    maxCommitMessageLength: 100,
  },
  documentation: {
    requireReadmeUpdate: true,
    requireChangelogEntry: true,
    requireAPIDocumentation: true,
    minDescriptionLength: 20,
  },
  security: {
    noHardcodedSecrets: true,
    noPublicSensitiveData: true,
    requireSecurityReview: false,
    scanDependencies: true,
  },
  performance: {
    maxFileSizeIncrease: 100000, // bytes
    warnOnLargeFiles: true,
    checkBundleSize: true,
  },
};

export interface AnalysisResult {
  status: "pass" | "fail" | "warning";
  violations: string[];
  suggestions: string[];
  score: number;
  categories?: {
    codeQuality?: number;
    security?: number;
    documentation?: number;
    commits?: number;
    performance?: number;
  };
}

export interface PRAnalysis {
  prNumber: number;
  owner: string;
  repo: string;
  analysis: AnalysisResult;
  timestamp: string;
  mcpIntegrated: boolean;
}
