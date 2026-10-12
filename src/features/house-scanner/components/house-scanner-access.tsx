import {
  Alert,
  Button,
  Checkbox,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { type ReactNode, useState } from 'react';

import { useHouseholdSession } from '@/features/house-scanner/hooks/use-household-session';
import type {
  ManualSubmission,
  SearchProfile,
  Snapshot,
} from '@/features/house-scanner/types/contracts';

export interface AuthenticatedHousehold {
  snapshot: Snapshot;
  userId: string;
  onSaveFavorite: (listingId: string) => Promise<void>;
  onRemoveFavorite: (listingId: string) => Promise<void>;
  onAddManual: (submission: ManualSubmission) => Promise<void>;
  onSaveProfile: (profile: SearchProfile) => Promise<void>;
}
export function HouseScannerAccess({
  children,
}: {
  children: (household: AuthenticatedHousehold) => ReactNode;
}) {
  const session = useHouseholdSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Request failed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  const state = session.state;
  if (state.status === 'unconfigured')
    return (
      <Stack>
        <Title order={2}>Private access is not configured</Title>
        <Text>No household data is loaded.</Text>
      </Stack>
    );
  return (
    <Stack gap="md">
      {message && <Alert role="alert">{message}</Alert>}
      {state.status === 'authenticated' ? (
        <>
          <Group justify="flex-end">
            <Button
              variant="default"
              loading={busy}
              onClick={() => void perform(session.signOut)}
            >
              Sign out
            </Button>
          </Group>
          {children({
            snapshot: state.snapshot,
            userId: state.userId,
            onSaveFavorite: session.onSaveFavorite,
            onRemoveFavorite: session.onRemoveFavorite,
            onAddManual: session.onAddManual,
            onSaveProfile: session.onSaveProfile,
          })}
        </>
      ) : state.status === 'loading' ? (
        <Text role="status">Loading your household…</Text>
      ) : state.status === 'signed-out' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void perform(async () => {
              if (requested) {
                await session.verifyCode(email, code);
                setCode('');
                setEmail('');
                setRequested(false);
              } else {
                await session.requestCode(email, remember);
                setRequested(true);
              }
            });
          }}
        >
          <Stack align="flex-start" gap="md">
            <Title order={2}>Sign in with your invited email</Title>
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={requested || busy}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <Checkbox
              label="Remember this device"
              description="Leave off on shared devices."
              checked={remember}
              disabled={requested || busy}
              onChange={(event) => setRemember(event.currentTarget.checked)}
            />
            {requested && (
              <>
                <Text>
                  If this address is invited, a code will arrive shortly.
                </Text>
                <TextInput
                  label="Six-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.currentTarget.value)}
                />
              </>
            )}
            <Group>
              <Button type="submit" loading={busy}>
                {requested ? 'Verify code' : 'Request code'}
              </Button>
              {requested && (
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => {
                    setRequested(false);
                    setCode('');
                  }}
                >
                  Request another code
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      ) : state.status === 'choose-household' ? (
        <Stack>
          <Text>Choose a household.</Text>
          {state.memberships.map((member) => (
            <Button
              key={member.householdId}
              loading={busy}
              onClick={() =>
                void perform(() => session.selectHousehold(member.householdId))
              }
            >
              {member.displayName} · {member.householdId.slice(0, 8)}
            </Button>
          ))}
        </Stack>
      ) : (
        <Stack align="flex-start">
          <Text role="alert">
            {state.status === 'nonmember'
              ? 'This account has no active household membership. Ask the household owner to restore access.'
              : state.message}
          </Text>
          <Group>
            <Button
              loading={busy}
              onClick={() => void perform(session.refresh)}
            >
              Retry
            </Button>
            <Button
              variant="default"
              loading={busy}
              onClick={() => void perform(session.signOut)}
            >
              Sign out
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
