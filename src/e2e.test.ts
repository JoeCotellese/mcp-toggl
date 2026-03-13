import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

// e2e test: spawn the MCP server and verify tool manifest via MCP protocol.
// Requires a TOGGL_API_KEY env var (any value works — we only call listTools, not the Toggl API).

function createTransport() {
  return new StdioClientTransport({
    command: 'node',
    args: [resolve(import.meta.dirname, '..', 'dist', 'index.js')],
    env: {
      ...process.env,
      TOGGL_API_KEY: process.env.TOGGL_API_KEY || 'test-key-for-manifest-check',
    },
  });
}

describe('e2e: tool manifest', () => {
  it('listTools returns expected tool set', async () => {
    const transport = createTransport();

    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolNames = tools.map(t => t.name).sort();

    // Expected tools (alphabetical): 14 original - 3 cache + 3 CRUD = 14, but let's count:
    // check_auth, get_time_entries, get_current_entry, start_timer, stop_timer,
    // create_time_entry, update_time_entry, delete_time_entry,
    // daily_report, weekly_report, project_summary, workspace_summary,
    // list_workspaces, list_projects, list_clients
    // = 15 total (was 14 original, -3 cache, +3 CRUD, +1 net)
    const expectedTools = [
      'toggl_check_auth',
      'toggl_create_time_entry',
      'toggl_daily_report',
      'toggl_delete_time_entry',
      'toggl_get_current_entry',
      'toggl_get_time_entries',
      'toggl_list_clients',
      'toggl_list_projects',
      'toggl_list_workspaces',
      'toggl_project_summary',
      'toggl_start_timer',
      'toggl_stop_timer',
      'toggl_update_time_entry',
      'toggl_weekly_report',
      'toggl_workspace_summary',
    ].sort();

    expect(toolNames).toEqual(expectedTools);

    // Verify cache tools are absent
    expect(toolNames).not.toContain('toggl_warm_cache');
    expect(toolNames).not.toContain('toggl_cache_stats');
    expect(toolNames).not.toContain('toggl_clear_cache');

    await client.close();
  }, 10000);
});

describe('e2e: server instructions', () => {
  it('initialize response includes instructions string', async () => {
    const transport = createTransport();

    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    // The connect method performs the initialize handshake.
    // The server info (including instructions) is available on the client after connect.
    await client.connect(transport);

    const info = client.getServerVersion();
    expect(info).toBeDefined();

    const instructions = client.getInstructions();
    expect(instructions).toBeDefined();
    expect(typeof instructions).toBe('string');
    expect(instructions.length).toBeGreaterThan(0);
    expect(instructions).toContain('Toggl Track');

    await client.close();
  }, 10000);
});
