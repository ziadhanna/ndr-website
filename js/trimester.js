var trimesterId = new URLSearchParams(window.location.search).get('trimesterId');

const getCurrentTrimesterId = async () => {
    const roleCode = JSON.parse(localStorage.ndrUser)['https://sdl-ndrosaire.com/user_metadata']['role'];
    const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/current?roleCode=${roleCode}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Network response was not ok");

      const trimester = await response.json();
      const trimesterId = trimester?.ndr_trimesterid;

      return trimesterId;

    } catch (error) {
      console.error("Failed to fetch trimester ID:", error);
    }
}

const setTrimesterId = async () => {
  trimesterId = new URLSearchParams(window.location.search).get('trimesterId') || await getCurrentTrimesterId();
}

const getTrimesterMeetings = async () => {
  const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/meetings?trimesterId=${trimesterId}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const tableBody = document.querySelector("#meetings-table tbody");

    data.forEach(meeting => {
      const row = document.createElement("tr");
      row.id = meeting.ndr_activityid;

      const dateObj = new Date(meeting.ndr_startdatetime);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

      row.innerHTML = `
        <td style="font-weight: bold;">${day} ${month}</td>
        <td><input type="text" value="${meeting.ndr_theme ? meeting.ndr_theme : ""}" /></td>
        <td>
          <a href="meeting.html?id=${meeting.ndr_activityid}&source=trimester.html" class="info-btn" title="View Info" style="font-size: 1.2em; text-decoration: none;" tabindex="-1">
            <i class="fa-solid fa-circle-info" tabindex="-1"></i>
          </a>
        </td>
      `;

      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
  }
};


const getTrimesterNeeds = async () => {
  const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/needs?trimesterId=${trimesterId}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const tableBody = document.querySelector("#needs-table tbody");

    data.forEach(need => {
      const row = document.createElement("tr");
      row.id = need.ndr_needid;

      row.innerHTML = `
        <td><input type="text" value="${need.ndr_name ? need.ndr_name : ""}" /></td>
      `;

      tableBody.appendChild(row);
    });

    handleMultipleInputs('needs-table');
  } catch (error) {
    console.error("Error fetching needs:", error);
  }
};


const getTrimesterObjectives = async () => {
  const apiUrl = `https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/objectives?trimesterId=${trimesterId}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const tableBody = document.querySelector("#objectives-table tbody");

    data.forEach(objective => {
      const row = document.createElement("tr");
      row.id = objective.ndr_objectiveid;

      row.innerHTML = `
        <td><input type="text" value="${objective.ndr_name ? objective.ndr_name : ""}" /></td>
      `;

      tableBody.appendChild(row);
    });

    handleMultipleInputs('objectives-table');
  } catch (error) {
    console.error("Error fetching objectives:", error);
  }
};


const handleMultipleInputs = (tableId) => {
  const tableBody = document.getElementById(tableId).querySelector('tbody');

  // Add a blank input row at the end
  const addBlankInputRow = () => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    td.appendChild(input);
    tr.appendChild(td);
    tableBody.appendChild(tr);

    input.addEventListener('input', function () {
      const inputs = tableBody.querySelectorAll('input[type="text"]');
      // Add new input if this is the last and not empty
      if (inputs[inputs.length - 1] === input && input.value.trim() !== '') {
        addBlankInputRow();
      }
      // Remove row if input is emptied and there is more than one row and it's not the last row
      if (input.value === '' && tableBody.rows.length > 1 && tr !== tableBody.lastElementChild) {
        tableBody.removeChild(tr);
      }
    });
  };

  // Attach event listeners to all existing inputs
  const attachListeners = () => {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((tr, idx) => {
      const input = tr.querySelector('input[type="text"]');
      if (!input) return;
      input.oninput = function () {
        const inputs = tableBody.querySelectorAll('input[type="text"]');
        // Add new input if this is the last and not empty
        if (inputs[inputs.length - 1] === input && input.value.trim() !== '') {
          addBlankInputRow();
        }
        // Remove row if input is emptied and there is more than one row and it's not the last row
        if (input.value === '' && tableBody.rows.length > 1 && tr !== tableBody.lastElementChild) {
          tableBody.removeChild(tr);
          var entity = tableId.replace('s-table', '');
          if (tr.id) {
            fetch(`https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/${entity}s?${entity}Id=${tr.id}`, {
              method: 'DELETE'
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Failed to delete ${entity}`);
                }
              })
              .catch(error => {
                console.error(`Error deleting ${entity}:`, error);
              });
          }
        }
      };
    });
  };

  attachListeners();
  addBlankInputRow();
};

const updateTrimester = () => {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = 'flex';
  }
  const needs = [];
  document.querySelectorAll('#needs-table tbody tr').forEach(tr => {
    const text = tr.querySelector("td input").value.trim();
    if (text) needs.push({ ndr_name: text, ndr_needid: tr.id || null });
  });

  const objectives = [];
  document.querySelectorAll('#objectives-table tbody tr').forEach(tr => {
    const text = tr.querySelector("td input").value.trim();
    if (text) objectives.push({ ndr_name: text, ndr_objectiveid: tr.id || null });
  });

  const meetings = [];
  document.querySelectorAll('#meetings-table tbody tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 2) {
      const theme = tds[1].querySelector("input").value;
      meetings.push({ ndr_activityid: tr.id, ndr_theme: theme });
    }
  });

  const body = {
    needs,
    objectives,
    meetings
  };

  console.log(JSON.stringify(body, null, 2));

  fetch(`https://sdl-ndrosaire-gmf8cnafg5g9fufr.francecentral-01.azurewebsites.net/api/trimesters/${trimesterId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to update trimester');
      alert('Trimester updated successfully!');
      if (loader) {
        loader.style.display = 'none';
      }
    })
    .catch(error => {
      console.error('Error updating trimester:', error);
      alert('Error updating trimester');
      if (loader) {
        loader.style.display = 'none';
      }
    });
}

document.addEventListener("scriptJsReady", async () => {
  showLoader();
  redirectToSignIn("trimester.html");
  await setTrimesterId();
  await getTrimesterMeetings();
  await getTrimesterNeeds();
  await getTrimesterObjectives();

  document.getElementById('save-trimester-btn').addEventListener('click', () => {
    updateTrimester();
  });
  hideLoader();
});

