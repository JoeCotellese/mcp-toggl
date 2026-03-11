import { describe, it, expect } from 'vitest';
import { slimEntry, slimEntries, applyLimit } from './utils.js';
import type { HydratedTimeEntry } from './types.js';

const fullEntry: HydratedTimeEntry = {
  id: 12345,
  workspace_id: 100,
  workspace_name: 'My Workspace',
  project_id: 200,
  project_name: 'Project Alpha',
  client_name: 'Acme Corp',
  task_id: 300,
  task_name: 'Design',
  description: 'Working on wireframes',
  start: '2026-03-11T09:00:00Z',
  stop: '2026-03-11T10:30:00Z',
  duration: 5400,
  tags: ['design', 'frontend'],
  tag_names: ['design', 'frontend'],
  billable: true,
  // Noise fields that should be stripped
  tag_ids: [1, 2],
  duronly: false,
  at: '2026-03-11T10:30:05Z',
  server_deleted_at: undefined,
  user_id: 999,
  uid: 999,
  wid: 100,
  pid: 200,
  tid: 300,
  user_name: 'Joe',
  client_id: 50,
};

describe('slimEntry', () => {
  it('strips noise fields, preserves actionable fields', () => {
    const slim = slimEntry(fullEntry);

    expect(slim).toEqual({
      id: 12345,
      workspace_id: 100,
      workspace_name: 'My Workspace',
      project_id: 200,
      project_name: 'Project Alpha',
      client_name: 'Acme Corp',
      description: 'Working on wireframes',
      start: '2026-03-11T09:00:00Z',
      stop: '2026-03-11T10:30:00Z',
      duration: 5400,
      tags: ['design', 'frontend'],
      billable: true,
      task_name: 'Design',
    });

    // Verify noise fields are absent
    expect(slim).not.toHaveProperty('tag_ids');
    expect(slim).not.toHaveProperty('duronly');
    expect(slim).not.toHaveProperty('at');
    expect(slim).not.toHaveProperty('server_deleted_at');
    expect(slim).not.toHaveProperty('user_id');
    expect(slim).not.toHaveProperty('uid');
    expect(slim).not.toHaveProperty('wid');
    expect(slim).not.toHaveProperty('pid');
    expect(slim).not.toHaveProperty('tid');
    expect(slim).not.toHaveProperty('user_name');
    expect(slim).not.toHaveProperty('client_id');
    expect(slim).not.toHaveProperty('tag_names');
  });

  it('handles minimal entry with only required fields', () => {
    const minimal: HydratedTimeEntry = {
      id: 1,
      workspace_id: 10,
      workspace_name: 'WS',
      start: '2026-03-11T09:00:00Z',
      duration: -1,
    };

    const slim = slimEntry(minimal);

    expect(slim).toEqual({
      id: 1,
      workspace_id: 10,
      workspace_name: 'WS',
      project_id: undefined,
      project_name: undefined,
      client_name: undefined,
      description: undefined,
      start: '2026-03-11T09:00:00Z',
      stop: undefined,
      duration: -1,
      tags: undefined,
      billable: undefined,
      task_name: undefined,
    });
  });

  it('does not mutate the original entry', () => {
    const original = { ...fullEntry };
    slimEntry(fullEntry);
    expect(fullEntry).toEqual(original);
  });
});

describe('applyLimit', () => {
  const items = Array.from({ length: 100 }, (_, i) => i);

  it('limits to N items when limit < total', () => {
    expect(applyLimit(items, 50)).toHaveLength(50);
    expect(applyLimit(items, 50)[49]).toBe(49);
  });

  it('returns all items when limit > total', () => {
    const small = [1, 2, 3];
    expect(applyLimit(small, 50)).toHaveLength(3);
  });

  it('returns all items when limit is 0 (unlimited)', () => {
    expect(applyLimit(items, 0)).toHaveLength(100);
  });

  it('returns all items when limit is undefined (uses default)', () => {
    // Default is 50
    expect(applyLimit(items)).toHaveLength(50);
  });
});

describe('slimEntries', () => {
  it('maps an array of entries through slimEntry', () => {
    const entries = [fullEntry, fullEntry];
    const result = slimEntries(entries);

    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('at');
    expect(result[1]).not.toHaveProperty('uid');
  });

  it('returns empty array for empty input', () => {
    expect(slimEntries([])).toEqual([]);
  });
});
