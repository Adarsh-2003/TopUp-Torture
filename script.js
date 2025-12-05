// Constants
const REQUIRED_HOURS = 10;
const REQUIRED_MINUTES = REQUIRED_HOURS * 60;
const TIMEZONE = 'Asia/Kolkata';

// Sample data
const SAMPLE_DATA_1 = `Mon, 27 Oct
Planned Shift : 11:00-21:00
10h 00m
-- : ---- : --
Total TopUp Hrs 10h 00m
Tue, 28 Oct
Planned Shift : 11:00-21:00
10h 46m
09:19 AM
PUN-CDC
08:05 PM
PUN-CDC
Wed, 29 Oct
Planned Shift : 11:00-21:00
10h 01m
11:01 AM
PUN-CDC
08:01 PM
PUN-CDC
Total TopUp Hrs 01h 01m
Thu, 30 Oct
Planned Shift : 11:00-21:00
10h 00m
10:19 AM
PUN-CDC
08:06 PM
PUN-CDC
Total TopUp Hrs 00h 13m
Fri, 31 Oct
Planned Shift : 11:00-21:00
10h 02m
10:22 AM
PUN-CDC
08:05 PM
PUN-CDC
Total TopUp Hrs 00h 19m`;

const SAMPLE_DATA_2 = `Mon, 01 Dec
Planned Shift : 11:00-21:00
10h 09m
09:59 AM
PUN-CDC
08:08 PM
PUN-CDC
Click here to Apply TopUp
Tue, 02 Dec
Planned Shift : 11:00-21:00
05h 29m
02:36 PM
PUN-CDC
08:06 PM
PUN-CDC
Click here to Apply TopUp
Wed, 03 Dec
Planned Shift : 11:00-21:00
07h 40m
12:28 PM
PUN-CDC
08:08 PM
PUN-CDC
Click here to Apply TopUp
Thu, 04 Dec
Planned Shift : 11:00-21:00
-- h -- m
-- : ---- : --
Data porting in progress
Fri, 05 Dec
Planned Shift : 11:00-21:00
-- h -- m
-- : ---- : --`;

// Utility: Normalize text
function normalizeText(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

// Parse time string to minutes since midnight
function parseTimeToMinutes(timeStr) {
    if (!timeStr || timeStr.includes('--') || timeStr.trim() === '') return null;

    // Trim the input
    timeStr = timeStr.trim();

    // Handle range format (e.g., "11:00-21:00") - take first part
    if (timeStr.includes('-') && !timeStr.match(/\s*(AM|PM|am|pm)\s*$/i)) {
        timeStr = timeStr.split('-')[0].trim();
    }

    // Try 12-hour format with AM/PM first (before splitting by whitespace)
    let match = timeStr.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM|am|pm)\b/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
    }

    // If no AM/PM found, remove location labels and try 24-hour format
    timeStr = timeStr.split(/\s+/)[0].trim();
    
    // Try 24-hour format
    match = timeStr.match(/^(\d{1,2})[:.](\d{2})$/);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return hours * 60 + minutes;
        }
    }

    return null;
}

// Format minutes to 12-hour time string
function formatTime12Hour(minutes) {
    if (minutes === null || minutes === undefined) return '--:--';
    
    let totalMinutes = minutes;
    const isNextDay = totalMinutes >= 1440;
    if (isNextDay) totalMinutes -= 1440;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);

    const timeStr = `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
    return isNextDay ? `${timeStr} (next day)` : timeStr;
}

// Format duration as "Xh Ym"
function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) return '-- h -- m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

// Calculate duration between two times (handles midnight crossing)
function calculateDuration(loginMinutes, logoutMinutes) {
    if (loginMinutes === null || logoutMinutes === null) return null;
    
    // If logout is earlier than login, assume next day
    if (logoutMinutes < loginMinutes) {
        logoutMinutes += 1440; // Add 24 hours
    }
    
    return logoutMinutes - loginMinutes;
}

// Parse day block
function parseDayBlock(blockText) {
    const lines = blockText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return null;

    // Extract day header
    const dayMatch = lines[0].match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (!dayMatch) return null;

    const dayName = dayMatch[1];
    const dayDate = dayMatch[2];
    const month = dayMatch[3];
    const dayHeader = `${dayName}, ${dayDate} ${month}`;

    // Extract planned shift
    let plannedShift = null;
    const shiftMatch = blockText.match(/Planned Shift\s*:\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
    if (shiftMatch) {
        plannedShift = `${shiftMatch[1]}-${shiftMatch[2]}`;
    }

    // Extract all timestamps (ignore top-up lines, location labels, etc.)
    const timestamps = [];
    for (const line of lines) {
        // Skip day header, planned shift, duration lines, top-up lines, placeholders
        if (line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) continue;
        if (line.match(/Planned Shift/i)) continue;
        if (line.match(/^\d+h\s+\d+m$/i)) continue;
        if (line.match(/Total TopUp/i)) continue;
        if (line.match(/Click here to Apply/i)) continue;
        if (line.match(/Data porting/i)) continue;
        if (line.includes('--')) continue;
        if (line.match(/^[A-Z]{3}-[A-Z]{3}$/i)) continue; // Location codes like PUN-CDC
        if (line.match(/^[A-Z]{2,4}-[A-Z]{2,4}$/i)) continue; // More flexible location codes

        // Check if line contains a time
        const timeMinutes = parseTimeToMinutes(line);
        if (timeMinutes !== null) {
            timestamps.push({ original: line, minutes: timeMinutes });
        }
    }

    // Check for missing data indicators
    const hasMissingData = blockText.includes('-- h -- m') || 
                         blockText.includes('-- : ---- : --') ||
                         blockText.includes('Data porting');

    return {
        dayHeader,
        plannedShift,
        timestamps,
        hasMissingData,
        rawText: blockText
    };
}

// Process day data and calculate top-up
function processDay(dayData) {
    const { dayHeader, plannedShift, timestamps, hasMissingData } = dayData;

    // If missing data, return error state
    if (hasMissingData || timestamps.length === 0) {
        return {
            dayHeader,
            plannedShift,
            workedMinutes: null,
            status: 'missing',
            topupStart: null,
            topupEnd: null,
            topupLength: null,
            logins: [],
            logouts: []
        };
    }

    // Pair timestamps as login/logout sessions
    const sessions = [];
    for (let i = 0; i < timestamps.length; i += 2) {
        if (i + 1 < timestamps.length) {
            sessions.push({
                login: timestamps[i],
                logout: timestamps[i + 1]
            });
        } else {
            // Odd number - missing logout
            return {
                dayHeader,
                plannedShift,
                workedMinutes: null,
                status: 'error',
                topupStart: null,
                topupEnd: null,
                topupLength: null,
                logins: [timestamps[i].original],
                logouts: []
            };
        }
    }

    // Calculate total worked minutes
    let totalWorked = 0;
    let lastLogout = null;

    for (const session of sessions) {
        const duration = calculateDuration(session.login.minutes, session.logout.minutes);
        if (duration === null || duration < 0) {
            return {
                dayHeader,
                plannedShift,
                workedMinutes: null,
                status: 'error',
                topupStart: null,
                topupEnd: null,
                topupLength: null,
                logins: timestamps.filter((_, i) => i % 2 === 0).map(t => t.original),
                logouts: timestamps.filter((_, i) => i % 2 === 1).map(t => t.original)
            };
        }
        totalWorked += duration;
        lastLogout = session.logout.minutes;
    }

    // Calculate top-up
    const deficit = Math.max(0, REQUIRED_MINUTES - totalWorked);
    let topupStart = null;
    let topupEnd = null;
    let status = 'no-topup';

    if (deficit > 0 && lastLogout !== null) {
        // Top-up starts 1 minute after last logout
        topupStart = lastLogout + 1;
        // Keep values >= 1440 to indicate next day (formatTime12Hour will handle it)
        
        topupEnd = topupStart + deficit + 1;
        // Keep values >= 1440 to indicate next day (formatTime12Hour will handle it)
        
        status = 'needs-topup';
    } else if (totalWorked >= REQUIRED_MINUTES) {
        status = 'no-topup';
    }

    return {
        dayHeader,
        plannedShift,
        workedMinutes: totalWorked,
        status,
        topupStart,
        topupEnd,
        topupLength: deficit > 0 ? deficit : 0,
        logins: timestamps.filter((_, i) => i % 2 === 0).map(t => t.original),
        logouts: timestamps.filter((_, i) => i % 2 === 1).map(t => t.original)
    };
}

// Main parsing function
function parseWeeklyData(text) {
    const normalized = normalizeText(text);
    const dayBlocks = [];
    
    // Split by day headers
    const dayHeaderRegex = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi;
    const matches = [...normalized.matchAll(dayHeaderRegex)];
    
    if (matches.length === 0) {
        // Try splitting by blank lines
        const blocks = normalized.split(/\n\s*\n/);
        for (const block of blocks) {
            const dayData = parseDayBlock(block);
            if (dayData) dayBlocks.push(dayData);
        }
    } else {
        // Split by day headers
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
            const block = normalized.substring(start, end);
            const dayData = parseDayBlock(block);
            if (dayData) dayBlocks.push(dayData);
        }
    }

    // Process each day
    return dayBlocks.map(processDay);
}


// Render UI
function renderResults(days) {
    const resultsDiv = document.getElementById('results');
    const daysContainer = document.getElementById('daysContainer');
    const weeklySummary = document.getElementById('weeklySummary');

    // Calculate weekly totals (excluding applied days)
    let totalTopupMinutes = 0;
    let daysNeedingTopup = 0;

    days.forEach((day, index) => {
        if (day.status === 'needs-topup' && day.topupLength > 0) {
            totalTopupMinutes += day.topupLength;
            daysNeedingTopup++;
        }
    });

    // Render weekly summary
    const exportData = days
        .map((day, index) => {
            if (day.status === 'needs-topup' && day.topupLength > 0) {
                const topupStartFormatted = formatTime12Hour(day.topupStart);
                const topupEndFormatted = formatTime12Hour(day.topupEnd);
                return `${day.dayHeader}: ${topupStartFormatted} → ${topupEndFormatted}`;
            }
            return null;
        })
        .filter(Boolean)
        .join('\n');

    weeklySummary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Total Top-up this week</span>
            <span class="summary-value">${formatDuration(totalTopupMinutes)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Days needing top-up</span>
            <span class="summary-value">${daysNeedingTopup}</span>
        </div>
        ${exportData ? `<button class="secondary" onclick="exportTopups()">Export All Top-ups</button>` : ''}
    `;
    
    // Store export data globally
    window.exportTopupsData = exportData;

    // Render day cards
    daysContainer.innerHTML = '';
    days.forEach((day, index) => {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.dataset.dayIndex = index;

        let statusHtml = '';
        if (day.status === 'missing') {
            statusHtml = `
                <div class="topup-result error">
                    <div class="status-message error-message">Data porting / missing</div>
                </div>
            `;
        } else if (day.status === 'error') {
            statusHtml = `
                <div class="topup-result error">
                    <div class="status-message error-message">Unable to parse — check format</div>
                </div>
            `;
        } else if (day.status === 'no-topup') {
            statusHtml = `
                <div class="topup-result no-topup">
                    <div class="status-message">No top-up required — skipped</div>
                </div>
            `;
        } else if (day.status === 'needs-topup') {
            const topupStartFormatted = formatTime12Hour(day.topupStart);
            const topupEndFormatted = formatTime12Hour(day.topupEnd);
            
            statusHtml = `
                <div class="topup-result">
                    <div class="topup-window">Top-up: ${topupStartFormatted} → ${topupEndFormatted}</div>
                    <div class="topup-length">Top-up length: ${formatDuration(day.topupLength)}</div>
                    <button class="copy-btn" onclick="copyTopup('${topupStartFormatted} → ${topupEndFormatted}')">Copy Timestamp</button>
                </div>
            `;
        }

        const timestampsHtml = `
            ${day.logins.length > 0 ? `<div>Login: ${day.logins.map(t => `<span class="timestamp">${t}</span>`).join(' ')}</div>` : ''}
            ${day.logouts.length > 0 ? `<div>Logout: ${day.logouts.map(t => `<span class="timestamp">${t}</span>`).join(' ')}</div>` : ''}
        `;

        card.innerHTML = `
            <div class="day-header">${day.dayHeader}</div>
            ${day.plannedShift ? `<div class="day-info">Planned Shift: ${day.plannedShift}</div>` : ''}
            ${timestampsHtml}
            ${day.workedMinutes !== null ? `<div class="worked-duration">Worked: ${formatDuration(day.workedMinutes)}</div>` : ''}
            ${statusHtml}
        `;

        daysContainer.appendChild(card);
    });

    resultsDiv.style.display = 'block';
}

// Copy top-up timestamp to clipboard
function copyTopup(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback could be added here
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}


// Export all top-up windows
function exportTopups() {
    if (window.exportTopupsData) {
        navigator.clipboard.writeText(window.exportTopupsData).then(() => {
            alert('All top-up windows copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
}

// Make functions globally available
window.copyTopup = copyTopup;
window.exportTopups = exportTopups;

// Event listeners
document.getElementById('computeBtn').addEventListener('click', () => {
    const inputText = document.getElementById('inputText').value;
    if (!inputText.trim()) {
        alert('Please paste your timestamps first!');
        return;
    }

    try {
        const days = parseWeeklyData(inputText);
        if (days.length === 0) {
            alert('No valid day data found. Please check your format.');
            return;
        }
        renderResults(days);
    } catch (error) {
        console.error('Error parsing data:', error);
        alert('Error parsing data. Please check the format and try again.');
    }
});

document.getElementById('sample1Btn').addEventListener('click', () => {
    document.getElementById('inputText').value = SAMPLE_DATA_1;
});

document.getElementById('sample2Btn').addEventListener('click', () => {
    document.getElementById('inputText').value = SAMPLE_DATA_2;
});

