export interface BadgeInfo {
  emoji:       string;
  name:        string;
  description: string;
}

export const BADGES: Record<string, BadgeInfo> = {
  FIRST_TASK: {
    emoji:       '🎯',
    name:        'Первая задача',
    description: 'Закройте свою первую задачу',
  },
  ON_FIRE: {
    emoji:       '🔥',
    name:        'В ударе',
    description: '5 задач закрыто в срок подряд',
  },
  TEAM_PLAYER: {
    emoji:       '🤝',
    name:        'Командный игрок',
    description: 'Средний peer review ≥ 4.0 при минимум 3 отзывах',
  },
  PROJECT_DONE: {
    emoji:       '🏆',
    name:        'Проект завершён',
    description: 'Участник команды в завершённом проекте',
  },
};

export const ALL_BADGE_CODES = Object.keys(BADGES);

export function getBadge(code: string): BadgeInfo | undefined {
  return BADGES[code];
}
