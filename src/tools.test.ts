import { describe, it, expect } from 'vitest';

// We test the tool manifest by importing index.ts and extracting the tools array.
// Since index.ts has side effects (server startup), we'll parse the tools from the source
// as a lightweight approach. For the e2e test we'll use the MCP client.

// Instead, let's test a simpler approach: extract the tool names from the tools array
// by importing a shared constant. Since tools are defined inline, we'll use a regex
// approach on the source file for now.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(import.meta.dirname, 'index.ts'), 'utf-8');

function getToolNames(): string[] {
  const matches = src.matchAll(/name:\s*'(toggl_\w+)'/g);
  return [...matches].map(m => m[1]);
}

/** Parse tool blocks from source to extract per-tool metadata. */
function getToolBlocks(): Array<{ name: string; block: string }> {
  const toolNames = getToolNames();
  const blocks: Array<{ name: string; block: string }> = [];

  for (const name of toolNames) {
    // Find the block starting from this tool's name to the next tool or end of array
    const namePattern = `name: '${name}'`;
    const startIdx = src.indexOf(namePattern);
    if (startIdx === -1) continue;

    // Find the opening brace for this tool object (scan backwards)
    let braceIdx = startIdx;
    while (braceIdx > 0 && src[braceIdx] !== '{') braceIdx--;

    // Find the matching closing brace
    let depth = 0;
    let endIdx = braceIdx;
    for (let i = braceIdx; i < src.length; i++) {
      if (src[i] === '{') depth++;
      if (src[i] === '}') depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }

    blocks.push({ name, block: src.slice(braceIdx, endIdx) });
  }

  return blocks;
}

describe('tool manifest', () => {
  const toolNames = getToolNames();
  const toolBlocks = getToolBlocks();

  it('does not expose cache management tools', () => {
    expect(toolNames).not.toContain('toggl_warm_cache');
    expect(toolNames).not.toContain('toggl_cache_stats');
    expect(toolNames).not.toContain('toggl_clear_cache');
  });

  it('exposes CRUD time entry tools', () => {
    expect(toolNames).toContain('toggl_create_time_entry');
    expect(toolNames).toContain('toggl_update_time_entry');
    expect(toolNames).toContain('toggl_delete_time_entry');
  });

  it('exposes CRUD project tools', () => {
    expect(toolNames).toContain('toggl_create_project');
    expect(toolNames).toContain('toggl_update_project');
    expect(toolNames).toContain('toggl_delete_project');
  });

  it('exposes CRUD client tools', () => {
    expect(toolNames).toContain('toggl_create_client');
    expect(toolNames).toContain('toggl_update_client');
    expect(toolNames).toContain('toggl_delete_client');
  });

  it('exposes expected core tools', () => {
    expect(toolNames).toContain('toggl_check_auth');
    expect(toolNames).toContain('toggl_get_time_entries');
    expect(toolNames).toContain('toggl_get_current_entry');
    expect(toolNames).toContain('toggl_start_timer');
    expect(toolNames).toContain('toggl_stop_timer');
    expect(toolNames).toContain('toggl_daily_report');
    expect(toolNames).toContain('toggl_weekly_report');
    expect(toolNames).toContain('toggl_list_workspaces');
    expect(toolNames).toContain('toggl_list_projects');
    expect(toolNames).toContain('toggl_list_clients');
  });
});

describe('tool titles', () => {
  const toolBlocks = getToolBlocks();

  it('every tool has a title string', () => {
    for (const { name, block } of toolBlocks) {
      const hasTitle = /title:\s*'[^']+'/g.test(block);
      expect(hasTitle, `${name} should have a title`).toBe(true);
    }
  });
});

describe('tool annotations', () => {
  const toolBlocks = getToolBlocks();

  it('every tool has an annotations object', () => {
    for (const { name, block } of toolBlocks) {
      const hasAnnotations = /annotations:\s*\{/.test(block);
      expect(hasAnnotations, `${name} should have annotations`).toBe(true);
    }
  });

  const readOnlyTools = [
    'toggl_check_auth',
    'toggl_get_time_entries',
    'toggl_get_current_entry',
    'toggl_daily_report',
    'toggl_weekly_report',
    'toggl_project_summary',
    'toggl_workspace_summary',
    'toggl_list_workspaces',
    'toggl_list_projects',
    'toggl_list_clients',
  ];

  it('read-only tools have readOnlyHint: true', () => {
    for (const { name, block } of toolBlocks) {
      if (readOnlyTools.includes(name)) {
        const hasReadOnly = /readOnlyHint:\s*true/.test(block);
        expect(hasReadOnly, `${name} should have readOnlyHint: true`).toBe(true);
      }
    }
  });

  it('toggl_delete_time_entry has destructiveHint: true', () => {
    const deleteBlock = toolBlocks.find(t => t.name === 'toggl_delete_time_entry');
    expect(deleteBlock).toBeDefined();
    expect(/destructiveHint:\s*true/.test(deleteBlock!.block)).toBe(true);
  });

  const writeTools = [
    'toggl_start_timer',
    'toggl_stop_timer',
    'toggl_create_time_entry',
    'toggl_update_time_entry',
  ];

  it('write tools (non-delete) have destructiveHint: false', () => {
    for (const { name, block } of toolBlocks) {
      if (writeTools.includes(name)) {
        const hasNonDestructive = /destructiveHint:\s*false/.test(block);
        expect(hasNonDestructive, `${name} should have destructiveHint: false`).toBe(true);
      }
    }
  });
});
