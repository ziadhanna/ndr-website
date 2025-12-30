var meetingId = new URLSearchParams(window.location.search).get('id');

const setMeetingId = () => {
    meetingId = new URLSearchParams(window.location.search).get('id');
}

const utcToTimeInputValue = (utcString) => {
    if (!utcString) return '';
    const d = new Date(utcString);
    const pad = n => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const getMeetingDetails = async () => {
    // Keeps your existing logic for fetching header details (Date, participants, etc.)
    const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/meetings/${meetingId}/details`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch meeting details");
        
        const data = await response.json();

        const themeInput = document.getElementById('meeting-theme');
        if(themeInput && data.Theme) themeInput.value = data.Theme;

        const dateInput = document.getElementById('meeting-date');
        if (dateInput && data.Date) {
            const dateObj = new Date(data.Date);
            dateInput.setAttribute('data-iso', data.Date);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            dateInput.value = `${day} ${month}`;
        }

        const plannedInput = document.getElementById('planned-participants');
        if(plannedInput) plannedInput.value = data.PlannedParticipants;

        const actualInput = document.getElementById('actual-participants');
        if(actualInput) actualInput.value = data.ActualParticipants;

    } catch (error) {
        console.error("Error fetching meeting details:", error);
    }
}

// 1. Function to render the Table
const getMeetingItems = async () => {
    const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/meetings/meetingitems?meetingId=${meetingId}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const tableBody = document.querySelector("#meeting-items-table tbody");
        tableBody.innerHTML = ''; 

        // 1. Load existing items from DB
        data.forEach(item => {
            addMeetingItemRow(item.ndr_activityitemid, item.ndr_startdatetime, item.ndr_enddatetime, item.ndr_theme);
        });

        // 2. Initialize the table logic (This will add the ghost row with prefilled time)
        handleMeetingItemsTable();
    }
    catch (error) {
        console.error("Error fetching meeting items:", error);
    }
}

const formatTimeValue = (val) => {
    if (!val) return '';
    // If it already looks like HH:mm, return it as is
    if (val.includes(':') && val.length === 5) return val;
    // Otherwise, assume it's an ISO date string and convert it
    return utcToTimeInputValue(val);
};

// 2. Helper to add a single row
const addMeetingItemRow = (id, start = '', end = '', theme = '') => {
    const tableBody = document.querySelector("#meeting-items-table tbody");
    const isFirstRow = tableBody.children.length === 0;

    if (!start && !isFirstRow) {
        const rows = tableBody.querySelectorAll('tr');
        if (rows.length > 0) {
            const lastRowEnd = rows[rows.length - 1].querySelectorAll('input')[1].value;
            if (lastRowEnd) start = lastRowEnd; 
        }
    }

    const row = document.createElement('tr');
    if (id) row.id = id;

    // UPDATE: Add tabindex="-1" to read-only rows so Tab key skips them
    const readOnlyAttr = isFirstRow ? '' : 'readonly tabindex="-1"';
    const readOnlyStyle = isFirstRow ? '' : 'style="background-color: #e9ecef;"';

    row.innerHTML = `
        <td>
            <input type="time" class="form-control start-time" 
                   value="${formatTimeValue(start)}" 
                   ${readOnlyAttr} ${readOnlyStyle} />
        </td>
        <td>
            <input type="time" class="form-control end-time" 
                   value="${formatTimeValue(end)}" />
        </td>
        <td>
            <input type="text" class="form-control theme" 
                   value="${theme || ''}" />
        </td>
        <td class="text-center align-middle">
            <button class="btn btn-outline-danger btn-sm remove-item-btn" type="button" tabindex="-1">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    
    tableBody.appendChild(row);
    return row;
}

// 2. Updated Logic for Delete and Auto-Add
const handleMeetingItemsTable = () => {
    const tableBody = document.querySelector("#meeting-items-table tbody");

    const updateDeleteButtons = () => {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const btn = row.querySelector('.remove-item-btn');
            if (btn) {
                // Toggle visibility: hidden for last row, visible for others
                btn.style.visibility = (index === rows.length - 1) ? 'hidden' : 'visible';
            }
        });
    };

    const isRowEmpty = (tr) => {
        const theme = tr.querySelector('.theme').value;
        const end = tr.querySelector('.end-time').value;
        return theme.trim() === '' && end === '';
    };

    const attachListeners = (tr) => {
        const inputs = tr.querySelectorAll('input');
        const endTimeInput = tr.querySelector('.end-time');
        const removeBtn = tr.querySelector('.remove-item-btn');

        removeBtn.addEventListener('click', () => {
            const nextRow = tr.nextElementSibling;
            const prevRow = tr.previousElementSibling;
            
            tr.remove();
            
            // EDGE CASE: If we deleted the FIRST row, the new top row must become editable and TABBABLE
            if (!prevRow && nextRow) {
                const nextStart = nextRow.querySelector('.start-time');
                nextStart.removeAttribute('readonly');
                nextStart.removeAttribute('tabindex'); // <--- Make tabbable
                nextStart.style.backgroundColor = ''; 
            }

            updateDeleteButtons();
        });

        endTimeInput.addEventListener('change', () => {
            const nextRow = tr.nextElementSibling;
            if (nextRow) {
                const nextStart = nextRow.querySelector('.start-time');
                nextStart.value = endTimeInput.value;
                nextStart.setAttribute('readonly', true);
                nextStart.setAttribute('tabindex', '-1'); // <--- Make skipped
                nextStart.style.backgroundColor = '#e9ecef';
            }
        });

        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const lastRow = tableBody.lastElementChild;
                if (tr === lastRow && !isRowEmpty(tr)) {
                    const newRow = addMeetingItemRow(null);
                    attachListeners(newRow); 
                    updateDeleteButtons();
                }
            });
        });

        inputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    // Check if this is a time input
                    if (input.type === 'time') {
                        e.preventDefault(); // Stop default tab behavior (which might go to the icon)
                        
                        // Find the next input in the row or the next row
                        const allInputs = Array.from(document.querySelectorAll('#meeting-items-table input:not([tabindex="-1"])'));
                        const currentIndex = allInputs.indexOf(input);
                        
                        if (currentIndex > -1 && currentIndex < allInputs.length - 1) {
                            allInputs[currentIndex + 1].focus();
                        } else {
                            // If it's the last input, focus the save button or next focusable element
                            const saveBtn = document.getElementById('save-meeting-btn');
                            if (saveBtn) saveBtn.focus();
                        }
                    }
                }
            });
        });
    };

    // Initialize existing rows
    const existingRows = tableBody.querySelectorAll('tr');
    existingRows.forEach((row, index) => {
        const startInput = row.querySelector('.start-time');
        if (index === 0) {
            // First row: Editable and Tabbable
            startInput.removeAttribute('readonly');
            startInput.removeAttribute('tabindex'); 
            startInput.style.backgroundColor = '';
        } else {
            // Other rows: Readonly and Skipped
            startInput.setAttribute('readonly', true);
            startInput.setAttribute('tabindex', '-1');
            startInput.style.backgroundColor = '#e9ecef';
        }
        attachListeners(row);
    });

    if (existingRows.length === 0) {
        const newRow = addMeetingItemRow(null);
        attachListeners(newRow);
    } else {
        const lastRow = tableBody.lastElementChild;
        if (lastRow && !isRowEmpty(lastRow)) {
            const newRow = addMeetingItemRow(null);
            attachListeners(newRow);
        }
    }

    updateDeleteButtons();
};

const updateMeeting = () => {
    const plannedInput = document.getElementById('planned-participants');
    const actualInput = document.getElementById('actual-participants');
    
    // 1. Safe Date Retrieval
    // Since the visible input is now formatted as "24 JAN", we cannot parse it directly.
    // We try to grab the raw ISO date from a data attribute (if you set one) or default to a safe value.
    // Ideally, ensure getMeetingDetails sets: dateInput.setAttribute('data-iso', data.Date);
    // For now, we will assume the backend handles the date or we use the Meeting's known date.
    // This is a placeholder for the date logic you established previously.
    const dateInput = document.getElementById('meeting-date');
    const rawDate = dateInput.getAttribute('data-iso') || new Date().toISOString(); 
    const [year, month, day] = rawDate.split('T')[0].split('-').map(Number);

    const PlannedParticipantsNumber = parseInt(plannedInput.value) || 0;
    const ActualParticipantsNumber = parseInt(actualInput.value) || 0;

    const tableRows = document.querySelectorAll('#meeting-items-table tbody tr');
    const MeetingItems = [];

    tableRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        
        // input[0] is Start Time (might be prefilled, so we ignore it for validity check)
        const startVal = inputs[0].value; 
        const endVal = inputs[1].value;
        const themeVal = inputs[2].value;

        // CHECK: Ignore row if End Time AND Theme are empty.
        // We explicitly ignore 'startVal' here because it might be auto-filled.
        if (!endVal && !themeVal.trim()) return;

        const itemId = row.id;
        const [startHours, startMinutes] = startVal ? startVal.split(":").map(Number) : [0, 0];
        const [endHours, endMinutes] = endVal ? endVal.split(":").map(Number) : [0, 0];

        MeetingItems.push({
            ndr_activityitemid: itemId ? itemId : null,
            ndr_StartDateTime: new Date(year, month - 1, day, startHours, startMinutes),
            ndr_EndDateTime: new Date(year, month - 1, day, endHours, endMinutes),
            ndr_Theme: themeVal.trim()
        });
    });

    const body = {
        PlannedParticipantsNumber,
        ActualParticipantsNumber,
        MeetingItems
    };

    console.log(JSON.stringify(body, null, 2));

    fetch(`https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/meetings/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update meeting');
        alert('Meeting updated successfully!');
    })
    .catch(error => {
        console.error('Error updating meeting:', error);
        alert('Error updating meeting');
    });
}

document.addEventListener('scriptJsReady', () => {
    redirectToSignIn("meeting.html");
    setMeetingId();

    const saveBtn = document.getElementById('save-meeting-btn');

    getMeetingDetails();
    getMeetingItems();

    saveBtn.addEventListener('click', () => {
        updateMeeting();
    });
});