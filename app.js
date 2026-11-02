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
let pendingProtectedTab = null;
const PROTECTED_TABS_UNLOCKED_KEY = 'protectedTabsUnlocked';
let protectedTabsUnlocked = localStorage.getItem(PROTECTED_TABS_UNLOCKED_KEY) === 'true';

function saveData() {
    localStorage.setItem('availabilities', JSON.stringify(availabilities));
    localStorage.setItem('shiftQuotas', JSON.stringify(shiftQuotas));
    if (finalSchedule) localStorage.setItem('finalSchedule', JSON.stringify(finalSchedule));
}

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
        availabilities = {};
        finalSchedule = null;
        renderRegisterTable();
        document.getElementById('schedule-table-container').innerHTML = 
            `<div class="text-center py-10 text-gray-500">Chưa có lịch được xếp.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initStaffSelect();
    renderRegisterTable();
    renderConfigTable(); 
    if (finalSchedule) renderFinalScheduleTable();
});

function initStaffSelect() {
    const select = document.getElementById('staff-select');
    select.innerHTML = STAFF_LIST.map(staff => `<option value="${staff.id}">${staff.name} - ${staff.type}</option>`).join('');
}

function changeUser(userId) {
    currentUser = userId;
    renderRegisterTable(); 
}

function switchTab(targetTab) {
    if (targetTab === 'schedule' || targetTab === 'config') {
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
    const tabs = ['register', 'schedule', 'config'];
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

// --- HIỂN THỊ BẢNG PIVOT VÀ KIỂM TRA DUNG SAI ---
function renderFinalScheduleTable() {
    const container = document.getElementById('schedule-table-container');
    
    let missingAlerts = [];
    DAYS.forEach(day => {
        CORE_BLOCKS.forEach(block => {
            const required = getQuota(day, block);
            const [cb_s, cb_e] = parseTime(block);
            let assignedCount = 0;
            
            if (finalSchedule[day]) {
                Object.values(finalSchedule[day]).forEach(shift => {
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
        <table class="w-full border-collapse border border-gray-400 text-center text-sm font-medium">
            <thead>
                <tr class="bg-[#521727] text-white">
                    <th class="border border-gray-400 p-2 w-10">STT</th>
                    <th class="border border-gray-400 p-2 w-36">Tên</th>
                    ${DAYS.map(day => `<th class="border border-gray-400 p-2" colspan="2">${day}</th>`).join('')}
                    <th class="border border-gray-400 p-2 w-24">Tổng giờ</th>
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
            const shift = getStaffDayShift(staff.id, day);
            
            if (shift) {
                const hoursWorkedToday = shift.end - shift.start;
                totalHoursForWeek += hoursWorkedToday;

                html += `<td class="border border-gray-400 p-1 bg-white">${shift.start}</td>
                         <td class="border border-gray-400 p-1 bg-white">${shift.end}</td>`;
            } else {
                html += `<td class="border border-gray-400 p-1 ${emptyBg}"></td>
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