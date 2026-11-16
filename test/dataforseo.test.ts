// SPDX-License-Identifier: MIT
import { expect, test } from "bun:test";
import { basicAuth, dataforseo, KeyRejected, OutOfFunds } from "../src/dataforseo";

const KEY = "me@example.com:s3cret:with-colon";
const ok = (result: unknown[], cost = 0.02) => Response.json({ status_code: 20000, status_message: "Ok.", cost, tasks: [{ status_code: 20000, status_message: "Ok.", result }] });

test("the key is login:password, turned into Basic auth; a password may hold a colon", () => {
  expect(basicAuth(KEY)).toBe(`Basic ${Buffer.from("me@example.com:s3cret:with-colon").toString("base64")}`);
  expect(basicAuth("  me@example.com : pw ")).toBe(`Basic ${Buffer.from("me@example.com:pw").toString("base64")}`);
  for (const bad of ["", "no-colon", ":pw", "login:"]) expect(() => basicAuth(bad), bad).toThrow(KeyRejected);
});

test("one task goes to api.dataforseo.com, and its results and cost come back", async () => {
  const calls: [string, RequestInit][] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => (calls.push([url, init]), ok([{ backlinks: 12 }]))) as unknown as typeof fetch;
  expect(await dataforseo(KEY, "backlinks/summary/live", { target: "example.com" }, fetchImpl)).toEqual({ results: [{ backlinks: 12 }], costUsd: 0.02 });
  expect(calls[0]![0]).toBe("https://api.dataforseo.com/v3/backlinks/summary/live");
  expect(calls[0]![1]).toMatchObject({ method: "POST", body: JSON.stringify([{ target: "example.com" }]) });
});

test("a refused login, an empty account and a failed task each throw their own way", async () => {
  const answer = (r: Response) => (async () => r) as unknown as typeof fetch;
  await expect(dataforseo(KEY, "x", {}, answer(new Response("", { status: 401 })))).rejects.toThrow(KeyRejected);
  await expect(dataforseo(KEY, "x", {}, answer(Response.json({ status_code: 40100, status_message: "You are not authorized" })))).rejects.toThrow(KeyRejected);
  await expect(dataforseo(KEY, "x", {}, answer(Response.json({ status_code: 40200, status_message: "Payment required" })))).rejects.toThrow(OutOfFunds);
  await expect(dataforseo(KEY, "x", {}, answer(Response.json({ status_code: 20000, status_message: "Ok.", tasks: [{ status_code: 40501, status_message: "Invalid Field", result: null }] })))).rejects.toThrow("Invalid Field (40501)");
  await expect(dataforseo(KEY, "x", {}, answer(Response.json({ status_code: 20000, status_message: "Ok.", tasks: [] })))).rejects.toThrow("no task");
  await expect(dataforseo(KEY, "x", {}, answer(new Response("<html>", { status: 502 })))).rejects.toThrow("502 with no readable body");
  await expect(dataforseo(KEY, "../v2/thing", {})).rejects.toThrow("not a DataForSEO path");
});
