import { Box, Button, Group, Stack, Text, Title } from '@mantine/core';
import { AvatarArt } from '@/features/duck-feed/components/avatar-art';
import type { Avatar, RoundResult } from '@/features/duck-feed/types/game';

interface GameOverScreenProps {
  avatar: Avatar;
  result: RoundResult;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
}

export function GameOverScreen({
  avatar,
  result,
  onPlayAgain,
  onChangeSettings,
}: GameOverScreenProps) {
  return (
    <Stack
      className="GameOverScreen"
      role="status"
      aria-labelledby="duck-feed-game-over-heading"
      align="center"
      justify="center"
      gap="md"
      p="lg"
    >
      <AvatarArt avatar={avatar} />
      <Title order={2} id="duck-feed-game-over-heading" size="h2">
        Round over!
      </Title>
      <Text size="xl" fw={600}>
        {result.score} points
      </Text>
      {result.isNewHighScore && (
        <Text c="flax.3" fw={600}>
          New high score!
        </Text>
      )}
      <Group component="dl" justify="center" gap="xl">
        <Box>
          <Text component="dt" size="sm">
            Best combo
          </Text>
          <Text component="dd">x{result.bestCombo}</Text>
        </Box>
        <Box>
          <Text component="dt" size="sm">
            Bonus time gained
          </Text>
          <Text component="dd">
            {(result.bonusTimeGainedMs / 1000).toFixed(2)}s
          </Text>
        </Box>
      </Group>
      <Group justify="center">
        <Button color="flax.2" onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button variant="outline" color="flax.2" onClick={onChangeSettings}>
          Change Settings
        </Button>
      </Group>
    </Stack>
  );
}
