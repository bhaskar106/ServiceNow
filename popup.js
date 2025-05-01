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
    const body = document.body;

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
    let refreshCount = 0; // Initialize refresh counter

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

    function formatKey(key) {
        return key.split('_').map(word => {
            if (word.length <= 3) {
                return word.toUpperCase();
            } else {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
        }).join(' ');
    }

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
                    if (cb) {
                        cb.checked = groupCheckbox.checked;
                    }
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

            const selectAllBtn = document.createElement('button');
            selectAllBtn.textContent = 'Select All';
            selectAllBtn.addEventListener('click', () => {
                Object.keys(fields).forEach(key => {
                    selectedKeys.add(key);
                    const cb = document.getElementById(`chk-${key}`);
                    if (cb) cb.checked = true;
                });
                groupCheckbox.checked = true;
                groupCheckbox.indeterminate = false;
                displayFilteredData();
            });
            header.appendChild(selectAllBtn);

            const deselectAllBtn = document.createElement('button');
            deselectAllBtn.textContent = 'Deselect All';
            deselectAllBtn.addEventListener('click', () => {
                Object.keys(fields).forEach(key => {
                    selectedKeys.delete(key);
                    const cb = document.getElementById(`chk-${key}`);
                    if (cb) cb.checked = false;
                });
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = false;
                displayFilteredData();
            });
            header.appendChild(deselectAllBtn);

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
                    if (groupCb) {
                        groupCb.checked = allSelected;
                        groupCb.indeterminate = !allSelected && !noneSelected;
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
        keyDiv.textContent = `${formatKey(key)}:`; // Use the formatKey function

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

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(val).then(() => {
                console.log('Copied to clipboard:', val);
                // Optional: Provide visual feedback
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        });
        row.appendChild(copyBtn);

        row.append(keyDiv, valDiv);
        return row;
    }

    function displayFilteredData() {
        incidentText.innerHTML = '';
        miscSection.innerHTML = '';

        if (!parsedData || Object.keys(parsedData).length === 0) return;

        const renderCategory = (categoryName, entries, container) => {
            if (entries.length === 0 && categoryName !== "Miscellaneous / Other") return;

            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'group-wrapper';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'category-title';
            groupTitle.innerHTML = `<span>${categoryName}</span> <button class="copy-btn" title="Copy All"><i class="fas fa-clipboard-list"></i></button>`;
            const titleSpan = groupTitle.querySelector('span');
            const copyGroupBtn = groupTitle.querySelector('.copy-btn');

            titleSpan.addEventListener('click', () => {
                const content = groupWrapper.querySelector('.collapsed-content');
                if (content) {
                    content.classList.toggle('collapsed');
                    // Toggle icon if you decide to add one later
                }
            });

            copyGroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let textToCopy = `${categoryName}:\n`;
                entries.forEach(([key, val]) => {
                    if (selectedKeys.has(key)) {
                        textToCopy += `${formatKey(key)}: ${val}\n`;
                    }
                });
                navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                    console.log(`Copied group "${categoryName}"`);
                    // Optional: Provide visual feedback
                }).catch(err => {
                    console.error(`Failed to copy group "${categoryName}":`, err);
                });
            });

            groupWrapper.appendChild(groupTitle);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'collapsed-content';

            for (const [key, val] of entries) {
                if (selectedKeys.has(key)) {
                    contentDiv.appendChild(createDataRow(key, val));
                }
            }
            groupWrapper.appendChild(contentDiv);
            container.appendChild(groupWrapper);
        };

        for (const [category, entries] of Object.entries(parsedData)) {
            const filteredEntries = Object.entries(entries).filter(([key]) => selectedKeys.has(key));
            if (category !== "Miscellaneous / Other") {
                renderCategory(category, filteredEntries, incidentText);
            } else {
                renderCategory(category, filteredEntries, miscSection);
            }
        }
    }

    function displayIncident(description) {
        const lines = description.split('\n').filter(Boolean);
        const dict = {};

        for (let i = 1; i < lines.length; i++) {
            const [key, ...rest] = lines[i].split(':');
            if (key && rest.length) {
                dict[key.trim()] = rest.join(':').trim();
            }
        }

        parsedData = organizeCategories(dict);

        selectedKeys = new Set(Object.values(parsedData).flat().map(obj => Object.keys(obj)).flat());

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
                                console.log('Content Script: Active Tab Panel Found');
                                continue;
                            } else if (
                                el.classList.contains('now-input-native') &&
                                (el.getAttribute('value')?.startsWith('INC') || el.getAttribute('value')?.startsWith('CS')) &&
                                el.getAttribute('name') === 'number'
                            ) {
                                active.label = el.getAttribute('value');
                                console.log('Content Script: Incident Number Found:', active.label);
                                continue;
                            } else if (
                                active.found &&
                                el.classList.contains('now-textarea-field-copy') &&
                                el.hasAttribute('data-replicated-value')
                            ) {
                                const description = el.getAttribute('data-replicated-value');
                                console.log('Content Script: Description Found:', description);
                                return {
                                    incident: active.label,
                                    description: description
                                };
                            }

                            if (el.shadowRoot) {
                                const result = findInc(el.shadowRoot, active);
                                if (result) return result;
                            }
                        }
                        console.log('Content Script: Incident Details Not Found in this frame.');
                        return null;
                    }

                    console.log('Content Script: Starting findInc in document.');
                    const result = findInc(document) || { incident: 'Unknown', description: '' };
                    console.log('Content Script: findInc Result:', result);
                    return result;
                }
            }, (results) => {
                const result = results?.[0]?.result;
                console.log('Popup Script: Received Result:', result);
                if (result && result.incident !== 'Unknown') {
                    incidentNumber.textContent = result.incident;
                    displayIncident(result.description);
                } else {
                    incidentNumber.textContent = 'Not found';
                    desc.textContent = 'Could not retrieve incident details.';
                    parsedData = {};
                    renderFilters({});
                }
            });
        });
    }

    const refreshMessageSpan = document.createElement('span');
    refreshMessageSpan.style.color = 'red';
    refreshMessageSpan.style.marginLeft = '10px';

    refreshBtn.addEventListener('click', () => {
        refreshCount++; // Increment the counter
        refreshMessageSpan.textContent = `Page Refreshed! (${refreshCount})`;
        incidentNumber.parentNode.insertBefore(refreshMessageSpan, incidentNumber.nextSibling);
        fetchIncident();

        // Remove the message after a short delay (optional)
        setTimeout(() => {
            refreshMessageSpan.textContent = '';
        }, 2000); // Remove after 2 seconds
    });

    const setTheme = (theme) => {
        body.classList.toggle('dark', theme === 'dark');
        // themeIcon.src = theme === 'dark' ? 'icons/black.png' : 'icons/white.png';
        localStorage.setItem('theme', theme);
    };

    const storedTheme = localStorage.getItem('theme');
    if (!storedTheme) { // Set default to dark if no theme is stored
        setTheme('dark');
    } else {
        setTheme(storedTheme);
    }

    themeToggle.addEventListener('click', () => {
        setTheme(body.classList.contains('dark') ? 'light' : 'dark');
    });

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterContainer.style.display = filterContainer.style.display === 'block' ? 'none' : 'block';
        if (filterContainer.style.display === 'block') {
            filterContainer.classList.add('fade-in');
        }
    });

    document.addEventListener('click', (e) => {
        if (filterContainer.style.display === 'block' && !filterContainer.contains(e.target) && e.target !== filterBtn) {
            filterContainer.style.display = 'none';
        }
    });

    fetchIncident();
});
