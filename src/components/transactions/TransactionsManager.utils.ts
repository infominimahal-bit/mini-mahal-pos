import { Sale } from '../../types';
import {
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getStartOfInputDayInTimezone,
  getEndOfInputDayInTimezone,
} from '../../lib/dateUtils';

export const isDraftSale = (sale: Sale) =>
  (sale.invoiceNumber && sale.invoiceNumber.startsWith('DRAFT-')) ||
  sale.notes?.includes('Draft sale') ||
  sale.notes?.includes('DRAFT_SALE');

export const computeDateRange = (
  dateFilter: string,
  startDateInput: string,
  endDateInput: string,
  timezone: string,
): { startTs: number; endTs: number } => {
  const now = new Date();
  let start: number;
  let end: number;
  if (dateFilter === 'custom') {
    start = startDateInput ? getStartOfInputDayInTimezone(startDateInput, timezone).getTime() : 0;
    end = endDateInput ? getEndOfInputDayInTimezone(endDateInput, timezone).getTime() : Infinity;
  } else if (dateFilter === 'all') {
    start = new Date(Date.UTC(2000, 0, 1)).getTime();
    end = Infinity;
  } else {
    const dateMap: Record<string, () => { start: Date; end: Date }> = {
      'today': () => ({ start: getStartOfDayInTimezone(now, timezone), end: getEndOfDayInTimezone(now, timezone) }),
      'yesterday': () => {
        const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return { start: getStartOfDayInTimezone(y, timezone), end: getEndOfDayInTimezone(y, timezone) };
      },
      'last7': () => ({
        start: getStartOfDayInTimezone(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), timezone),
        end: getEndOfDayInTimezone(now, timezone),
      }),
      'thisMonth': () => ({
        start: getStartOfDayInTimezone(new Date(now.getFullYear(), now.getMonth(), 1), timezone),
        end: getEndOfDayInTimezone(now, timezone),
      }),
      'lastMonth': () => {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          start: getStartOfDayInTimezone(lm, timezone),
          end: getEndOfDayInTimezone(new Date(now.getFullYear(), now.getMonth(), 0), timezone),
        };
      },
    };
    const range = dateMap[dateFilter]?.() || dateMap['today']();
    start = range.start.getTime();
    end = range.end.getTime();
  }
  return { startTs: start, endTs: end };
};
