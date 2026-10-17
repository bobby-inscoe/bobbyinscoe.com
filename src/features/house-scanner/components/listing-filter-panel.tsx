import {
  Button,
  Checkbox,
  Collapse,
  Flex,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';

import {
  ALL_HOSTS,
  emptyFilters,
  type ListingFilters,
} from '@/features/house-scanner/utils/listing-filters';

interface ListingFilterPanelProps {
  // The Filters toggle lives in the listings controls row.
  open: boolean;
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  hosts: string[];
  shown: number;
  total: number;
}

export function ListingFilterPanel({
  open,
  filters,
  onChange,
  hosts,
  shown,
  total,
}: ListingFilterPanelProps) {
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
    <Collapse expanded={open} id="listing-filters">
      <Stack gap="sm">
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
            label="Lift only"
            checked={filters.liftOnly}
            onChange={(event) =>
              onChange({ ...filters, liftOnly: event.currentTarget.checked })
            }
          />
          <Checkbox
            label="Glazed only"
            checked={filters.glazedOnly}
            onChange={(event) =>
              onChange({ ...filters, glazedOnly: event.currentTarget.checked })
            }
          />
          <Checkbox
            label="Not on the map only"
            checked={filters.notOnMapOnly}
            onChange={(event) =>
              onChange({
                ...filters,
                notOnMapOnly: event.currentTarget.checked,
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
  );
}
