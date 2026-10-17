// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitAuth,
  fixtureSnapshot,
  reply,
  resetSdk,
  sdk,
  USER_ID,
} from '@/features/house-scanner/api/session-test-helpers';
import { useHouseholdSession } from '@/features/house-scanner/hooks/use-household-session';

vi.mock('@supabase/supabase-js', async () => {
  const fake = await import(
    '@/features/house-scanner/api/session-test-helpers'
  );
  return { createClient: fake.createClient };
});

// What the app asks the server for. Everything the workspace shows arrives with the first load, so
// nothing the member does afterwards (tabbing back, opening details) should need another request.
beforeEach(resetSdk);
afterEach(cleanup);

const names = () => sdk.rpc.mock.calls.map(([name]) => name);
const requests = () => ({
  users: sdk.auth.getUser.mock.calls.length,
  rpc: names(),
});

async function authenticated() {
  const hook = renderHook(useHouseholdSession);
  act(() => emitAuth('INITIAL_SESSION'));
  await waitFor(() =>
    expect(hook.result.current.state.status).toBe('authenticated'),
  );
  return hook;
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('requests made by a signed-in session', () => {
  it('loads the household once at the start, even when the SDK announces the session twice', async () => {
    const hook = renderHook(useHouseholdSession);
    act(() => {
      emitAuth('INITIAL_SESSION');
      emitAuth('SIGNED_IN');
    });
    await waitFor(() =>
      expect(hook.result.current.state.status).toBe('authenticated'),
    );
    await settle();
    expect(requests()).toEqual({
      users: 1,
      rpc: ['hs_memberships', 'hs_snapshot'],
    });
  });

  it('asks for nothing when the SDK repeats SIGNED_IN, TOKEN_REFRESHED or INITIAL_SESSION', async () => {
    await authenticated();
    const before = requests();
    for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION']) {
      act(() => emitAuth(event));
      await settle();
    }
    expect(requests()).toEqual(before);
  });

  it('asks for nothing when the window regains focus or the tab becomes visible', async () => {
    await authenticated();
    const before = requests();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await settle();
    expect(requests()).toEqual(before);
  });

  it('asks for nothing while the tab stays open', async () => {
    vi.useFakeTimers();
    try {
      const hook = renderHook(useHouseholdSession);
      act(() => emitAuth('INITIAL_SESSION'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const before = requests();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      });
      expect(requests()).toEqual(before);
      expect(hook.result.current.state.status).toBe('authenticated');
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads once when the SDK announces the session during sign-in', async () => {
    sdk.auth.signInWithPassword.mockImplementationOnce(async () => {
      emitAuth('SIGNED_IN');
      return { error: null };
    });
    const hook = renderHook(useHouseholdSession);
    await act(() =>
      hook.result.current.signInWithCode(
        'casey@example.com',
        '48291736',
        false,
      ),
    );
    await settle();
    expect(hook.result.current.state.status).toBe('authenticated');
    expect(requests()).toEqual({
      users: 1,
      rpc: ['hs_memberships', 'hs_snapshot'],
    });
  });

  it('re-reads only the snapshot after the member saves something', async () => {
    const hook = await authenticated();
    const [listing] = fixtureSnapshot().listings;
    const before = requests();
    await act(() => hook.result.current.onSaveFavorite(listing.id));
    expect(sdk.auth.getUser.mock.calls.length).toBe(before.users);
    expect(names().slice(before.rpc.length)).toEqual([
      'hs_set_favorite',
      'hs_snapshot',
    ]);
  });
});

describe('notes come with the snapshot', () => {
  const noteRow = (listingId: string, body: string, revision = 1) => ({
    listingId,
    userId: USER_ID,
    body,
    revision,
    editedAt: '2026-10-17T10:00:00.000Z',
  });

  it('opens a listing’s notes from memory without any request', async () => {
    const [first, second] = fixtureSnapshot().listings;
    sdk.rpc.mockImplementation(async (name) => {
      if (name === 'hs_memberships')
        return reply([fixtureSnapshot().members[0]]);
      if (name === 'hs_snapshot')
        return reply({
          ...fixtureSnapshot(),
          notes: [noteRow(first.id, 'About the first home')],
        });
      return reply({ ok: true });
    });
    const hook = await authenticated();
    const before = names().length;
    await expect(hook.result.current.onLoadNotes(first.id)).resolves.toEqual([
      {
        userId: USER_ID,
        body: 'About the first home',
        revision: 1,
        editedAt: '2026-10-17T10:00:00.000Z',
      },
    ]);
    await expect(hook.result.current.onLoadNotes(second.id)).resolves.toEqual(
      [],
    );
    expect(names()).toHaveLength(before);
  });

  it('treats a snapshot without a notes field as having no notes', async () => {
    const hook = await authenticated();
    const before = names().length;
    await expect(
      hook.result.current.onLoadNotes(fixtureSnapshot().listings[0].id),
    ).resolves.toEqual([]);
    expect(names()).toHaveLength(before);
  });

  it('saves a note and then re-reads only the snapshot, which carries the new note', async () => {
    const [first] = fixtureSnapshot().listings;
    let saved = false;
    sdk.rpc.mockImplementation(async (name) => {
      if (name === 'hs_memberships')
        return reply([fixtureSnapshot().members[0]]);
      if (name === 'hs_save_note') {
        saved = true;
        return reply({ revision: 1 });
      }
      if (name === 'hs_snapshot')
        return reply({
          ...fixtureSnapshot(),
          notes: saved ? [noteRow(first.id, 'Saved text')] : [],
        });
      return reply({ ok: true });
    });
    const hook = await authenticated();
    const before = names().length;
    await expect(
      hook.result.current.onSaveNote(first.id, 'Saved text', 0),
    ).resolves.toBe(1);
    expect(names().slice(before)).toEqual(['hs_save_note', 'hs_snapshot']);
    const reread = await hook.result.current.onLoadNotes(first.id);
    expect(reread?.map((note) => note.body)).toEqual(['Saved text']);
    expect(names().slice(before)).toEqual(['hs_save_note', 'hs_snapshot']);
  });
});
