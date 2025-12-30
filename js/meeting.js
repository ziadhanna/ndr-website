var meetingId = new URLSearchParams(window.location.search).get('id');

const setMeetingId = () => {
    meetingId = new URLSearchParams(window.location.search).get('id');
}

let isUnsaved = false;

// Trigger browser warning if isUnsaved is true
window.addEventListener('beforeunload', (event) => {
    if (isUnsaved) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome/Edge/Firefox
    }
});

// Helper to mark state as dirty
const markAsUnsaved = () => {
    isUnsaved = true;
};

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
const addMeetingItemRow = (id, start = '', end = '', theme = '', insertAfterTr = null) => {
    const tableBody = document.querySelector("#meeting-items-table tbody");
    
    // Determine if this will be the first row
    const isFirstRow = !insertAfterTr && tableBody.children.length === 0;

    // Prefill Logic: If not provided, try to grab from previous row
    if (!start && !isFirstRow) {
        // If inserting after a specific row, use that row's end time
        if (insertAfterTr) {
            const prevEnd = insertAfterTr.querySelector('.end-time').value;
            if (prevEnd) start = prevEnd;
        } else {
            // Fallback to last row if appending
            const rows = tableBody.querySelectorAll('tr');
            if (rows.length > 0) {
                const lastRowEnd = rows[rows.length - 1].querySelectorAll('input')[1].value;
                if (lastRowEnd) start = lastRowEnd;
            }
        }
    }

    const row = document.createElement('tr');
    if (id) row.id = id;

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
        <td class="text-center align-middle text-nowrap">
            <button class="btn btn-outline-primary btn-sm add-item-btn me-1" type="button" tabindex="-1" title="Insert item below">
                <i class="fas fa-plus"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm remove-item-btn" type="button" tabindex="-1" title="Delete item">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    
    // Insertion Logic
    if (insertAfterTr && insertAfterTr.nextSibling) {
        tableBody.insertBefore(row, insertAfterTr.nextSibling);
    } else {
        tableBody.appendChild(row);
    }

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
        const addBtn = tr.querySelector('.add-item-btn'); // <--- Select new button
        const icon = removeBtn.querySelector('i'); 

        // 1. INSERT BUTTON LOGIC (New)
        addBtn.addEventListener('click', () => {
            // Get current row's end time to prefill the new row's start time
            const currentEnd = endTimeInput.value;
            
            // Insert new row immediately AFTER this 'tr'
            const newRow = addMeetingItemRow(null, currentEnd, '', '', tr);
            
            // If there was a row AFTER the new one, we need to link the chain
            // (New Row End Time is empty, so Next Row Start Time becomes empty until filled)
            const nextRow = newRow.nextElementSibling;
            if (nextRow) {
                const nextStart = nextRow.querySelector('.start-time');
                nextStart.value = ''; // Reset because chain is broken until user fills new row
            }

            attachListeners(newRow);
            updateDeleteButtons();
        });

        // 2. DELETE LOGIC (Existing - No changes needed, just ensure it handles the chain)
        removeBtn.addEventListener('click', async () => {
             // ... [Keep your existing delete logic exactly as is] ...
             // (Copy the full delete logic block from the previous response here)
             if (tr.id) {
                const originalClass = icon.className;
                icon.className = 'fas fa-spinner fa-spin'; 
                removeBtn.disabled = true;
                try {
                    const deleteUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/meetings/items/${tr.id}`;
                    const response = await fetch(deleteUrl, { method: 'DELETE' });
                    if (!response.ok) throw new Error("Failed to delete item");
                    tr.removeAttribute('id'); tr.id = ""; 
                } catch (error) {
                    console.error("Error deleting item:", error);
                    alert("Error deleting item from database.");
                    icon.className = originalClass;
                    removeBtn.disabled = false;
                    return; 
                }
            }
            
            if (tr === tableBody.lastElementChild) {
                inputs.forEach(input => input.value = '');
                icon.className = 'fas fa-trash-alt';
                removeBtn.disabled = false;
            } else {
                const prevRow = tr.previousElementSibling;
                const nextRow = tr.nextElementSibling;
                tr.remove();
                if (prevRow && nextRow) {
                    const prevEndVal = prevRow.querySelector('.end-time').value;
                    const nextStart = nextRow.querySelector('.start-time');
                    nextStart.value = prevEndVal;
                } else if (!prevRow && nextRow) {
                    const nextStart = nextRow.querySelector('.start-time');
                    nextStart.removeAttribute('readonly');
                    nextStart.removeAttribute('tabindex');
                    nextStart.style.backgroundColor = '';
                }
            }
            updateDeleteButtons();
            updateMeeting(); 
        });

        // 3. PREFILL NEXT ROW (Existing)
        endTimeInput.addEventListener('change', () => {
            const nextRow = tr.nextElementSibling;
            if (nextRow) {
                const nextStart = nextRow.querySelector('.start-time');
                nextStart.value = endTimeInput.value;
                nextStart.setAttribute('readonly', true);
                nextStart.setAttribute('tabindex', '-1');
                nextStart.style.backgroundColor = '#e9ecef';
            }
        });

        // 4. AUTO-ADD & TAB SKIP (Existing)
        inputs.forEach(input => {
             input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey && input.type === 'time') {
                    e.preventDefault(); 
                    const allInputs = Array.from(document.querySelectorAll('#meeting-items-table input:not([tabindex="-1"])'));
                    const currentIndex = allInputs.indexOf(input);
                    if (currentIndex > -1 && currentIndex < allInputs.length - 1) {
                        allInputs[currentIndex + 1].focus();
                    } else {
                        const saveBtn = document.getElementById('save-meeting-btn');
                        if (saveBtn) saveBtn.focus();
                    }
                }
            });

            input.addEventListener('input', () => {
                markAsUnsaved();
                const lastRow = tableBody.lastElementChild;
                if (tr === lastRow && !isRowEmpty(tr)) {
                    const newRow = addMeetingItemRow(null);
                    attachListeners(newRow); 
                    updateDeleteButtons();
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
    // 1. Validation Logic
    const tableRows = document.querySelectorAll('#meeting-items-table tbody tr');
    let isValid = true;

    for (const row of tableRows) {
        const inputs = row.querySelectorAll('input');
        const startVal = inputs[0].value;
        const endVal = inputs[1].value;
        const themeVal = inputs[2].value.trim();

        // Determine if the row is "active" (has End Time or Theme)
        // We ignore the last dummy row if it only has an auto-filled Start Time.
        const isActiveRow = endVal || themeVal;

        if (isActiveRow) {
            // Check 1: Completeness (Must have both times)
            if (!startVal || !endVal) {
                alert("Please provide both Start and End times for all meeting items.");
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (!startVal) inputs[0].focus();
                else inputs[1].focus();
                return; // STOP execution
            }

            // Check 2: Strict Chronology (End > Start)
            // String comparison works here because values are in "HH:mm" 24-hour format
            if (startVal >= endVal) {
                alert("End Time must be strictly later than Start Time.");
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the End Time input as the issue
                inputs[1].focus();
                inputs[1].style.borderColor = "red"; // Optional visual cue
                setTimeout(() => inputs[1].style.borderColor = "", 3000); // Reset after 3s
                return; // STOP execution
            }
        }
    }

    // 2. Existing Save Logic
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    const plannedInput = document.getElementById('planned-participants');
    const actualInput = document.getElementById('actual-participants');
    
    // Retrieve Date safely
    const dateInput = document.getElementById('meeting-date');
    const rawDate = dateInput.getAttribute('data-iso') || new Date().toISOString(); 
    const [year, month, day] = rawDate.split('T')[0].split('-').map(Number);

    const PlannedParticipantsNumber = parseInt(plannedInput.value) || 0;
    const ActualParticipantsNumber = parseInt(actualInput.value) || 0;

    const MeetingItems = [];

    tableRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const startVal = inputs[0].value; 
        const endVal = inputs[1].value;
        const themeVal = inputs[2].value;

        // Skip rows that are empty (double check for data collection)
        if (!endVal && !themeVal.trim()) return;

        const itemId = row.id;
        const [startHours, startMinutes] = startVal.split(":").map(Number);
        const [endHours, endMinutes] = endVal.split(":").map(Number);

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

    return fetch(`https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/meetings/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update meeting');
        console.log('Meeting updated successfully');
        
        isUnsaved = false; // Reset unsaved flag
    })
    .catch(error => {
        console.error('Error updating meeting:', error);
        alert('Error updating meeting');
    })
    .finally(() => {
        if (loader) loader.style.display = 'none';
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
    
    const staticInputs = document.querySelectorAll('#meeting-theme, #planned-participants, #actual-participants, #meeting-date');
    staticInputs.forEach(input => {
        input.addEventListener('input', markAsUnsaved);
    });
});