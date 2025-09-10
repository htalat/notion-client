export class DateUtils {
  static getWeekRange(weeksAgo = 0) {
    const now = new Date();
    const currentDay = now.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - daysToMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfTargetWeek = new Date(startOfThisWeek);
    startOfTargetWeek.setDate(startOfThisWeek.getDate() - (weeksAgo * 7));
    
    const endOfTargetWeek = new Date(startOfTargetWeek);
    endOfTargetWeek.setDate(startOfTargetWeek.getDate() + 6);
    endOfTargetWeek.setHours(23, 59, 59, 999);
    
    return {
      start: startOfTargetWeek,
      end: endOfTargetWeek
    };
  }

  static getWeekLabel(weeksAgo = 0) {
    if (weeksAgo === 0) return 'This Week';
    if (weeksAgo === 1) return 'Last Week';
    return `${weeksAgo} Weeks Ago`;
  }

  static formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }
}