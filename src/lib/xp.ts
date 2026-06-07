import { XP_LEVELS } from "@/constants";

export function calculateLevel(totalXp: number): number {
  let level = 1;
  for (const entry of XP_LEVELS) {
    if (totalXp >= entry.xpRequired) {
      level = entry.level;
    } else {
      break;
    }
  }
  return level;
}

export function getXpForNextLevel(currentLevel: number): number {
  const nextLevel = XP_LEVELS.find((l) => l.level === currentLevel + 1);
  return nextLevel?.xpRequired ?? XP_LEVELS[XP_LEVELS.length - 1].xpRequired;
}

export function getXpForCurrentLevel(currentLevel: number): number {
  const current = XP_LEVELS.find((l) => l.level === currentLevel);
  return current?.xpRequired ?? 0;
}

export function getXpProgress(totalXp: number): number {
  const level = calculateLevel(totalXp);
  const currentLevelXp = getXpForCurrentLevel(level);
  const nextLevelXp = getXpForNextLevel(level);

  if (nextLevelXp === currentLevelXp) return 100;

  const progress =
    ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
