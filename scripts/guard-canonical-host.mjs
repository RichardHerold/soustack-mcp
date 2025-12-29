#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

const LEGACY_PATTERNS = [
  /https:\/\/soustack\.spec\//gi,
  /https:\/\/soustack\.ai\/schemas\//gi,
];

const SCAN_DIRS = ["src", "test", "scripts"];
const SCAN_FILES = ["README.md"];

async function readFileIfExists(path) {
  try {
    return await readFile(path, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function scanFile(filePath, content) {
  // Allow legacy URLs in test files since they test normalization behavior
  if (filePath.includes("/test/") || filePath.endsWith(".test.js") || filePath.endsWith(".test.ts")) {
    return [];
  }
  const issues = [];
  for (const pattern of LEGACY_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      issues.push({
        file: filePath,
        line: content.slice(0, match.index).split("\n").length,
        match: match[0],
      });
    }
  }
  return issues;
}

async function scanDirectory(dirPath) {
  const issues = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      const subIssues = await scanDirectory(fullPath);
      issues.push(...subIssues);
    } else if (entry.isFile()) {
      const ext = entry.name.split(".").pop()?.toLowerCase();
      const textExtensions = [
        "js",
        "ts",
        "mjs",
        "cjs",
        "json",
        "md",
        "txt",
        "yml",
        "yaml",
      ];
      if (textExtensions.includes(ext)) {
        const content = await readFileIfExists(fullPath);
        if (content) {
          const fileIssues = await scanFile(fullPath, content);
          issues.push(...fileIssues);
        }
      }
    }
  }

  return issues;
}

async function main() {
  const allIssues = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = join(repoRoot, dir);
    try {
      const stat = await import("node:fs/promises").then((fs) => fs.stat(dirPath));
      if (stat.isDirectory()) {
        const issues = await scanDirectory(dirPath);
        allIssues.push(...issues);
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  for (const file of SCAN_FILES) {
    const filePath = join(repoRoot, file);
    const content = await readFileIfExists(filePath);
    if (content) {
      const issues = await scanFile(filePath, content);
      allIssues.push(...issues);
    }
  }

  if (allIssues.length > 0) {
    console.error("Error: Found legacy schema URLs:");
    for (const issue of allIssues) {
      const relPath = issue.file.replace(repoRoot + "/", "");
      console.error(`  ${relPath}:${issue.line} - ${issue.match}`);
    }
    process.exit(1);
  }

  console.log("✓ No legacy schema URLs found");
}

main().catch((error) => {
  console.error("Error running guard:", error);
  process.exit(1);
});

