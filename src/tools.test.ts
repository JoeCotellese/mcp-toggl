import { describe, it, expect } from 'vitest';

// We test the tool manifest by importing index.ts and extracting the tools array.
// Since index.ts has side effects (server startup), we'll parse the tools from the source
// as a lightweight approach. For the e2e test we'll use the MCP client.

// Instead, let's test a simpler approach: extract the tool names from the tools array
// by importing a shared constant. Since tools are defined inline, we'll use a regex
// approach on the source file for now.

import { readFileSync } from 'fs';
import { resolve } from 'path';

function getToolNames(): string[] {
  const src = readFileSync(resolve(import.meta.dirname, 'index.ts'), 'utf-8');
  const matches = src.matchAll(/name:\s*'(toggl_\w+)'/g);
  return [...matches].map(m => m[1]);
}

describe('tool manifest', () => {
  const toolNames = getToolNames();

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
