import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useState } from 'react';

import {
  type Criteria,
  criteriaSchema,
  type SearchProfile,
} from '@/features/house-scanner/types/contracts';
import { formatDate } from '@/features/house-scanner/utils/workspace-view';

export function ProfileEditor({
  profile,
  canEdit,
  onSave,
}: {
  profile: SearchProfile;
  canEdit: boolean;
  onSave?: (profile: SearchProfile) => Promise<void>;
}) {
  const [criteria, setCriteria] = useState(profile.criteria);
  const [enabled, setEnabled] = useState(profile.enabled);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  function numeric(
    key:
      | 'minAreaM2'
      | 'maxAreaM2'
      | 'minRooms'
      | 'preferredPriceSek'
      | 'stretchPriceSek'
      | 'feeReferenceSek',
    label: string,
  ) {
    return (
      <NumberInput
        key={key}
        label={label}
        value={criteria[key] ?? ''}
        min={0}
        disabled={!canEdit || !onSave}
        onChange={(value) =>
          setCriteria((current) => ({
            ...current,
            [key]:
              typeof value === 'number'
                ? value
                : key === 'maxAreaM2'
                  ? null
                  : 0,
          }))
        }
      />
    );
  }
  function toggle(
    key:
      | 'excludeGroundFloor'
      | 'requireLift'
      | 'requireOutdoor'
      | 'preferGlazing',
    label: string,
  ) {
    return (
      <Checkbox
        key={key}
        label={label}
        checked={criteria[key]}
        disabled={!canEdit || !onSave}
        onChange={(event) => {
          const checked = event.currentTarget.checked;
          setCriteria((current) => ({ ...current, [key]: checked }));
        }}
      />
    );
  }
  function nestedNumber(
    section: 'nature' | 'transit' | 'geography',
    key: string,
    label: string,
    value: number,
  ) {
    return (
      <NumberInput
        label={label}
        value={value}
        disabled={!canEdit || !onSave}
        onChange={(next) =>
          setCriteria((current) => ({
            ...current,
            [section]: {
              ...current[section],
              [key]: typeof next === 'number' ? next : 0,
            },
          }))
        }
      />
    );
  }
  async function save() {
    const result = criteriaSchema.safeParse(criteria);
    if (!result.success) {
      setMessage(result.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    if (!canEdit || !onSave) return;
    setBusy(true);
    try {
      await onSave({ ...profile, enabled, criteria: result.data });
      setMessage(
        'Profile saved. Stored homes are re-evaluated against the saved criteria. Collection coverage is unchanged.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save criteria. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  function setType(type: Criteria['propertyTypes'][number], checked: boolean) {
    setCriteria((current) => ({
      ...current,
      propertyTypes: checked
        ? [...new Set([...current.propertyTypes, type])]
        : current.propertyTypes.filter((value) => value !== type),
    }));
  }
  return (
    <Paper withBorder p="md">
      <Stack>
        <Title order={3}>{profile.name}</Title>
        <Text size="sm">
          Revision {profile.revision} · edited {formatDate(profile.editedAt)}
        </Text>
        <Checkbox
          label="Enabled search profile"
          checked={enabled}
          disabled={!canEdit || !onSave}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
        />
        <Group grow>
          {numeric('preferredPriceSek', 'Preferred budget (SEK)')}
          {numeric('stretchPriceSek', 'Stretch budget (SEK)')}
        </Group>
        <Group grow>
          {numeric('minAreaM2', 'Minimum living area (m²)')}
          {numeric('maxAreaM2', 'Maximum living area (m², optional)')}
          {numeric('minRooms', 'Minimum rooms')}
        </Group>
        <Group>
          <Checkbox
            label="Apartments"
            checked={criteria.propertyTypes.includes('apartment')}
            disabled={!canEdit || !onSave}
            onChange={(event) =>
              setType('apartment', event.currentTarget.checked)
            }
          />
          <Checkbox
            label="Houses"
            checked={criteria.propertyTypes.includes('house')}
            disabled={!canEdit || !onSave}
            onChange={(event) => setType('house', event.currentTarget.checked)}
          />
        </Group>
        <Text size="sm">Apartment rules</Text>
        {toggle(
          'excludeGroundFloor',
          'Exclude confirmed ground-floor apartments',
        )}
        {toggle('requireLift', 'Require a lift')}
        {toggle('requireOutdoor', 'Require a balcony or terrace')}
        {toggle(
          'preferGlazing',
          'Prefer glazed outdoor space (exceptions stay visible)',
        )}
        {numeric('feeReferenceSek', 'Monthly fee reference (SEK, a cost flag)')}
        <TextInput
          label="Municipalities (comma separated)"
          value={criteria.geography.municipalities.join(', ')}
          disabled={!canEdit || !onSave}
          onChange={(event) => {
            const values = event.currentTarget.value
              .split(',')
              .map((value) => value.trim());
            setCriteria((current) => ({
              ...current,
              geography: { ...current.geography, municipalities: values },
            }));
          }}
        />
        <Group grow>
          {([0, 1] as const).map((index) => (
            <NumberInput
              key={index}
              label={
                index === 0 ? 'Scope centre longitude' : 'Scope centre latitude'
              }
              value={criteria.geography.center[index]}
              disabled={!canEdit || !onSave}
              onChange={(next) =>
                setCriteria((current) => {
                  const center: [number, number] = [
                    ...current.geography.center,
                  ];
                  center[index] = typeof next === 'number' ? next : 0;
                  return {
                    ...current,
                    geography: { ...current.geography, center },
                  };
                })
              }
            />
          ))}
          {nestedNumber(
            'geography',
            'radiusKm',
            'Geographic radius (km)',
            criteria.geography.radiusKm,
          )}
        </Group>
        <Checkbox
          label="Prefer immediate greenery"
          checked={criteria.nature.preferImmediateGreenery}
          disabled={!canEdit || !onSave}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            setCriteria((current) => ({
              ...current,
              nature: { ...current.nature, preferImmediateGreenery: checked },
            }));
          }}
        />
        {nestedNumber(
          'nature',
          'preferredWalkMinutes',
          'Preferred walk to substantial nature (minutes)',
          criteria.nature.preferredWalkMinutes,
        )}
        <Text size="sm" c="dimmed">
          Walking times are preferences, not measured distances.
        </Text>
        <Group grow>
          {nestedNumber(
            'transit',
            'preferredWalkMinutes',
            'Preferred walk to transit (minutes)',
            criteria.transit.preferredWalkMinutes,
          )}
          {nestedNumber(
            'transit',
            'preferredJourneyMinutes',
            'Preferred journey (minutes)',
            criteria.transit.preferredJourneyMinutes,
          )}
          {nestedNumber(
            'transit',
            'tradeoffJourneyMinutes',
            'Trade-off journey (minutes)',
            criteria.transit.tradeoffJourneyMinutes,
          )}
        </Group>
        <Button disabled={!canEdit || !onSave} loading={busy} onClick={save}>
          Save criteria
        </Button>
        {!canEdit && (
          <Text size="sm">
            Only household owners can change shared criteria.
          </Text>
        )}
        {canEdit && !onSave && (
          <Text size="sm">Profile changes are unavailable in this view.</Text>
        )}
        <Text role="status">{message}</Text>
      </Stack>
    </Paper>
  );
}
