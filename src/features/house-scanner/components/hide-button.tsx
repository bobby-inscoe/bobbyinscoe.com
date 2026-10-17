import { Button } from '@mantine/core';

// An eye, struck through while the home is still showing.
function EyeIcon({ struck }: { struck: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {struck && <path d="M3 3l18 18" />}
    </svg>
  );
}

interface HideButtonProps {
  listingId: string;
  hidden: boolean;
  // Takes the id so a list can share one handler, which keeps memoized cards from re-rendering.
  onToggle: (listingId: string) => void;
}

// Hiding is personal and only changes this member's view; it never touches favorites or notes.
export function HideButton({ listingId, hidden, onToggle }: HideButtonProps) {
  return (
    <Button
      size="xs"
      variant="subtle"
      color="gray"
      leftSection={<EyeIcon struck={!hidden} />}
      aria-label={hidden ? 'Show this home again' : 'Hide this home'}
      onClick={() => onToggle(listingId)}
    >
      {hidden ? 'Show again' : 'Hide'}
    </Button>
  );
}
