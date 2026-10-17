import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import {
  addManual,
  clearOwnedSessionStorage,
  createHouseholdClient,
  householdSnapshot,
  listingNotes,
  memberships,
  saveNote as saveNoteRequest,
  saveProfile,
  setFavorite,
  setRememberDevice,
} from '@/features/house-scanner/api/household-client';
import type {
  ManualSubmission,
  Member,
  SearchProfile,
  Snapshot,
} from '@/features/house-scanner/types/contracts';

const USERNAME_EMAIL_DOMAIN = 'house-scanner.bobbyinscoe.com';

export type HouseholdSessionState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'nonmember' }
  | { status: 'error'; message: string }
  | { status: 'choose-household'; memberships: Member[] }
  | { status: 'authenticated'; snapshot: Snapshot; userId: string };

export function useHouseholdSession() {
  const [connection] = useState<{
    client: SupabaseClient | null;
    error: string | null;
  }>(() => {
    try {
      return { client: createHouseholdClient(), error: null };
    } catch {
      return {
        client: null,
        error:
          'Browser storage is unavailable. Allow site storage, then reload to sign in.',
      };
    }
  });
  const client = connection.client;
  const [state, setState] = useState<HouseholdSessionState>(
    connection.error
      ? { status: 'error', message: connection.error }
      : { status: client ? 'loading' : 'unconfigured' },
  );
  const userId = useRef<string | null>(null);
  const householdId = useRef<string | null>(null);
  const generation = useRef(0);
  const sessionGeneration = useRef(0);
  const signedOut = useRef(false);
  const mounted = useRef(false);
  const fail = useCallback((message: string) => {
    generation.current += 1;
    sessionGeneration.current += 1;
    userId.current = null;
    householdId.current = null;
    if (mounted.current) setState({ status: 'error', message });
  }, []);
  const refresh = useCallback(async () => {
    if (!client || signedOut.current) return;
    const ticket = ++generation.current;
    if (mounted.current)
      setState((previous) =>
        previous.status === 'authenticated' &&
        previous.userId === userId.current &&
        previous.snapshot.householdId === householdId.current
          ? previous
          : { status: 'loading' },
      );
    try {
      const { data, error } = await client.auth.getUser();
      if (!mounted.current || ticket !== generation.current) return;
      if (error || !data.user) {
        sessionGeneration.current += 1;
        userId.current = null;
        householdId.current = null;
        if (mounted.current && ticket === generation.current)
          setState({ status: 'signed-out' });
        return;
      }
      if (userId.current && userId.current !== data.user.id) {
        sessionGeneration.current += 1;
        signedOut.current = true;
        householdId.current = null;
        setState({ status: 'loading' });
        clearOwnedSessionStorage();
        const { error: signOutError } = await client.auth.signOut({
          scope: 'local',
        });
        if (signOutError && mounted.current && ticket === generation.current)
          fail('Session changed. Sign out and try again.');
        return;
      }
      userId.current = data.user.id;
      const own = await memberships(client);
      if (!mounted.current || ticket !== generation.current) return;
      if (own.some((member) => member.userId !== data.user.id))
        throw new Error('Membership belongs to another account.');
      if (own.length === 0) {
        householdId.current = null;
        setState({ status: 'nonmember' });
        return;
      }
      if (!own.some((member) => member.householdId === householdId.current))
        householdId.current = null;
      if (!householdId.current && own.length > 1) {
        setState({ status: 'choose-household', memberships: own });
        return;
      }
      const selected = householdId.current ?? own[0].householdId;
      householdId.current = selected;
      const snapshot = await householdSnapshot(
        client,
        selected,
        data.user.id,
        own,
      );
      if (mounted.current && ticket === generation.current)
        // An unchanged poll keeps the old object, so the workspace does not re-render every card.
        setState((previous) =>
          previous.status === 'authenticated' &&
          previous.userId === data.user.id &&
          JSON.stringify(previous.snapshot) === JSON.stringify(snapshot)
            ? previous
            : { status: 'authenticated', snapshot, userId: data.user.id },
        );
    } catch {
      if (mounted.current && ticket === generation.current)
        fail('Could not load your household. Retry or sign out.');
    }
  }, [client, fail]);
  useEffect(() => {
    mounted.current = true;
    if (!client)
      return () => {
        mounted.current = false;
      };
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        generation.current += 1;
        sessionGeneration.current += 1;
        signedOut.current = true;
        userId.current = null;
        householdId.current = null;
        if (mounted.current) setState({ status: 'signed-out' });
        try {
          clearOwnedSessionStorage();
        } catch {
          fail(
            'Signed out, but browser storage could not be cleared. Close this tab and clear site data.',
          );
        }
      } else if (
        session &&
        userId.current &&
        userId.current !== session.user.id
      ) {
        generation.current += 1;
        sessionGeneration.current += 1;
        signedOut.current = true;
        householdId.current = null;
        if (mounted.current)
          setState((previous) =>
            previous.status === 'authenticated' &&
            previous.userId === userId.current &&
            previous.snapshot.householdId === householdId.current
              ? previous
              : { status: 'loading' },
          );
        try {
          clearOwnedSessionStorage();
        } catch {
          fail(
            'Session changed, but browser storage could not be cleared. Close this tab and clear site data.',
          );
        }
        queueMicrotask(() => {
          void client.auth.signOut({ scope: 'local' }).then(({ error }) => {
            if (error) fail('Session changed. Sign out and try again.');
          });
        });
      } else if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED'
      ) {
        if (event === 'SIGNED_IN') signedOut.current = false;
        queueMicrotask(() => {
          if (mounted.current) void refresh();
        });
      }
    });
    // Data changes about once a day and own saves refresh themselves, so returning to the tab is enough; no timer polls.
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      mounted.current = false;
      generation.current += 1;
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [client, refresh, fail]);
  // The access code is the password the owner set for this member's user, so no email is sent.
  // A bare username signs in as <username>@USERNAME_EMAIL_DOMAIN, the address the owner gave that user.
  async function signInWithCode(
    login: string,
    code: string,
    remember: boolean,
  ) {
    if (!client) throw new Error('Private access is not configured.');
    const name = login.trim();
    const address = z
      .email()
      .max(254)
      .safeParse(
        name.includes('@')
          ? name
          : `${name.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`,
      );
    if (!address.success || code.length < 6 || code.length > 72)
      throw new Error('Enter your email or username and access code.');
    setRememberDevice(remember);
    const { error } = await client.auth.signInWithPassword({
      email: address.data,
      password: code,
    });
    if (error)
      throw new Error('The email, username or access code was not accepted.');
    await refresh();
  }
  async function signOut() {
    generation.current += 1;
    sessionGeneration.current += 1;
    signedOut.current = true;
    householdId.current = null;
    userId.current = null;
    setState({ status: client ? 'signed-out' : 'unconfigured' });
    try {
      if (client) {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error)
          throw new Error(
            'Could not finish signing out. Close this tab and clear site data.',
          );
      }
    } finally {
      clearOwnedSessionStorage();
    }
  }
  // Throws unless this render's identity is still the live one. The returned
  // active() turns false once sign-out, a user or household switch, or unmount
  // supersedes the request, so late results can be dropped.
  function beginActive() {
    if (
      !client ||
      state.status !== 'authenticated' ||
      userId.current !== state.userId ||
      householdId.current !== state.snapshot.householdId
    )
      throw new Error('Reload your household before making a change.');
    const ticket = sessionGeneration.current;
    const owner = state.userId;
    const household = state.snapshot.householdId;
    return {
      client,
      householdId: household,
      active: () =>
        mounted.current &&
        ticket === sessionGeneration.current &&
        userId.current === owner &&
        householdId.current === household,
    };
  }
  async function mutate(
    action: (
      activeClient: SupabaseClient,
      activeHouseholdId: string,
    ) => Promise<object>,
  ) {
    const scope = beginActive();
    try {
      await action(scope.client, scope.householdId);
      if (scope.active()) await refresh();
    } catch (error) {
      if (scope.active())
        fail('The change could not be saved. Reload before trying again.');
      throw error;
    }
  }
  // Notes are read and written outside mutate(): a failed or conflicting note
  // request must leave the workspace on screen, so it never calls fail() or refresh().
  async function loadNotes(listingId: string) {
    const scope = beginActive();
    try {
      const notes = await listingNotes(
        scope.client,
        scope.householdId,
        listingId,
      );
      return scope.active() ? notes : null;
    } catch (error) {
      if (scope.active()) throw error;
      return null;
    }
  }
  async function saveNote(listingId: string, body: string, revision: number) {
    const scope = beginActive();
    try {
      const saved = await saveNoteRequest(
        scope.client,
        scope.householdId,
        listingId,
        body,
        revision,
      );
      return scope.active() ? saved.revision : null;
    } catch (error) {
      if (scope.active()) throw error;
      return null;
    }
  }
  return {
    state,
    signInWithCode,
    signOut,
    refresh,
    selectHousehold: async (id: string) => {
      householdId.current = z.uuid().parse(id);
      await refresh();
    },
    onSaveFavorite: (id: string) =>
      mutate((active, household) => setFavorite(active, household, id, true)),
    onRemoveFavorite: (id: string) =>
      mutate((active, household) => setFavorite(active, household, id, false)),
    onAddManual: (value: ManualSubmission) =>
      mutate((active, household) => addManual(active, household, value)),
    onSaveProfile: (value: SearchProfile) =>
      mutate((active, household) => saveProfile(active, household, value)),
    onLoadNotes: loadNotes,
    onSaveNote: saveNote,
  };
}
