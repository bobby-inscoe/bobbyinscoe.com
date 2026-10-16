import type { LiveDeps, LiveEvent } from '@house-scanner-tools/live-reader';
import { vi } from 'vitest';

// A scripted fetch and a fake clock for the guarded reader. The clock only moves when the reader sleeps.
export type Reply = { status?: number; body?: string; type?: string } | Error;
export function fakeFetch(handler: (url: string, call: number) => Reply) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = vi.fn(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      const reply = handler(url, calls.length);
      if (reply instanceof Error) throw reply;
      return new Response(reply.body ?? '', {
        status: reply.status ?? 200,
        headers: { 'content-type': reply.type ?? 'text/html; charset=utf-8' },
      });
    },
  );
  return { impl: impl as unknown as typeof fetch, calls, spy: impl };
}
export function deps(
  fetchImpl: typeof fetch,
  events: LiveEvent[] = [],
  random: () => number = () => 0,
): LiveDeps {
  let clock = 0;
  return {
    fetch: fetchImpl,
    now: () => 1_760_000_000_000 + clock,
    random,
    sleep: async (ms) => {
      clock += ms;
    },
    log: (event) => events.push(event),
  };
}
