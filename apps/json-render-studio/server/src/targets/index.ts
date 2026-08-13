import { dashboardTarget } from './dashboard.js';
import type { GenerationTarget, TargetId } from './target.js';
import { webappTarget } from './webapp.js';

const targets: Record<TargetId, GenerationTarget> = {
  webapp: webappTarget,
  dashboard: dashboardTarget,
};

export const targetIds = Object.keys(targets) as TargetId[];

export function findTarget(id: string): GenerationTarget | undefined {
  return targets[id as TargetId];
}

export function listTargets(): Array<Pick<GenerationTarget, 'id' | 'label' | 'blurb'>> {
  return targetIds.map((id) => {
    const { label, blurb } = targets[id];
    return { id, label, blurb };
  });
}

export type { GenerationTarget, TargetId };
