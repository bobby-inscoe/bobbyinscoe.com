import {
  Badge,
  Button,
  Checkbox,
  Collapse,
  Flex,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';

import {
  ALL_HOSTS,
  activeFilterCount,
  emptyFilters,
  type ListingFilters,
} from '@/features/house-scanner/utils/listing-filters';

interface ListingFilterPanelProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  hosts: string[];
  shown: number;
  total: number;
}

export function ListingFilterPanel({
  filters,
  onChange,
  hosts,
  shown,
  total,
}: ListingFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters);
  function number(
    label: string,
    key:
      | 'minPriceMsek'
      | 'maxPriceMsek'
      | 'minAreaM2'
      | 'maxAreaM2'
      | 'minRooms',
    unit: string,
  ) {
    return (
      <NumberInput
        label={`${label} (${unit})`}
        value={filters[key] ?? ''}
        onChange={(value) =>
          onChange({
            ...filters,
            [key]: typeof value === 'number' ? value : null,
          })
        }
        min={0}
        allowNegative={false}
        hideControls
        flex="1 1 8rem"
      />
    );
  }
  return (
    <Stack gap="xs">
      <Flex gap="sm" align="center" wrap="wrap">
        <Button
          variant="default"
          aria-expanded={open}
          aria-controls="listing-filters"
          onClick={() => setOpen((current) => !current)}
        >
          Filters
        </Button>
        <Badge
          variant="light"
          color="gray"
          aria-label={`${active} active filters`}
        >
          {active} active
        </Badge>
      </Flex>
      <Collapse expanded={open} id="listing-filters">
        <Stack gap="sm">
          <Text size="sm">
            Filters are personal to this screen. They do not change the shared
            criteria and are not saved.
          </Text>
          <Flex gap="sm" wrap="wrap">
            {number('Min price', 'minPriceMsek', 'MSEK')}
            {number('Max price', 'maxPriceMsek', 'MSEK')}
            {number('Min living area', 'minAreaM2', 'm²')}
            {number('Max living area', 'maxAreaM2', 'm²')}
            {number('Minimum rooms', 'minRooms', 'rooms')}
            <Select
              label="Source"
              value={filters.host}
              onChange={(value) =>
                onChange({ ...filters, host: value ?? ALL_HOSTS })
              }
              data={[{ value: ALL_HOSTS, label: 'All sources' }, ...hosts]}
              comboboxProps={{ withinPortal: false }}
              flex="1 1 12rem"
            />
          </Flex>
          <Flex gap="md" wrap="wrap">
            <Checkbox
              label="Balcony or terrace only"
              checked={filters.outdoorOnly}
              onChange={(event) =>
                onChange({
                  ...filters,
                  outdoorOnly: event.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Above ground floor only"
              checked={filters.aboveGroundOnly}
              onChange={(event) =>
                onChange({
                  ...filters,
                  aboveGroundOnly: event.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Keep homes with unknown or disputed values"
              checked={filters.includeUnknown}
              onChange={(event) =>
                onChange({
                  ...filters,
                  includeUnknown: event.currentTarget.checked,
                })
              }
            />
          </Flex>
          <Flex gap="sm" align="center" wrap="wrap">
            <Button variant="default" onClick={() => onChange(emptyFilters)}>
              Clear filters
            </Button>
            <Text size="sm" role="status">
              Showing {shown} of {total} homes
            </Text>
          </Flex>
        </Stack>
      </Collapse>
    </Stack>
  );
}
