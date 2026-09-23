import type { ManagedContentState } from '../../shared/contracts/content-management';

export function createEmptyManagedContentState(): ManagedContentState {
  return {
    assets: [],
    assetVersions: [],
    placements: [],
    placementVersions: [],
    reviews: [],
    publications: [],
    audits: [],
    currentPublicationByPlacement: {},
  };
}

