import { Group, Stack, Text, Title } from '@mantine/core';

export function HighScoreList({ scores }: { scores: number[] }) {
  return (
    <Stack gap={6} align="center" w="100%">
      <Title order={2} ff="inherit" fz={13} tt="uppercase" c="flax.2">
        High Scores
      </Title>
      {scores.length === 0 ? (
        <Text size="sm" c="flax.2">
          No rounds played yet.
        </Text>
      ) : (
        <Stack
          component="ol"
          gap={3}
          p={0}
          w="100%"
          style={{ listStyle: 'none' }}
        >
          {scores.map((score, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rank position is the stable identity, not the score value.
            <Group component="li" key={index} justify="space-between">
              <Text component="span" size="sm">
                {index + 1}
              </Text>
              <Text component="span" size="sm">
                {score}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
