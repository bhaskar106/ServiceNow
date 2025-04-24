document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const filterBtn = document.getElementById('filterBtn');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const desc = document.getElementById('desc');
  const incidentText = document.getElementById('incidentText');
  const incidentNumber = document.getElementById('incidentNumber');
  const filterContainer = document.getElementById('filterContainer');
  const filterCategories = document.getElementById('filterCategories');
  const miscSection = document.getElementById('miscSection');

  const categories = {
    "Network & Host Info": [
      "host", "host_ip", "host_nc", "noc_nat_ip", "ifindex", "interface_caption",
      "interface_name", "interface_unpluggable", "originating_event_host", "last_boot"
    ],
    "URLs & External Links": [
      "host_page_url", "recent_events_url"
    ],
    "Timestamps & Events": [
      "event_time", "raw_event_extracted", "etype", "priority", "all_extra_fields", "source"
    ],
    "Location & Address Info": [
      "address1", "address2", "city", "state", "zip_code", "country", "location"
    ],
    "Customer & Organization Info": [
      "customer_code", "customer_name", "vpg_customer_code", "virtual_protection_group"
    ],
    "Asset & Device Info": [
      "asset", "device", "model", "serial_number", "vendor", "ios_image", "ios_version", "orion_machine_type"
    ],
    "Miscellaneous / Other": ["friend_msg"]
  };

  let parsedData = {}, selectedKeys = new Set();

  const organizeCategories = (data) => {
    const result = {}, misc = { ...data };
    for (const [cat, keys] of Object.entries(categories)) {
      result[cat] = {};
      keys.forEach(k => {
        if (misc[k]) {
          result[cat][k] = misc[k];
          delete misc[k];
        }
      });
    }
    result["Miscellaneous / Other"] = misc;
    return result;
  };

  function renderFilters(data) {
    filterCategories.innerHTML = '';

    for (const [category, fields] of Object.entries(data)) {
      const group = document.createElement('div');
      group.className = 'category-group';

      const header = document.createElement('div');
      header.className = 'category-header';

      const groupCheckbox = document.createElement('input');
      groupCheckbox.type = 'checkbox';
      groupCheckbox.id = `group-${category}`;

      groupCheckbox.checked = Object.keys(fields).every(k => selectedKeys.has(k));

      groupCheckbox.addEventListener('change', () => {
        for (const key in fields) {
          const cb = document.getElementById(`chk-${key}`);
          cb.checked = groupCheckbox.checked;

          if (groupCheckbox.checked) {
            selectedKeys.add(key);
          } else {
            selectedKeys.delete(key);
          }
        }
        displayFilteredData();
      });

      header.appendChild(groupCheckbox);
      header.appendChild(document.createTextNode(category));
      group.appendChild(header);

      const keyList = document.createElement('div');
      keyList.className = 'category-keys';

      for (const key in fields) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedKeys.has(key);
        checkbox.id = `chk-${key}`;

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedKeys.add(key);
          } else {
            selectedKeys.delete(key);
          }

          const allInGroup = Object.keys(fields);
          const allSelected = allInGroup.every(k => selectedKeys.has(k));
          const noneSelected = allInGroup.every(k => !selectedKeys.has(k));

          const groupCb = document.getElementById(`group-${category}`);
          groupCb.checked = allSelected;
          if (!allSelected && !noneSelected) {
            groupCb.indeterminate = true;
          } else {
            groupCb.indeterminate = false;
          }

          displayFilteredData();
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(key));
        keyList.appendChild(label);
      }

      group.appendChild(keyList);
      filterCategories.appendChild(group);
    }
  }

  function createDataRow(key, val) {
    const row = document.createElement('div');
    row.className = 'data-row';

    const keyDiv = document.createElement('div');
    keyDiv.className = 'key';
    keyDiv.textContent = `${key}:`;

    const valDiv = document.createElement('div');
    valDiv.className = 'value';

    if (/url/i.test(key) || /^https?:\/\//i.test(val)) {
      const link = document.createElement('a');
      link.href = val;
      link.textContent = key;
      link.target = '_blank';
      valDiv.appendChild(link);
    } else {
      valDiv.textContent = val;
    }

    row.append(keyDiv, valDiv);
    return row;
  }

  const renderData = () => {
    incidentText.innerHTML = '';
    for (const [cat, fields] of Object.entries(parsedData)) {
      if (cat === "Miscellaneous / Other") continue;
      const entries = Object.entries(fields).filter(([k]) => selectedKeys.has(k));
      if (!entries.length) continue;
      const groupWrapper = document.createElement('div');
      groupWrapper.style.marginTop = '20px';
      groupWrapper.style.paddingBottom = '10px';
      groupWrapper.style.borderBottom = '1px solid #ccc';

      const groupTitle = document.createElement('div');
      groupTitle.innerHTML = `<strong>${cat}</strong>`;
      groupTitle.className = 'category-title';
      groupTitle.style.fontSize = '16px';
      groupTitle.style.marginBottom = '8px';
      groupWrapper.appendChild(groupTitle);

      for (const [key, val] of filteredEntries) {
        const row = createDataRow(key, val);
        groupWrapper.appendChild(row);
      }

      incidentText.appendChild(groupWrapper);
      entries.forEach(([k, v]) => renderRow(k, v, incidentText));
    }

    miscSection.innerHTML = '';
    for (const [k, v] of Object.entries(parsedData["Miscellaneous / Other"])) {
      renderRow(k, v, miscSection);
    }
  };

  const renderRow = (key, val, container) => {
    const row = document.createElement('div');
    row.className = 'data-row';
    const keyDiv = document.createElement('div');
    keyDiv.className = 'key';
    keyDiv.textContent = `${key}:`;

    const valDiv = document.createElement('div');
    valDiv.className = 'value';

    if (/url/i.test(key) || /^https?:\/\//i.test(val)) {
      const a = document.createElement('a');
      a.href = val;
      a.textContent = key;
      a.target = '_blank';
      valDiv.appendChild(a);
    } else {
      valDiv.textContent = val;
    }

    row.append(keyDiv, valDiv);
    container.appendChild(row);
  };

  function displayFilteredData() {
    incidentText.innerHTML = '';
    if (!parsedData || Object.keys(parsedData).length === 0) return;

    for (const [category, entries] of Object.entries(parsedData)) {
      const filteredEntries = Object.entries(entries).filter(([key]) => selectedKeys.has(key));
      if (filteredEntries.length === 0) continue;

      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'group-wrapper'; // Use this class in CSS

      const groupTitle = document.createElement('div');
      groupTitle.className = 'category-title';
      groupTitle.textContent = category;
      groupWrapper.appendChild(groupTitle);

      for (const [key, val] of filteredEntries) {
        groupWrapper.appendChild(createDataRow(key, val));
      }

      incidentText.appendChild(groupWrapper);
    }
  }

  function displayIncident(description) {
    // incidentText.textContent = description;
    // return null;
    const lines = description.split('\n').filter(Boolean);
    const dict = {};

    for (let i = 1; i < lines.length; i++) {
      const [key, ...rest] = lines[i].split(':');
      if (key && rest.length) {
        dict[key.trim()] = rest.join(':').trim();
      }
    }

    parsedData = organizeCategories(dict);

    selectedKeys = new Set();
    for (const category in parsedData) {
      for (const key in parsedData[category]) {
        selectedKeys.add(key);
      }
    }

    renderFilters(parsedData);
    displayFilteredData();
  }

  function fetchIncident() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;

      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          function findInc(root, active = { found: false, label: '' }) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            while (walker.nextNode()) {
              const el = walker.currentNode;

              if (
                !active.found &&
                el.tagName === 'DIV' &&
                el.classList.contains('chrome-tab-panel') &&
                el.classList.contains('is-active')
              ) {
                active.found = true;
                console.log('Active Tab Found:', active.found);
                continue;
              } else if (
                el.classList.contains('now-input-native') &&
                el.getAttribute('name') === 'number' &&
                el.getAttribute('value')?.startsWith('INC')
              ) {
                active.label = el.getAttribute('value');
                console.log('Active INC Found:', active.label);
                continue;
              } else if (
                active.found &&
                el.classList.contains('now-textarea-field-copy') &&
                el.hasAttribute('data-replicated-value')
              ) {
                console.log('Active INC Desc Found:', el.getAttribute('data-replicated-value'));
                return {
                    incident: active.label,
                    description: el.getAttribute('data-replicated-value')
                };
              }

              if (el.shadowRoot) {
                const result = findInc(el.shadowRoot, active);
                if (result) return result;
              }
            }
            return null;
          }

          return findInc(document) || { incident: 'Unknown', description: '' };
        }
      }, (results) => {
        const result = results?.[0]?.result;
        console.log('Result:', result);
        if (result) {
          incidentNumber.textContent = result.incident;
          displayIncident(result.description);
        } else {
          incidentNumber.textContent = 'Not found';
        }
      });
    });
  }


  refreshBtn.addEventListener('click', () => {
    desc.textContent = 'Page refreshed!';
    fetchIncident();
  });

  themeToggle.onclick = () => {
    const isDark = document.body.classList.toggle('dark');
    themeIcon.src = isDark ? 'icons/black.png' : 'icons/white.png';
  };

  window.onclick = () => {
    filterContainer.style.display = 'none';
  };

  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeIcon.src = isDark ? 'icons/black.png' : 'icons/white.png';

  themeToggle.onclick = () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeIcon.src = isDark ? 'icons/black.png' : 'icons/white.png';
  };

  filterBtn.onclick = (e) => {
    e.stopPropagation();
    const show = filterContainer.style.display !== 'block';
    filterContainer.style.display = show ? 'block' : 'none';
    if (show) {
      filterContainer.classList.add('fade-in');
    }
  };

  fetchIncident();
});
