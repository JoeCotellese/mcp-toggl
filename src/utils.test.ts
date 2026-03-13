import { describe, it, expect } from 'vitest';
import { slimEntry, slimEntries, applyLimit, stripReportEntries, slimProject, slimClient } from './utils.js';
import type { HydratedTimeEntry, DailyReport, WeeklyReport, Project, Client } from './types.js';

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

describe('stripReportEntries', () => {
  const sampleDailyReport: DailyReport = {
    date: '2026-03-11',
    total_hours: 5,
    total_seconds: 18000,
    entries: [{ id: 1, workspace: 'WS', start: '', duration_hours: 1, duration_seconds: 3600 }],
    by_project: [],
    by_workspace: [],
  };

  it('removes entries from a daily report by default', () => {
    const result = stripReportEntries(sampleDailyReport);
    expect(result).not.toHaveProperty('entries');
    // Summaries preserved
    expect(result.total_hours).toBe(5);
  });

  it('preserves entries when include_entries is true', () => {
    const result = stripReportEntries(sampleDailyReport, true);
    expect(result.entries).toHaveLength(1);
  });

  it('removes entries from weekly report daily_breakdown', () => {
    const weeklyReport: WeeklyReport = {
      week_start: '2026-03-09',
      week_end: '2026-03-15',
      total_hours: 10,
      total_seconds: 36000,
      daily_breakdown: [sampleDailyReport, { ...sampleDailyReport, date: '2026-03-12' }],
      by_project: [],
      by_workspace: [],
    };

    const result = stripReportEntries(weeklyReport);
    expect(result).not.toHaveProperty('entries');
    for (const day of (result as WeeklyReport).daily_breakdown) {
      expect(day).not.toHaveProperty('entries');
    }
  });

  it('preserves weekly daily_breakdown entries when opted in', () => {
    const weeklyReport: WeeklyReport = {
      week_start: '2026-03-09',
      week_end: '2026-03-15',
      total_hours: 10,
      total_seconds: 36000,
      daily_breakdown: [sampleDailyReport],
      by_project: [],
      by_workspace: [],
    };

    const result = stripReportEntries(weeklyReport, true) as WeeklyReport;
    expect(result.daily_breakdown[0].entries).toHaveLength(1);
  });
});

describe('slimProject', () => {
  const fullProject: Project = {
    id: 200,
    workspace_id: 100,
    name: 'Project Alpha',
    client_id: 50,
    is_private: true,
    active: true,
    at: '2026-03-11T10:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    color: '#ff0000',
    billable: true,
    template: false,
    auto_estimates: false,
    estimated_hours: 100,
    rate: 150,
    rate_last_updated: '2026-02-01T00:00:00Z',
    currency: 'USD',
    recurring: false,
    recurring_parameters: null,
    current_period: null,
    fixed_fee: 5000,
    actual_hours: 42,
    wid: 100,
    cid: 50,
  };

  it('strips noise fields, preserves actionable fields', () => {
    const slim = slimProject(fullProject);

    expect(slim).toEqual({
      id: 200,
      workspace_id: 100,
      name: 'Project Alpha',
      client_id: 50,
      active: true,
      billable: true,
      color: '#ff0000',
    });

    // Verify noise fields are absent
    expect(slim).not.toHaveProperty('is_private');
    expect(slim).not.toHaveProperty('at');
    expect(slim).not.toHaveProperty('created_at');
    expect(slim).not.toHaveProperty('template');
    expect(slim).not.toHaveProperty('auto_estimates');
    expect(slim).not.toHaveProperty('estimated_hours');
    expect(slim).not.toHaveProperty('rate');
    expect(slim).not.toHaveProperty('rate_last_updated');
    expect(slim).not.toHaveProperty('currency');
    expect(slim).not.toHaveProperty('recurring');
    expect(slim).not.toHaveProperty('recurring_parameters');
    expect(slim).not.toHaveProperty('current_period');
    expect(slim).not.toHaveProperty('fixed_fee');
    expect(slim).not.toHaveProperty('actual_hours');
    expect(slim).not.toHaveProperty('wid');
    expect(slim).not.toHaveProperty('cid');
  });

  it('handles minimal project', () => {
    const minimal: Project = {
      id: 1,
      workspace_id: 10,
      name: 'Minimal',
    };

    const slim = slimProject(minimal);
    expect(slim).toEqual({
      id: 1,
      workspace_id: 10,
      name: 'Minimal',
      client_id: undefined,
      active: undefined,
      billable: undefined,
      color: undefined,
    });
  });

  it('does not mutate the original', () => {
    const original = { ...fullProject };
    slimProject(fullProject);
    expect(fullProject).toEqual(original);
  });
});

describe('slimClient', () => {
  const fullClient: Client = {
    id: 50,
    workspace_id: 100,
    name: 'Acme Corp',
    at: '2026-03-11T10:00:00Z',
    notes: 'Important client',
    archived: false,
    wid: 100,
  };

  it('strips noise fields, preserves actionable fields', () => {
    const slim = slimClient(fullClient);

    expect(slim).toEqual({
      id: 50,
      workspace_id: 100,
      name: 'Acme Corp',
      archived: false,
      notes: 'Important client',
    });

    // Verify noise fields are absent
    expect(slim).not.toHaveProperty('at');
    expect(slim).not.toHaveProperty('wid');
  });

  it('handles minimal client', () => {
    const minimal: Client = {
      id: 1,
      workspace_id: 10,
      name: 'Minimal',
    };

    const slim = slimClient(minimal);
    expect(slim).toEqual({
      id: 1,
      workspace_id: 10,
      name: 'Minimal',
      archived: undefined,
      notes: undefined,
    });
  });

  it('does not mutate the original', () => {
    const original = { ...fullClient };
    slimClient(fullClient);
    expect(fullClient).toEqual(original);
  });
});
