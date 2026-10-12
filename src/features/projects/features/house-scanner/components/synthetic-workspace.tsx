import { HouseholdWorkspace } from '@/features/projects/features/house-scanner/components/household-workspace';
import { useDemoHousehold } from '@/features/projects/features/house-scanner/hooks/use-demo-household';
import { DEMO_USER_ID } from '@/features/projects/features/house-scanner/mock/synthetic-household';

export function SyntheticWorkspace() {
  const demo = useDemoHousehold();
  return (
    <HouseholdWorkspace
      snapshot={demo.snapshot}
      userId={DEMO_USER_ID}
      onSaveFavorite={demo.saveFavorite}
      onRemoveFavorite={demo.removeFavorite}
      onAddManual={demo.addManual}
      onSaveProfile={demo.saveProfile}
    />
  );
}
