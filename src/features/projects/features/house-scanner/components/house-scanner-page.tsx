import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

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
          {demo && (
            <Button variant="default" onClick={() => setDemo(false)}>
              Leave demo
            </Button>
          )}
        </Group>
        {demo ? (
          <SyntheticWorkspace />
        ) : (
          <Stack align="flex-start">
            <Title order={2}>Private access is not configured</Title>
            <Text>
              Invitation-only sign-in will be available after the backend is
              configured. No household data is loaded.
            </Text>
            <Button onClick={() => setDemo(true)}>
              Explore the synthetic demo
            </Button>
            <Text size="sm">
              The demo contains fictional homes and people. Changes stay in
              memory and disappear when you leave.
            </Text>
          </Stack>
        )}
      </Stack>
    </ProjectFrame>
  );
}
