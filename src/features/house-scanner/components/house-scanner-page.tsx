import { Anchor, Button, Flex, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { HouseScannerAccess } from '@/features/house-scanner/components/house-scanner-access';
import { HouseholdWorkspace } from '@/features/house-scanner/components/household-workspace';
import { SyntheticWorkspace } from '@/features/house-scanner/components/synthetic-workspace';

export function HouseScannerPage() {
  const [demo, setDemo] = useState(false);
  return (
    <Flex
      component="main"
      justify="center"
      p={{ base: 'md', md: 'xl' }}
      mih="100svh"
    >
      <Stack w="100%" maw={1440} gap="lg">
        <Anchor component={Link} to="/" style={{ alignSelf: 'flex-start' }}>
          ← Back to the workshop
        </Anchor>
        <Group justify="space-between">
          <div>
            <Title order={1}>House Scanner</Title>
            <Text>A private shared home shortlist.</Text>
          </div>
          <Button variant="subtle" onClick={() => setDemo(!demo)}>
            {demo ? 'Leave demo' : 'Explore the synthetic demo'}
          </Button>
        </Group>
        {demo ? (
          <SyntheticWorkspace />
        ) : (
          <HouseScannerAccess>
            {(household) => (
              <HouseholdWorkspace
                key={`${household.snapshot.householdId}:${household.userId}`}
                {...household}
              />
            )}
          </HouseScannerAccess>
        )}
      </Stack>
    </Flex>
  );
}
