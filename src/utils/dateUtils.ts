export function getWeekDates(date: Date): Date[] {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekDates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setDate(diff + i);
    weekDates.push(d);
  }
  
  return weekDates;
}

export function getNextWeek(date: Date): Date {
  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return nextWeek;
}

export function getPrevWeek(date: Date): Date {
  const prevWeek = new Date(date);
  prevWeek.setDate(date.getDate() - 7);
  return prevWeek;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}년 ${month}월`;
}

export function formatDayName(dayIndex: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dayIndex];
}

export function formatDateDisplay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = formatDayName(date.getDay());
  return `${month}월 ${day}일 (${dayName})`;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function getNextDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return nextDay;
}

export function getPrevDay(date: Date): Date {
  const prevDay = new Date(date);
  prevDay.setDate(date.getDate() - 1);
  return prevDay;
}

export function formatShortDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getNextMonth(date: Date): Date {
  const nextMonth = new Date(date);
  nextMonth.setMonth(date.getMonth() + 1);
  return nextMonth;
}

export function getPrevMonth(date: Date): Date {
  const prevMonth = new Date(date);
  prevMonth.setMonth(date.getMonth() - 1);
  return prevMonth;
}
