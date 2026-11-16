/**
 * Studio hours the panel sets in «Настройки». The schedule highlights them and warns
 * when a session is placed outside; everything else about booking stays on YCLIENTS.
 */
export interface WorkHours {
  /** 1 = Monday … 7 = Sunday. */
  days: number[];
  start: string;
  end: string;
  /** Default length of a new session in the calendar. */
  slotMinutes: number;
}

export const DEFAULT_WORK_HOURS: WorkHours = {
  days: [1, 2, 3, 4, 5, 6, 7],
  start: '10:00',
  end: '22:00',
  slotMinutes: 60,
};
