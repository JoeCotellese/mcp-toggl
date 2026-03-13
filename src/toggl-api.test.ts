import { describe, it, expect, vi, beforeEach } from "vitest";
import { TogglAPI } from "./toggl-api.js";

// Mock node-fetch at the module level
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

import fetch from "node-fetch";
const mockFetch = vi.mocked(fetch);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as any;
}

function emptyResponse(status = 204) {
  return {
    ok: true,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  } as any;
}

describe("TogglAPI project methods", () => {
  let api: TogglAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new TogglAPI("test-api-key");
  });

  it("createProject sends POST with correct URL and body", async () => {
    const project = { id: 1, workspace_id: 100, name: "New Project" };
    mockFetch.mockResolvedValueOnce(jsonResponse(project));

    const result = await api.createProject(100, {
      name: "New Project",
      billable: true,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/projects",
    );
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      name: "New Project",
      billable: true,
    });
    expect(result).toEqual(project);
  });

  it("updateProject sends PUT with correct URL and body", async () => {
    const project = { id: 1, workspace_id: 100, name: "Updated" };
    mockFetch.mockResolvedValueOnce(jsonResponse(project));

    const result = await api.updateProject(100, 1, { name: "Updated" });

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/projects/1",
    );
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body)).toEqual({ name: "Updated" });
    expect(result).toEqual(project);
  });

  it("deleteProject sends DELETE with correct URL", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());

    await api.deleteProject(100, 1);

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/projects/1",
    );
    expect(opts.method).toBe("DELETE");
  });
});

describe("TogglAPI client methods", () => {
  let api: TogglAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new TogglAPI("test-api-key");
  });

  it("createClient sends POST with correct URL and body", async () => {
    const client = { id: 50, workspace_id: 100, name: "Acme Corp" };
    mockFetch.mockResolvedValueOnce(jsonResponse(client));

    const result = await api.createClient(100, { name: "Acme Corp" });

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients",
    );
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "Acme Corp" });
    expect(result).toEqual(client);
  });

  it("updateClient sends PUT with correct URL and body", async () => {
    const client = { id: 50, workspace_id: 100, name: "Acme Updated" };
    mockFetch.mockResolvedValueOnce(jsonResponse(client));

    const result = await api.updateClient(100, 50, { name: "Acme Updated" });

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients/50",
    );
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body)).toEqual({ name: "Acme Updated" });
    expect(result).toEqual(client);
  });

  it("deleteClient sends DELETE with correct URL", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse());

    await api.deleteClient(100, 50);

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients/50",
    );
    expect(opts.method).toBe("DELETE");
  });

  it("archiveClient sends POST to /archive with no body", async () => {
    const archiveResult = { items: [1, 2, 3] };
    mockFetch.mockResolvedValueOnce(jsonResponse(archiveResult));

    const result = await api.archiveClient(100, 50);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients/50/archive",
    );
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
    expect(result).toEqual(archiveResult);
  });

  it("restoreClient sends POST to /restore with no body by default", async () => {
    const client = { id: 50, workspace_id: 100, name: "Acme Corp" };
    mockFetch.mockResolvedValueOnce(jsonResponse(client));

    const result = await api.restoreClient(100, 50);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients/50/restore",
    );
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
    expect(result).toEqual(client);
  });

  it("restoreClient sends POST to /restore with optional body", async () => {
    const client = { id: 50, workspace_id: 100, name: "Acme Corp" };
    mockFetch.mockResolvedValueOnce(jsonResponse(client));

    const result = await api.restoreClient(100, 50, {
      projects: [1, 2],
      restore_all_projects: false,
    });

    const [url, opts] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe(
      "https://api.track.toggl.com/api/v9/workspaces/100/clients/50/restore",
    );
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      projects: [1, 2],
      restore_all_projects: false,
    });
    expect(result).toEqual(client);
  });
});
