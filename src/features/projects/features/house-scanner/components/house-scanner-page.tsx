import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

import { HouseScannerAccess } from '@/features/projects/features/house-scanner/components/house-scanner-access';
import { HouseholdWorkspace } from '@/features/projects/features/house-scanner/components/household-workspace';
import { SyntheticWorkspace } from '@/features/projects/features/house-scanner/components/synthetic-workspace';
import { ProjectFrame } from '@/shared/patterns/project-frame';

export function HouseScannerPage() {
  const [demo, setDemo] = useState(false);
  return (
    <ProjectFrame
      mode="application"
      title="House Scanner"
      accent={null}
      accentLight={null}
      backTo="/projects"
    >
      <Stack p="lg" gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>House Scanner</Title>
            <Text>A private shared home shortlist.</Text>
          </div>
          <Button variant="default" onClick={() => setDemo(!demo)}>
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
    </ProjectFrame>
  );
}
