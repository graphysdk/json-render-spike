import { dashboardTarget } from './dashboard-target';
import type { StudioTarget } from './studio-target';
import { webappTarget } from './webapp-target';

const targets: StudioTarget[] = [webappTarget, dashboardTarget];

export function findStudioTarget(id: string): StudioTarget | undefined {
  return targets.find((target) => target.id === id);
}

export type { StudioIssue, StudioTarget } from './studio-target';
