// --- app.js: FILE LOGIC & THUẬT TOÁN ĐÃ TÍCH HỢP NGUYÊN TẮC TÁCH CA ---

const ALLOWED_OUTPUT_SHIFTS = [
    [7, 12], [7, 15], [7, 17],
    [10, 15], [12, 17], [12, 23],
    [15, 23], [17, 23]
];

let currentUser = STAFF_LIST[0].id; 
let availabilities = JSON.parse(localStorage.getItem('availabilities')) || {}; 
let finalSchedule = JSON.parse(localStorage.getItem('finalSchedule')) || null;
let shiftQuotas = JSON.parse(localStorage.getItem('shiftQuotas')) || {}; 
let staffPositions = JSON.parse(localStorage.getItem('staffPositions')) || {};
let scheduleHistory = JSON.parse(localStorage.getItem('scheduleHistory')) || [];
let pendingProtectedTab = null;
let pendingProtectedScheduleAction = null;
const PROTECTED_TABS_UNLOCKED_KEY = 'protectedTabsUnlocked';
const PROTECTED_SCHEDULE_ACTIONS_UNLOCKED_KEY = 'protectedScheduleActionsUnlocked';
let protectedTabsUnlocked = localStorage.getItem(PROTECTED_TABS_UNLOCKED_KEY) === 'true';
let protectedScheduleActionsUnlocked =
    localStorage.getItem(PROTECTED_SCHEDULE_ACTIONS_UNLOCKED_KEY) === 'true';

function saveData() {
    localStorage.setItem('availabilities', JSON.stringify(availabilities));
    localStorage.setItem('shiftQuotas', JSON.stringify(shiftQuotas));
    localStorage.setItem('staffPositions', JSON.stringify(staffPositions));
    localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory));
    if (finalSchedule) localStorage.setItem('finalSchedule', JSON.stringify(finalSchedule));
    window.saveSharedCloudState?.(getSharedAppState());
}

function getSharedAppState() {
    return {
        availabilities,
        finalSchedule,
        shiftQuotas,
        staffPositions,
        scheduleHistory,
        scheduleDateRange: JSON.parse(localStorage.getItem('scheduleDateRange') || 'null')
    };
}

function applySharedAppState(state) {
    availabilities = state.availabilities || {};
    finalSchedule = state.finalSchedule || null;
    shiftQuotas = state.shiftQuotas || {};
    staffPositions = state.staffPositions || {};
    scheduleHistory = Array.isArray(state.scheduleHistory) ? state.scheduleHistory : [];

    if (state.scheduleDateRange) {
        localStorage.setItem('scheduleDateRange', JSON.stringify(state.scheduleDateRange));
    } else {
        localStorage.removeItem('scheduleDateRange');
    }

    localStorage.setItem('availabilities', JSON.stringify(availabilities));
    localStorage.setItem('shiftQuotas', JSON.stringify(shiftQuotas));
    localStorage.setItem('staffPositions', JSON.stringify(staffPositions));
    localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory));
    if (finalSchedule) {
        localStorage.setItem('finalSchedule', JSON.stringify(finalSchedule));
    } else {
        localStorage.removeItem('finalSchedule');
    }

    if (state.scheduleDateRange?.startDate) {
        setScheduleDatePickerValue(state.scheduleDateRange.startDate);
    }

    renderRegisterTable();
    renderConfigTable();
    if (finalSchedule) {
        renderFinalScheduleTable();
    } else {
        document.getElementById('schedule-table-container').innerHTML =
            '<div class="text-center py-10 text-gray-500">Chưa có lịch được xếp.</div>';
    }
    renderScheduleHistory();
    renderMonthlyHours();
}

window.getSharedAppState = getSharedAppState;
window.applySharedAppState = applySharedAppState;

function getQuota(day, block) {
    if (shiftQuotas[day] && shiftQuotas[day][block] !== undefined) {
        return shiftQuotas[day][block];
    }
    return DEFAULT_QUOTA;
}

function getAllowedShortfall(block) {
    return block === '15:00 - 17:00' ? 1 : 0;
}

function resetData() {
    if (confirm("Chỉ xóa Lịch đăng ký và Lịch hoàn chỉnh, giữ nguyên Cấu hình. Đồng ý?")) {
        localStorage.removeItem('availabilities');
        localStorage.removeItem('finalSchedule');
        localStorage.removeItem('staffPositions');
        availabilities = {};
        finalSchedule = null;
        staffPositions = {};
        saveData();
        renderRegisterTable();
        document.getElementById('schedule-table-container').innerHTML = 
            `<div class="text-center py-10 text-gray-500">Chưa có lịch được xếp.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initStaffSelect();
    initScheduleDatePicker();
    renderRegisterTable();
    renderConfigTable(); 
    updateProtectedScheduleActionButtons();
    const savedDateRange = JSON.parse(localStorage.getItem('scheduleDateRange') || 'null') || (
        scheduleHistory[0]
            ? { startDate: scheduleHistory[0].startDate, endDate: scheduleHistory[0].endDate }
            : null
    );
    if (savedDateRange) {
        setScheduleDatePickerValue(savedDateRange.startDate || '');
    }
    updateScheduleDateRange();
    if (finalSchedule) renderFinalScheduleTable();
    renderScheduleHistory();
    renderMonthlyHours();
});

function formatDateForSchedule(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseScheduleDate(value) {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const match = isoMatch || /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (!match) return null;

    const year = Number(match[isoMatch ? 1 : 3]);
    const month = Number(match[isoMatch ? 2 : 2]);
    const day = Number(match[isoMatch ? 3 : 1]);
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) return null;

    return date;
}

function formatDateInputValue(value) {
    const date = parseScheduleDate(value);
    return date ? formatDateForSchedule(date) : '';
}

function initScheduleDatePicker() {
    const daySelect = document.getElementById('schedule-start-day');
    const monthSelect = document.getElementById('schedule-start-month');
    if (!daySelect || !monthSelect) return;

    daySelect.innerHTML = '<option value="">Ngày</option>' +
        Array.from({ length: 31 }, (_, index) => {
            const value = String(index + 1).padStart(2, '0');
            return `<option value="${value}">${value}</option>`;
        }).join('');
    monthSelect.innerHTML = '<option value="">Tháng</option>' +
        Array.from({ length: 12 }, (_, index) => {
            const value = String(index + 1).padStart(2, '0');
            return `<option value="${value}">${value}</option>`;
        }).join('');

}

function setScheduleDatePickerValue(value) {
    const date = parseScheduleDate(value);
    const hiddenInput = document.getElementById('schedule-start-date');
    const daySelect = document.getElementById('schedule-start-day');
    const monthSelect = document.getElementById('schedule-start-month');
    if (!hiddenInput || !daySelect || !monthSelect) return;

    if (!date) {
        hiddenInput.value = '';
        daySelect.value = '';
        monthSelect.value = '';
        return;
    }

    hiddenInput.value = formatDateForSchedule(date);
    daySelect.value = String(date.getDate()).padStart(2, '0');
    monthSelect.value = String(date.getMonth() + 1).padStart(2, '0');
}

function updateScheduleDateInputFromPicker() {
    const day = document.getElementById('schedule-start-day')?.value;
    const month = document.getElementById('schedule-start-month')?.value;
    const hiddenInput = document.getElementById('schedule-start-date');
    if (!hiddenInput) return '';

    const year = new Date().getFullYear();
    hiddenInput.value = day && month ? `${day}/${month}/${year}` : '';
    return hiddenInput.value;
}

function toIsoScheduleDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getScheduleHeaderLabel(day, index) {
    const startDateValue = document.getElementById('schedule-start-date')?.value;
    if (!startDateValue) return day;

    const startDate = parseScheduleDate(startDateValue);
    if (!startDate) return day;
    const displayedDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + index
    );
    return `${day}<br><span class="text-xs font-normal">${formatDateForSchedule(displayedDate)}</span>`;
}

function updateScheduleDateRange() {
    const startDate = parseScheduleDate(updateScheduleDateInputFromPicker());
    if (!startDate) {
        if (finalSchedule) renderFinalScheduleTable();
        return;
    }
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
    localStorage.setItem('scheduleDateRange', JSON.stringify({
        startDate: toIsoScheduleDate(startDate),
        endDate: toIsoScheduleDate(endDate)
    }));
    saveData();
    if (finalSchedule) renderFinalScheduleTable();
}

function initStaffSelect() {
    const select = document.getElementById('staff-select');
    select.innerHTML = STAFF_LIST.map(staff => `<option value="${staff.id}">${staff.name} - ${staff.type}</option>`).join('');
}

function changeUser(userId) {
    currentUser = userId;
    renderRegisterTable(); 
}

function switchTab(targetTab) {
    if (targetTab === 'config') {
        if (protectedTabsUnlocked) {
            activateTab(targetTab);
            return;
        }
        openTabPasswordDialog(targetTab);
        return;
    }

    activateTab(targetTab);
}

function activateTab(targetTab) {
    const tabs = ['register', 'schedule', 'config', 'history', 'monthly-hours'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        const view = document.getElementById(`view-${tab}`);
        if (tab === targetTab) {
            btn.className = `flex-1 py-4 font-bold text-lg text-white transition ${tab === 'schedule' ? 'bg-green-600' : 'bg-blue-600'}`;
            view.classList.remove('hidden');
        } else {
            btn.className = "flex-1 py-4 font-bold text-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition";
            view.classList.add('hidden');
        }
    });
}

function openTabPasswordDialog(targetTab) {
    pendingProtectedTab = targetTab;
    pendingProtectedScheduleAction = null;
    document.getElementById('tab-password-title').textContent = 'Nhập mật khẩu truy cập';
    document.getElementById('tab-password-error').textContent = '';
    document.getElementById('tab-password').value = '';
    document.getElementById('tab-password-dialog').classList.remove('hidden');
    document.getElementById('tab-password').focus();
}

function closeTabPasswordDialog() {
    document.getElementById('tab-password-dialog').classList.add('hidden');
    document.getElementById('tab-password-form').reset();
    pendingProtectedTab = null;
    pendingProtectedScheduleAction = null;
}

function requestProtectedScheduleAction(action) {
    if (protectedScheduleActionsUnlocked) {
        executeProtectedScheduleAction(action);
        return;
    }

    pendingProtectedTab = null;
    pendingProtectedScheduleAction = action;
    document.getElementById('tab-password-title').textContent = 'Nhập mật khẩu để sử dụng';
    document.getElementById('tab-password-error').textContent = '';
    document.getElementById('tab-password').value = '';
    document.getElementById('tab-password-dialog').classList.remove('hidden');
    document.getElementById('tab-password').focus();
}

function updateProtectedScheduleActionButtons() {
    const buttons = [
        document.getElementById('schedule-action-schedule'),
        document.getElementById('schedule-action-reset'),
        document.getElementById('schedule-action-save')
    ].filter(Boolean);

    buttons.forEach(button => {
        button.classList.toggle('opacity-50', !protectedScheduleActionsUnlocked);
        button.classList.toggle('cursor-not-allowed', !protectedScheduleActionsUnlocked);
        button.classList.toggle('cursor-pointer', protectedScheduleActionsUnlocked);
        button.setAttribute('aria-disabled', String(!protectedScheduleActionsUnlocked));
        button.title = protectedScheduleActionsUnlocked
            ? 'Đã mở khóa'
            : 'Nhập mật khẩu để sử dụng';
    });
}

function executeProtectedScheduleAction(action) {
    if (action === 'schedule') runAutoSchedule();
    if (action === 'reset') resetData();
    if (action === 'save') saveCurrentScheduleToHistory();
}

function submitTabPassword(event) {
    event.preventDefault();
    const passwordInput = document.getElementById('tab-password');
    if (passwordInput.value !== DEFAULT_TAB_PASSWORD) {
        document.getElementById('tab-password-error').textContent = 'Mật khẩu không đúng.';
        passwordInput.select();
        return;
    }

    const tabToOpen = pendingProtectedTab;
    const scheduleAction = pendingProtectedScheduleAction;
    if (scheduleAction) {
        protectedScheduleActionsUnlocked = true;
        localStorage.setItem(PROTECTED_SCHEDULE_ACTIONS_UNLOCKED_KEY, 'true');
        updateProtectedScheduleActionButtons();
        closeTabPasswordDialog();
        executeProtectedScheduleAction(scheduleAction);
        return;
    }

    protectedTabsUnlocked = true;
    localStorage.setItem(PROTECTED_TABS_UNLOCKED_KEY, 'true');
    closeTabPasswordDialog();
    activateTab(tabToOpen);
}

function renderRegisterTable() {
    const container = document.getElementById('register-table-container');
    let html = `<table class="w-full border-collapse border text-center text-sm">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border p-2 min-w-[120px]">Ca / Ngày</th>
                            ${DAYS.map(day => `<th class="border p-2">${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>`;

    SHIFTS.forEach(shift => {
        html += `<tr><td class="border p-2 font-bold bg-gray-50 text-gray-700 whitespace-nowrap">${shift}</td>`;
        DAYS.forEach(day => {
            const isAvail = availabilities[currentUser]?.[day]?.[shift];
            const bgClass = isAvail ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-gray-50';
            const icon = isAvail ? '✅' : '';
            html += `<td class="border p-2 cursor-pointer transition ${bgClass}" 
                         onclick="toggleAvailability('${day}', '${shift}')">${icon}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleAvailability(day, shift) {
    if (!availabilities[currentUser]) availabilities[currentUser] = {};
    if (!availabilities[currentUser][day]) availabilities[currentUser][day] = {};
    availabilities[currentUser][day][shift] = !availabilities[currentUser][day][shift];
    saveData(); 
    renderRegisterTable();
}

function renderConfigTable() {
    const container = document.getElementById('config-table-container');
    let html = `<table class="w-full border-collapse border text-center text-sm">
                    <thead>
                        <tr class="bg-gray-800 text-white">
                            <th class="border border-gray-700 p-2 min-w-[120px]">Khung Giờ Lõi</th>
                            ${DAYS.map(day => `<th class="border border-gray-700 p-2">${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>`;

    CORE_BLOCKS.forEach(block => {
        html += `<tr><td class="border p-2 font-bold bg-gray-100 text-gray-700 whitespace-nowrap">${block}</td>`;
        DAYS.forEach(day => {
            const currentVal = getQuota(day, block);
            html += `<td class="border p-2 hover:bg-gray-50 transition">
                        <input type="number" min="0" value="${currentVal}" 
                               onchange="updateQuota('${day}', '${block}', this.value)"
                               class="w-12 text-center border border-gray-300 rounded p-1 outline-none focus:border-blue-500">
                     </td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function updateQuota(day, block, value) {
    if (!shiftQuotas[day]) shiftQuotas[day] = {};
    if (value === '' || isNaN(value)) {
        delete shiftQuotas[day][block];
    } else {
        shiftQuotas[day][block] = parseInt(value, 10);
    }
    saveData();
    renderConfigTable(); 
    if (finalSchedule) renderFinalScheduleTable();
}

function parseTime(timeStr) {
    const parts = timeStr.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
}

function coversBlock(shift, blockStart, blockEnd) {
    // A shift must cover the block's midpoint so an edge-only overlap cannot satisfy its quota.
    const midpoint = (blockStart + blockEnd) / 2;
    return shift[0] <= midpoint && shift[1] >= midpoint;
}

function getMergedAvailabilities(staffId, day) {
    const registered = availabilities[staffId]?.[day] || {};
    let ranges = [];
    for (let shift in registered) {
        if (registered[shift]) ranges.push(parseTime(shift));
    }
    
    ranges.sort((a, b) => a[0] - b[0]);
    let merged = [];
    for (let r of ranges) {
        if (merged.length === 0) {
            merged.push([...r]);
        } else {
            let last = merged[merged.length - 1];
            if (r[0] <= last[1]) {
                last[1] = Math.max(last[1], r[1]); 
            } else {
                merged.push([...r]);
            }
        }
    }
    return merged;
}

function countStaffAtHour(scheduleDay, hour) {
    let count = 0;
    if (scheduleDay) {
        Object.values(scheduleDay).forEach(shift => {
            if (shift.start <= hour && shift.end > hour) count++;
        });
    }
    return count;
}

function violatesQuota(scheduleDay, start, end, day) {
    for (let hour = start; hour < end; hour++) {
        for (const block of CORE_BLOCKS) {
            const [blockStart, blockEnd] = parseTime(block);
            if (hour < blockStart || hour >= blockEnd) continue;

            let hourlyLimit = getQuota(day, block);
            if (
                block === '07:00 - 12:00' &&
                hour >= 10 &&
                (
                    coversBlock([start, end], 12, 15) ||
                    Object.values(scheduleDay).some(shift =>
                        shift.start <= hour &&
                        shift.end > hour &&
                        coversBlock([shift.start, shift.end], 12, 15)
                    )
                )
            ) {
                hourlyLimit++;
            }

            if (countStaffAtHour(scheduleDay, hour) >= hourlyLimit) return true;
        }
    }
    return false;
}

function getWeeklyHours(schedule, staffId) {
    return DAYS.reduce((total, day) => {
        const shift = schedule?.[day]?.[staffId];
        return total + (shift ? shift.end - shift.start : 0);
    }, 0);
}

function scoreSchedule(schedule) {
    let quotaDeficit = 0;
    CORE_BLOCKS.forEach(block => {
        const [start, end] = parseTime(block);
        DAYS.forEach(day => {
            const required = Math.max(0, getQuota(day, block) - getAllowedShortfall(block));
            const count = Object.values(schedule[day] || {}).filter(shift =>
                coversBlock([shift.start, shift.end], start, end)
            ).length;
            quotaDeficit += Math.max(0, required - count);
        });
    });

    const ptHours = STAFF_LIST
        .filter(staff => staff.type === 'PT')
        .filter(staff => DAYS.some(day => getMergedAvailabilities(staff.id, day).length > 0))
        .map(staff => getWeeklyHours(schedule, staff.id));
    const averageHours = ptHours.reduce((total, hours) => total + hours, 0) / Math.max(1, ptHours.length);
    const hourVariance = ptHours.reduce((total, hours) =>
        total + (hours - averageHours) ** 2, 0
    ) / Math.max(1, ptHours.length);

    return quotaDeficit * 1000000000 + hourVariance;
}

function canWorkShift(staffId, day, shift) {
    return getMergedAvailabilities(staffId, day).some(range =>
        range[0] <= shift.start && range[1] >= shift.end
    );
}

function improveScheduleFairness(schedule) {
    let bestScore = scoreSchedule(schedule);
    let improved = true;

    while (improved) {
        improved = false;
        let bestMove = null;
        let bestMoveScore = bestScore;

        DAYS.forEach(day => {
            const assignedPartTimers = STAFF_LIST.filter(staff =>
                staff.type === 'PT' && schedule[day][staff.id]
            );
            const unassignedPartTimers = STAFF_LIST.filter(staff =>
                staff.type === 'PT' && !schedule[day][staff.id]
            );

            for (let i = 0; i < assignedPartTimers.length; i++) {
                for (let j = i + 1; j < assignedPartTimers.length; j++) {
                    const first = assignedPartTimers[i];
                    const second = assignedPartTimers[j];
                    const firstShift = schedule[day][first.id];
                    const secondShift = schedule[day][second.id];

                    if (!canWorkShift(first.id, day, secondShift) ||
                        !canWorkShift(second.id, day, firstShift)) continue;

                    schedule[day][first.id] = secondShift;
                    schedule[day][second.id] = firstShift;
                    const score = scoreSchedule(schedule);
                    schedule[day][first.id] = firstShift;
                    schedule[day][second.id] = secondShift;

                    if (score < bestMoveScore) {
                        bestMove = { type: 'swap', day, firstId: first.id, secondId: second.id };
                        bestMoveScore = score;
                    }
                }
            }

            assignedPartTimers.forEach(assignedStaff => {
                const shift = schedule[day][assignedStaff.id];
                unassignedPartTimers.forEach(unassignedStaff => {
                    if (!canWorkShift(unassignedStaff.id, day, shift)) return;

                    delete schedule[day][assignedStaff.id];
                    schedule[day][unassignedStaff.id] = shift;
                    const score = scoreSchedule(schedule);
                    delete schedule[day][unassignedStaff.id];
                    schedule[day][assignedStaff.id] = shift;

                    if (score < bestMoveScore) {
                        bestMove = { type: 'transfer', day, fromId: assignedStaff.id, toId: unassignedStaff.id };
                        bestMoveScore = score;
                    }
                });
            });
        });

        if (bestMove?.type === 'swap') {
            const firstShift = schedule[bestMove.day][bestMove.firstId];
            schedule[bestMove.day][bestMove.firstId] = schedule[bestMove.day][bestMove.secondId];
            schedule[bestMove.day][bestMove.secondId] = firstShift;
            bestScore = bestMoveScore;
            improved = true;
        } else if (bestMove?.type === 'transfer') {
            schedule[bestMove.day][bestMove.toId] = schedule[bestMove.day][bestMove.fromId];
            delete schedule[bestMove.day][bestMove.fromId];
            bestScore = bestMoveScore;
            improved = true;
        }
    }

    return schedule;
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

// --- THUẬT TOÁN XẾP LỊCH: TÍCH HỢP CÂN BẰNG TẢI VÀ ƯU TIÊN TÁCH CA ---
function runAutoSchedule() {
    try {
        if (typeof STAFF_LIST === 'undefined' || typeof CORE_BLOCKS === 'undefined') {
            throw new Error("Không tìm thấy dữ liệu cấu hình từ file config.js.");
        }

        let bestSchedule = null;
        let bestScore = Infinity;
        const attemptCount = 10;

        for (let attempt = 0; attempt < attemptCount; attempt++) {
        finalSchedule = {}; 
        let weeklyHoursTracker = {}; 
        let daysWorkedCount = {}; // Đếm số ngày làm việc trong tuần của từng nhân sự để ưu tiên tách ca
        
        STAFF_LIST.forEach(s => {
            weeklyHoursTracker[s.id] = 0;
            daysWorkedCount[s.id] = 0;
        });

        const shuffledDays = shuffle([...DAYS]);
        shuffledDays.forEach(day => {
            finalSchedule[day] = {};
            let remainingQuotas = {};
            CORE_BLOCKS.forEach(b => remainingQuotas[b] = getQuota(day, b));

            // BƯỚC 1: Cố định Full-time (FT) trước
            STAFF_LIST.forEach(staff => {
                if (staff.type !== 'FT') return;
                const ranges = getMergedAvailabilities(staff.id, day);
                if (ranges.length === 0) return;

                let r = ranges[0];
                let bestShift = null;

                ALLOWED_OUTPUT_SHIFTS.forEach(shift => {
                    const [s, e] = shift;
                    if (r[0] <= s && r[1] >= e) {
                        if (violatesQuota(finalSchedule[day], s, e, day)) return;

                        if (!bestShift || (e - s) > (bestShift[1] - bestShift[0])) {
                            bestShift = [s, e];
                        }
                    }
                });

                if (bestShift) {
                    finalSchedule[day][staff.id] = { start: bestShift[0], end: bestShift[1] };
                    weeklyHoursTracker[staff.id] += (bestShift[1] - bestShift[0]);
                    daysWorkedCount[staff.id]++;

                    CORE_BLOCKS.forEach(blockStr => {
                        const [cb_s, cb_e] = parseTime(blockStr);
                        if (coversBlock(bestShift, cb_s, cb_e)) {
                            if (remainingQuotas[blockStr] > 0) remainingQuotas[blockStr]--;
                        }
                    });
                }
            });

            // BƯỚC 2: Xử lý Part-time (PT) theo nguyên tắc Cân bằng tải & Ưu tiên nhân sự chưa làm ngày đó (Tách ca)
            let sortedBlocks = [...CORE_BLOCKS];
            shuffle(sortedBlocks);

            sortedBlocks.forEach(blockStr => {
                const [bStart, bEnd] = parseTime(blockStr);

                while (remainingQuotas[blockStr] > 0) {
                    let assignedOne = false;

                    let availableCandidates = [];
                    STAFF_LIST.forEach(staff => {
                        if (staff.type !== 'PT') return;
                        if (finalSchedule[day][staff.id]) return; // Đã có ca trong ngày này

                        const ranges = getMergedAvailabilities(staff.id, day);
                        if (ranges.length === 0) return;

                        let validShifts = ALLOWED_OUTPUT_SHIFTS.filter(shift => {
                            const [s, e] = shift;
                            const coversTargetBlock = coversBlock(shift, bStart, bEnd);
                            const isCoveredByStaff = ranges.some(r => r[0] <= s && r[1] >= e);
                            if (!coversTargetBlock || !isCoveredByStaff) return false;

                            if (violatesQuota(finalSchedule[day], s, e, day)) return false;

                            return true;
                        });

                        if (validShifts.length > 0) {
                            let scoredShifts = validShifts.map(shift => {
                                let coveredDemand = 0;
                                CORE_BLOCKS.forEach(cb => {
                                    const [cb_s, cb_e] = parseTime(cb);
                                    if (coversBlock(shift, cb_s, cb_e) && remainingQuotas[cb] > 0) {
                                        coveredDemand++;
                                    }
                                });
                                const dur = shift[1] - shift[0];
                                return {
                                    start: shift[0],
                                    end: shift[1],
                                    coveredDemand,
                                    dur
                                };
                            });

                            scoredShifts.sort((a, b) => {
                                if (b.coveredDemand !== a.coveredDemand) return b.coveredDemand - a.coveredDemand;
                                return a.dur - b.dur;
                            });

                            availableCandidates.push({
                                staff: staff,
                                shift: { start: scoredShifts[0].start, end: scoredShifts[0].end },
                                duration: scoredShifts[0].dur,
                                flexibility: validShifts.length
                            });
                        }
                    });

                    if (availableCandidates.length === 0) break;

                    // Cân bằng tổng giờ dự kiến trước; dùng ngày làm và độ linh hoạt để phá hòa.
                    availableCandidates.sort((a, b) => {
                        let hoursA = weeklyHoursTracker[a.staff.id] + a.duration;
                        let hoursB = weeklyHoursTracker[b.staff.id] + b.duration;
                        if (hoursA !== hoursB) {
                            return hoursA - hoursB;
                        }
                        let daysA = daysWorkedCount[a.staff.id];
                        let daysB = daysWorkedCount[b.staff.id];
                        if (daysA !== daysB) {
                            return daysA - daysB;
                        }
                        if (a.flexibility !== b.flexibility) {
                            return a.flexibility - b.flexibility;
                        }
                        return 0.5 - Math.random();
                    });

                    const chosen = availableCandidates[0];
                    finalSchedule[day][chosen.staff.id] = chosen.shift;
                    weeklyHoursTracker[chosen.staff.id] += chosen.duration;
                    daysWorkedCount[chosen.staff.id]++;
                    assignedOne = true;

                    CORE_BLOCKS.forEach(cBlockStr => {
                        const [cb_s, cb_e] = parseTime(cBlockStr);
                        if (coversBlock([chosen.shift.start, chosen.shift.end], cb_s, cb_e)) {
                            if (remainingQuotas[cBlockStr] > 0) remainingQuotas[cBlockStr]--;
                        }
                    });
                }
            });
        });

        const candidateScore = scoreSchedule(finalSchedule);
        if (candidateScore < bestScore) {
            bestScore = candidateScore;
            bestSchedule = JSON.parse(JSON.stringify(finalSchedule));
        }
        }

        finalSchedule = improveScheduleFairness(bestSchedule);

        saveData(); 
        renderFinalScheduleTable();
        activateTab('schedule');

    } catch (error) {
        console.error("Lỗi thuật toán xếp lịch:", error);
        alert("Lỗi thực thi: " + error.message);
    }
}

function getStaffDayShift(staffId, day) {
    if (finalSchedule && finalSchedule[day] && finalSchedule[day][staffId]) {
        return finalSchedule[day][staffId];
    }
    return null;
}

function updateStaffPosition(staffId, day, position) {
    if (!staffPositions[day]) staffPositions[day] = {};
    if (position) {
        staffPositions[day][staffId] = position;
    } else {
        delete staffPositions[day][staffId];
    }
    saveData();
}

function saveCurrentScheduleToHistory() {
    if (!finalSchedule || !Object.values(finalSchedule).some(daySchedule => Object.keys(daySchedule || {}).length > 0)) {
        alert('Chưa có lịch để lưu vào lịch sử.');
        return;
    }

    const startDate = parseScheduleDate(document.getElementById('schedule-start-date').value);
    if (!startDate) {
        alert('Vui lòng chọn ngày bắt đầu hợp lệ.');
        return;
    }
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);

    const savedAt = new Date();
    scheduleHistory.unshift({
        id: `${savedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: savedAt.toISOString(),
        startDate: toIsoScheduleDate(startDate),
        endDate: toIsoScheduleDate(endDate),
        schedule: JSON.parse(JSON.stringify(finalSchedule)),
        positions: JSON.parse(JSON.stringify(staffPositions)),
        quotas: JSON.parse(JSON.stringify(shiftQuotas))
    });
    saveData();
    renderScheduleHistory();
    renderMonthlyHours();
    alert('Đã lưu lịch vào lịch sử.');
}

function deleteScheduleHistoryEntry(entryId) {
    const entry = scheduleHistory.find(item => item.id === entryId);
    if (!entry) {
        alert('Không tìm thấy lịch sử cần xóa.');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa lịch đã lưu này không?')) return;

    scheduleHistory = scheduleHistory.filter(item => item.id !== entryId);
    saveData();
    renderScheduleHistory();
    renderMonthlyHours();
}

function renderScheduleHistory() {
    const container = document.getElementById('schedule-history-container');
    if (!container) return;

    if (scheduleHistory.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Chưa có lịch nào được lưu. Vào tab “Lịch làm hoàn chỉnh” và bấm “Lưu lịch vào lịch sử”.</div>';
        return;
    }

    container.innerHTML = scheduleHistory.map((entry, index) => {
        const savedDate = new Date(entry.savedAt);
        const formattedDate = Number.isNaN(savedDate.getTime())
            ? 'Thời gian không xác định'
            : savedDate.toLocaleString('vi-VN');
        const formatScheduleDate = date => {
            if (!date) return null;
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        };
        const schedulePeriod = entry.startDate && entry.endDate
            ? ` — Lịch từ ${formatScheduleDate(entry.startDate)} đến ${formatScheduleDate(entry.endDate)}`
            : '';

        return `<details class="mb-4 overflow-hidden rounded-lg border border-gray-300" ${index === 0 ? 'open' : ''}>
            <summary class="cursor-pointer bg-gray-100 px-4 py-3 font-bold">
                Lịch ${scheduleHistory.length - index}${schedulePeriod} — Lưu lúc ${formattedDate}
            </summary>
            <div class="flex justify-end border-b border-gray-300 bg-gray-50 p-3">
                <button onclick="deleteScheduleHistoryEntry('${entry.id}')"
                        class="rounded bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700">
                    Xóa lịch này
                </button>
            </div>
            <div id="schedule-history-table-${index}" class="overflow-x-auto"></div>
        </details>`;
    }).join('');
    scheduleHistory.forEach((entry, index) => {
        renderScheduleTable(
            `schedule-history-table-${index}`,
            entry.schedule,
            entry.positions || {},
            entry.quotas || shiftQuotas,
            false
        );
    });
}

function renderMonthlyHours() {
    const container = document.getElementById('monthly-hours-container');
    if (!container) return;

    const datedEntries = scheduleHistory
        .filter(entry => entry.startDate && entry.endDate && entry.startDate <= entry.endDate)
        .slice()
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    if (datedEntries.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Chưa có lịch được lưu kèm khoảng ngày. Lưu lịch trong tab “Lịch làm hoàn chỉnh” để xem tổng giờ theo tháng.</div>';
        return;
    }

    const scheduledDays = new Map();
    datedEntries.forEach(entry => {
        const [startYear, startMonth, startDay] = entry.startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = entry.endDate.split('-').map(Number);
        const date = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);

        let dayOffset = 0;
        while (date <= endDate) {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!scheduledDays.has(dateKey)) {
                const dayName = DAYS[dayOffset % DAYS.length];
                scheduledDays.set(dateKey, {
                    month: dateKey.slice(0, 7),
                    shifts: entry.schedule?.[dayName] || {}
                });
            }
            date.setDate(date.getDate() + 1);
            dayOffset++;
        }
    });

    const monthTotals = {};
    scheduledDays.forEach(({ month, shifts }) => {
        if (!monthTotals[month]) {
            monthTotals[month] = Object.fromEntries(STAFF_LIST.map(staff => [staff.id, 0]));
        }
        Object.entries(shifts).forEach(([staffId, shift]) => {
            if (monthTotals[month][staffId] !== undefined && shift) {
                monthTotals[month][staffId] += shift.end - shift.start;
            }
        });
    });

    const months = Object.keys(monthTotals).sort();
    container.innerHTML = months.map(month => {
        const [year, monthNumber] = month.split('-');
        const rows = STAFF_LIST.map((staff, index) => `
            <tr>
                <td class="border border-gray-300 p-2 text-center">${index + 1}</td>
                <td class="border border-gray-300 p-2 font-semibold">${staff.name}</td>
                <td class="border border-gray-300 p-2 text-center">${staff.type}</td>
                <td class="border border-gray-300 p-2 text-center font-bold">${monthTotals[month][staff.id]}h</td>
            </tr>
        `).join('');
        const totalHours = Object.values(monthTotals[month]).reduce((total, hours) => total + hours, 0);

        return `<section class="mb-6 overflow-x-auto">
            <h3 class="mb-2 text-lg font-bold text-gray-800">Tháng ${monthNumber}/${year}</h3>
            <table class="w-full min-w-[600px] border-collapse border border-gray-300 text-sm">
                <thead><tr class="bg-[#521727] text-white">
                    <th class="border border-gray-300 p-2">STT</th>
                    <th class="border border-gray-300 p-2 text-left">Nhân viên</th>
                    <th class="border border-gray-300 p-2">Loại</th>
                    <th class="border border-gray-300 p-2">Tổng giờ trong tháng</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr class="bg-gray-100 font-bold">
                    <td class="border border-gray-300 p-2 text-right" colspan="3">Tổng giờ toàn bộ nhân viên</td>
                    <td class="border border-gray-300 p-2 text-center">${totalHours}h</td>
                </tr></tfoot>
            </table>
        </section>`;
    }).join('');
}

// --- HIỂN THỊ BẢNG PIVOT VÀ KIỂM TRA DUNG SAI ---
function renderFinalScheduleTable() {
    renderScheduleTable('schedule-table-container', finalSchedule, staffPositions, shiftQuotas, true);
}

function renderScheduleTable(containerId, scheduleData, positionData, quotaData, editablePositions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let missingAlerts = [];
    DAYS.forEach(day => {
        CORE_BLOCKS.forEach(block => {
            const required = quotaData[day]?.[block] ?? DEFAULT_QUOTA;
            const [cb_s, cb_e] = parseTime(block);
            let assignedCount = 0;
            
            if (scheduleData?.[day]) {
                Object.values(scheduleData[day]).forEach(shift => {
                    if (coversBlock([shift.start, shift.end], cb_s, cb_e)) assignedCount++;
                });
            }
            
            const minimumAccepted = Math.max(0, required - getAllowedShortfall(block));
            if (assignedCount < minimumAccepted) {
                const shortfallNote = getAllowedShortfall(block) > 0 ? ' (cho phép thiếu tối đa 1)' : '';
                missingAlerts.push(`<b>${day} (${block})</b>: Cần ${required}${shortfallNote}, chỉ xếp được ${assignedCount}`);
            }
            if (assignedCount > required) {
                missingAlerts.push(`<b>${day} (${block})</b>: Vượt định mức ${required}, đang xếp ${assignedCount}`);
            }
        });
    });

    let alertHtml = '';
    if (missingAlerts.length > 0) {
        alertHtml = `<div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 text-sm">
                        <p class="font-bold mb-1">⚠️ Cảnh báo định mức các ca lõi:</p>
                        <ul class="list-disc pl-5">${missingAlerts.map(msg => `<li>${msg}</li>`).join('')}</ul>
                     </div>`;
    }

    let html = alertHtml + `
        <table class="w-max min-w-[1462px] table-fixed border-collapse border border-gray-400 text-center text-sm font-medium">
            <colgroup>
                <col style="width: 40px">
                <col style="width: 120px">
                ${DAYS.map(() => `
                    <col style="width: 56px">
                    <col style="width: 56px">
                    <col style="width: 64px">
                `).join('')}
                <col style="width: 70px">
            </colgroup>
            <thead>
                <tr class="bg-[#521727] text-white">
                    <th class="border border-gray-400 p-2" rowspan="2">STT</th>
                    <th class="border border-gray-400 p-2" rowspan="2">Tên</th>
                    ${DAYS.map((day, index) => `<th class="border border-gray-400 p-2" colspan="3">${getScheduleHeaderLabel(day, index)}</th>`).join('')}
                    <th class="border border-gray-400 p-2" rowspan="2">Tổng giờ</th>
                </tr>
                <tr class="bg-gray-100 text-gray-800">
                    ${DAYS.map(() => `
                        <th class="border border-gray-400 p-1">Từ</th>
                        <th class="border border-gray-400 p-1">Đến</th>
                        <th class="border border-gray-400 p-1 text-center">Vị trí</th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>`;

    STAFF_LIST.forEach((staff, index) => {
        const nameBg = staff.type === 'FT' ? 'bg-[#fce49c]' : 'bg-white';
        const emptyBg = 'bg-[#cb6673]'; 
        let totalHoursForWeek = 0; 
        
        html += `<tr>
                    <td class="border border-gray-400 p-1 text-gray-700 bg-white">${index + 1}</td>
                    <td class="border border-gray-400 p-1 text-gray-900 ${nameBg}">${staff.name}</td>`;
        
        DAYS.forEach(day => {
            const shift = scheduleData?.[day]?.[staff.id];
            
            if (shift) {
                const hoursWorkedToday = shift.end - shift.start;
                totalHoursForWeek += hoursWorkedToday;
                const selectedPosition = positionData[day]?.[staff.id] || '';
                const positionCellColor = staff.type === 'FT' ? '#d9ead3' : '#ffe599';
                const positionOptions = ['', 'PTS', 'RTS', 'TN', 'TL', 'ĐGC', 'ĐG']
                    .map(position => `<option value="${position}" ${position === selectedPosition ? 'selected' : ''}>${position}</option>`)
                    .join('');

                html += `<td class="border border-gray-400 p-1 bg-white">${shift.start}</td>
                         <td class="border border-gray-400 p-1 bg-white">${shift.end}</td>
                         <td class="border border-gray-400 p-1 text-center align-middle" style="background-color: ${positionCellColor}">
                             <select aria-label="Vị trí ${staff.name} - ${day}"
                                     ${editablePositions ? `onchange="updateStaffPosition('${staff.id}', '${day}', this.value)"` : 'disabled'}
                                     class="mx-auto block w-14 rounded border border-gray-300 p-1 text-center" style="background-color: ${positionCellColor}">
                                 ${positionOptions}
                             </select>
                         </td>`;
            } else {
                html += `<td class="border border-gray-400 p-1 ${emptyBg}"></td>
                         <td class="border border-gray-400 p-1 ${emptyBg}"></td>
                         <td class="border border-gray-400 p-1 ${emptyBg}"></td>`;
            }
        });

        html += `<td class="border border-gray-400 p-1 bg-gray-100 text-gray-900 font-bold">
                    ${totalHoursForWeek}h
                 </td>
                 </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function exportToExcel() {
    try {
        let excelData = [];

        // Tạo dòng tiêu đề cho file Excel: [Ca làm, Thứ 2, Thứ 3, ..., Chủ Nhật]
        let headerRow = { "Ca làm / Nhân viên": currentUser };
        DAYS.forEach(day => headerRow[day] = "");
        excelData.push(headerRow);

        // Duyệt qua từng ca làm để lập bảng ma trận tương ứng với trạng thái đăng ký của user hiện tại
        SHIFTS.forEach(shift => {
            let rowObj = { "Ca làm / Nhân viên": shift };
            DAYS.forEach(day => {
                const isAvail = availabilities[currentUser]?.[day]?.[shift];
                rowObj[day] = isAvail ? "X" : ""; // Đánh dấu "X" nếu rảnh
            });
            excelData.push(rowObj);
        });

        // Khởi tạo WorkSheet từ JSON
        const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
        const workbook = XLSX.utils.book_new();
        
        // Lấy tên nhân viên hiện tại để đặt tên sheet cho sinh động
        const currentStaffObj = STAFF_LIST.find(s => s.id === currentUser);
        const staffName = currentStaffObj ? currentStaffObj.name : "NhanVien";

        XLSX.utils.book_append_sheet(workbook, worksheet, "DangKyCa");

        // Xuất file tải xuống trình duyệt
        XLSX.writeFile(workbook, `Dang_Ky_Ca_Lam_${staffName}.xlsx`);
    } catch (error) {
        console.error("Lỗi xuất Excel:", error);
        alert("Không thể xuất file Excel: " + error.message);
    }
}

// --- TÍNH NĂNG XUẤT / NHẬP EXCEL TOÀN BỘ NHÂN SỰ ---

// 1. Hàm Xuất toàn bộ dữ liệu đăng ký ca làm của tất cả nhân viên ra 1 file Excel
function exportToExcel() {
    try {
        let excelRows = [];

        // Duyệt qua từng ngày trong tuần để tạo các bảng dữ liệu tương ứng
        DAYS.forEach(day => {
            // Dòng tiêu đề cho ngày trong tuần
            let headerRow = { "Ca làm / Nhân viên": `--- NGÀY: ${day.toUpperCase()} ---` };
            STAFF_LIST.forEach(staff => {
                headerRow[staff.name] = "";
            });
            excelRows.push(headerRow);

            // Duyệt qua từng ca làm
            SHIFTS.forEach(shift => {
                let rowObj = { "Ca làm / Nhân viên": shift };
                STAFF_LIST.forEach(staff => {
                    // Kiểm tra xem nhân sự này có đăng ký rảnh ca này vào ngày này không
                    const isAvail = availabilities[staff.id]?.[day]?.[shift];
                    rowObj[staff.name] = isAvail ? "X" : ""; 
                });
                excelRows.push(rowObj);
            });

            // Thêm một dòng trống giữa các ngày cho dễ nhìn
            excelRows.push({ "Ca làm / Nhân viên": "" });
        });

        // Khởi tạo WorkSheet từ mảng dữ liệu tổng hợp
        const worksheet = XLSX.utils.json_to_sheet(excelRows, { skipHeader: false });
        const workbook = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "DangKyToanBoNhanVien");

        // Xuất file tải xuống
        XLSX.writeFile(workbook, `Dang_Ky_Ca_Lam_Toan_Bo_Nhan_Su.xlsx`);
    } catch (error) {
        console.error("Lỗi xuất Excel toàn bộ:", error);
        alert("Không thể xuất file Excel: " + error.message);
    }
}

// 2. Hàm Nhập dữ liệu đăng ký ca làm của toàn bộ nhân sự từ file Excel
function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                alert("File Excel không đúng định dạng hoặc không có dữ liệu!");
                return;
            }

            // Đọc dòng tiêu đề (chứa tên các nhân sự ở các cột)
            const headers = jsonData[0]; 
            
            let currentDay = null;

            // Duyệt qua từng dòng trong file Excel
            for (let i = 0; i < jsonData.length; i++) {
                let row = jsonData[i];
                if (!row || row.length === 0) continue;

                let col0 = String(row[0] || "").trim();

                // Kiểm tra xem dòng này có phải là dòng mốc ngày không (ví dụ: "--- NGÀY: THỨ HAI ---")
                if (col0.includes("--- NGÀY:")) {
                    for (let d of DAYS) {
                        if (col0.toLowerCase().includes(d.toLowerCase())) {
                            currentDay = d;
                            break;
                        }
                    }
                    continue;
                }

                // Nếu là dòng ca làm và đã xác định được ngày hiện tại
                if (currentDay && SHIFTS.includes(col0)) {
                    let shiftName = col0;

                    // Duyệt qua các cột tương ứng với từng nhân sự
                    for (let j = 1; j < row.length; j++) {
                        let staffName = headers[j];
                        if (!staffName) continue;

                        // Tìm ID nhân sự dựa vào tên hiển thị trong STAFF_LIST
                        let matchedStaff = STAFF_LIST.find(s => s.name.trim().toLowerCase() === String(staffName).trim().toLowerCase());
                        
                        if (matchedStaff) {
                            let cellValue = row[j];
                            let isChecked = false;

                            if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== "") {
                                let valStr = String(cellValue).trim().toLowerCase();
                                if (valStr === 'x' || valStr === '1' || valStr === 'true' || valStr === 'có' || valStr === '✅') {
                                    isChecked = true;
                                }
                            }

                            // Cập nhật vào cấu trúc availabilities toàn cục
                            if (!availabilities[matchedStaff.id]) availabilities[matchedStaff.id] = {};
                            if (!availabilities[matchedStaff.id][currentDay]) availabilities[matchedStaff.id][currentDay] = {};
                            
                            if (isChecked) {
                                availabilities[matchedStaff.id][currentDay][shiftName] = true;
                            } else {
                                delete availabilities[matchedStaff.id][currentDay][shiftName];
                            }
                        }
                    }
                }
            }

            // Lưu dữ liệu và làm mới giao diện
            saveData();
            renderRegisterTable();
            alert("Đã nhập thành công dữ liệu đăng ký ca của toàn bộ nhân sự từ file Excel!");
            
            event.target.value = "";

        } catch (error) {
            console.error("Lỗi đọc file Excel toàn bộ:", error);
            alert("Lỗi đọc file Excel. Vui lòng kiểm tra lại cấu trúc file tổng hợp!");
        }
    };
    reader.readAsArrayBuffer(file);
}