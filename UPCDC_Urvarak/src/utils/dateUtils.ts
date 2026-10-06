/**
 * Date Utility functions for Retailer Frontend
 */

/**
 * Formats a Date object to YYYY-MM-DD format
 */
export const formatToISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Returns today's date in YYYY-MM-DD format based on local device time
 */
export const getTodayDateString = (): string => {
    return formatToISODate(new Date());
};

/**
 * Robustly parses various date formats returned by the API
 * Handles: "13 Mar 2026", "13 March, 2026", "2026-03-13", "13-03-2026", etc.
 */
export const parseMixedDateFormat = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Remove commas, specific special chars, and normalize whitespace
    const cleaned = dateStr.toLowerCase()
        .replace(/,/g, ' ')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const parts = cleaned.split(' ');

    const monthsFull = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const monthsShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    let day: number | undefined;
    let month: number | undefined;
    let year: number | undefined;

    // Check for month names first
    let foundMonthIdx = -1;
    let monthPartIdx = -1;

    parts.forEach((p, i) => {
        const shortIdx = monthsShort.indexOf(p.substring(0, 3));
        if (shortIdx !== -1) {
            foundMonthIdx = shortIdx;
            monthPartIdx = i;
        }
    });

    if (foundMonthIdx !== -1) {
        month = foundMonthIdx;
        const remaining = parts.filter((_, i) => i !== monthPartIdx).map(p => parseInt(p, 10));
        
        // Find year (heuristic > 1000)
        year = remaining.find(n => n > 1000);
        // Find day (remaining one <= 31)
        day = remaining.find(n => n <= 31 && n !== year);
    } else {
        // Purely numeric parts
        const nums = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
        
        if (nums.length >= 3) {
            // Heuristic for YYYY-MM-DD or DD-MM-YYYY
            if (nums[0] > 1000) {
                // YYYY MM DD
                year = nums[0];
                month = nums[1] - 1;
                day = nums[2];
            } else if (nums[2] > 1000) {
                // DD MM YYYY
                day = nums[0];
                month = nums[1] - 1;
                year = nums[2];
            }
        }
    }

    if (day !== undefined && month !== undefined && year !== undefined && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
        // Validate date components
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return new Date(year, month, day);
        }
    }

    return null;
};

/**
 * Checks if a raw date string matches a filter date string (YYYY-MM-DD)
 */
export const isDateMatch = (rawDate: string, filterDate: string): boolean => {
    if (!rawDate) return false;
    const parsed = parseMixedDateFormat(rawDate);
    if (!parsed) return false;

    const [fY, fM, fD] = filterDate.split('-').map(Number);
    return parsed.getFullYear() === fY && 
           parsed.getMonth() === (fM - 1) && 
           parsed.getDate() === fD;
};

/**
 * Formats a Date object or string to a readable Hindi localized string
 */
export const formatToHindiDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? parseMixedDateFormat(date) : date;
    if (!d || isNaN(d.getTime())) return typeof date === 'string' ? date : 'N/A';
    
    return d.toLocaleDateString('hi-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
};
