// SPDX-License-Identifier: MIT
// The DataForSEO v3 API (r71), the backlinks plugin's one data source. A Workspace connects it as
// one API key, `login:password`, because third-party plugins connect with one key (ADR 0026); this
// turns that key into the Basic header DataForSEO expects. The key goes to api.dataforseo.com only.

export const DATAFORSEO_HOST = "api.dataforseo.com";

/** DataForSEO refused the login: a person must connect the key again. */
export class KeyRejected extends Error {}
/** The account can't pay for the call. */
export class OutOfFunds extends Error {}

/** `login:password` as a Basic authorization header. The password may itself hold a colon. */
export function basicAuth(key: string): string {
  const i = key.indexOf(":");
  const login = i > 0 ? key.slice(0, i).trim() : "";
  const password = i > 0 ? key.slice(i + 1).trim() : "";
  if (!login || !password) throw new KeyRejected("DataForSEO's key is its API login and password, as login:password");
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

type Task<T> = { status_code: number; status_message: string; cost?: number; result: T[] | null };
type Envelope<T> = { status_code: number; status_message: string; cost?: number; tasks?: Task<T>[] };

export type Answer<T> = { results: T[]; costUsd: number };

/**
 * POSTs one task to a v3 endpoint, such as `backlinks/summary/live`, and returns its results and what
 * DataForSEO charged. Any status other than 20000, on the call or the task, throws with its message.
 */
export async function dataforseo<T>(key: string, path: string, task: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<Answer<T>> {
  if (!/^[a-z0-9_]+(\/[a-z0-9_]+)*$/.test(path)) throw new Error(`not a DataForSEO path: ${path}`);
  const res = await fetchImpl(`https://${DATAFORSEO_HOST}/v3/${path}`, {
    method: "POST",
    headers: { authorization: basicAuth(key), "content-type": "application/json" },
    body: JSON.stringify([task]),
  });
  if (res.status === 401) throw new KeyRejected("DataForSEO refused the login and password");
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new Error(`DataForSEO answered ${res.status} with no readable body`);
  }
  if (body.status_code === 40100) throw new KeyRejected(body.status_message);
  if (body.status_code === 40200 || body.status_code === 40210) throw new OutOfFunds(body.status_message);
  if (body.status_code !== 20000) throw new Error(`DataForSEO: ${body.status_message} (${body.status_code})`);
  const t = body.tasks?.[0];
  if (!t) throw new Error("DataForSEO answered with no task");
  if (t.status_code !== 20000) throw new Error(`DataForSEO: ${t.status_message} (${t.status_code})`);
  return { results: t.result ?? [], costUsd: body.cost ?? t.cost ?? 0 };
}
