let urlLastUpdateTimes = "/evaluation/results/_lastUpdate.json";
let tabs = [
    { tabTitle: "Infos", heading: "Informationen", isTextTab: true, url: "./info.json" },
    { tabTitle: "Line", heading: "Rescue Line", url: "/evaluation/results/standingsLine.json", lastUpdateId: "line", columnsScore: [2,4,6,8], columnsTime: [3,5,7,9], qualifyingTeams: 7 },
    { tabTitle: "Line Entry", heading: "Rescue Line Entry", url: "/evaluation/results/standingsEntry.json", lastUpdateId: "lineEntry", columnsScore: [2,4,6,8], columnsTime: [3,5,7,9], qualifyingTeams: 4 },
    { tabTitle: "Maze", heading: "Rescue Maze", url: "/evaluation/results/standingsMaze.json", lastUpdateId: "maze", columnsScore: [2,4,6,8], columnsTime: [3,5,7,9], qualifyingTeams: 1 },
    { tabTitle: "Maze Entry", heading: "Rescue Maze Entry", url: "/evaluation/results/standingsMazeEntry.json", lastUpdateId: "mazeEntry", columnsScore: [2,4,6,8], columnsTime: [3,5,7,9], qualifyingTeams: 2 },
];

const FREQUENCY_PROGRESS_UPDATE_IN_MS = 20;
const TIME_RELOAD_DATA_IN_S = 60;

const LS_TAB_ID = "current-tab-id";

let currentTabId = null;

let lastUpdateTimes = {};
let lastUpdateOfLastUpdateTimes = null;

let timeStartProgress = null;
let progressDuration = null;
let progressIntervalId = null;
let autoSwitchingTimeoutId = null;
let switchToNextTabTimeoutId = null;

let getTime = function () {
	return (new Date).getTime() / 1000;
};

window.onload = function() {
    initTabs();
    switchToTab(readTabIdFromLocalStorage() || 0);
    //startAutoSwitchingTabs();
};

let initTabs = function () {
    let tabbar = document.getElementById("tabbar");
    let boxWrapper = document.getElementById("box-wrapper");
    
    let tab, box, heading;
    for (let i=0; i<tabs.length; i++) {
        tab = getTemplate("template-tab");
        tab.id = "tab-" + i;
        tab.innerText = tabs[i].tabTitle;
        tab.onclick = function () { switchToTab(i); };
        tabbar.appendChild(tab);

        box = getTemplate("template-box");
        box.id = "box-" + i;
        heading = box.querySelector("#heading");
        heading.id = "heading-" + i;
        heading.innerHTML = tabs[i].heading;
        table = box.querySelector("#table");
        table.id = "table-" + i;
        table.innerHTML = "";
        lastUpdateText = box.querySelector("#last-update");
        lastUpdateText.id = "last-update-" + i;
        lastUpdateText.innerHTML = "";
        if (tabs[i].isTextTab) {
            table.style.display = "none";
            lastUpdateText.style.display = "none";
        }
        boxWrapper.appendChild(box);
    }
};

let getTemplate = function (templateId) {
    let el = document.getElementById(templateId).cloneNode(true);
    el.removeAttribute("id");
    el.classList.remove("template");
    return el;
};

let switchToTab = function (tabId) {
    if (currentTabId !== null && currentTabId !== undefined) {
        hideTab(currentTabId);
    }
    currentTabId = tabId % tabs.length;
    showTab(currentTabId);
};

let hideTab = function (tabId) {
    document.getElementById("tab-"+tabId).classList.remove("active");
    document.getElementById("box-"+tabId).classList.remove("active");
    restartAutoSwitchingTabs();
};

let showTab = function (tabId) {
    document.getElementById("tab-"+tabId).classList.add("active");
    document.getElementById("box-"+tabId).classList.add("active");
    currentTabId = tabId;
    writeTabIdToLocalStorage(tabId);
    updateDataForTabIfChanged(tabId);
};

let switchToNextTab = function () {
    if (currentTabId === null) {
        switchToTab(0);
    } else {
        switchToTab(currentTabId+1);
    }
};

let updateDataForTabIfChanged = function (tabId) {
    if (tabs[tabId].isTextTab) {
        if (tabs[tabId].lastUpdated && tabs[tabId].lastUpdated + TIME_RELOAD_DATA_IN_S > getTime()) {
            // was updated just recently
            return;
        } else {
            updateTextTabData(tabId);
        }
    } else if (tabs[tabId].url) {
        if (!lastUpdateOfLastUpdateTimes) {
            // lastUpdateTimes are not yet fetched
            updateLastUpdateTimesAndUpdateTabIfNeeded(tabId);
        } else if (checkIfTabIsUpToDate(tabId)) {
            // tab is up-to-date according to lastUpdateTime-object -> check if this is up-to-date
            if (lastUpdateOfLastUpdateTimes + TIME_RELOAD_DATA_IN_S > getTime()) {
                // lastUpdateTime also up-to-date (was fetched just recently)
                return;
            } else {
                // lastUpdateTime should be updated
                updateLastUpdateTimesAndUpdateTabIfNeeded(tabId);
            }
        } else {
            // tab needs to be updated
            updateDataForTab(tabId);
        }
    } else {
        document.getElementById("last-update-"+tabId).innerText = "Fehlgeschlagen (keine Datenquelle hinterlegt)";
        switchToNextTabIfAutoSwitching();
    }
};

let updateLastUpdateTimesAndUpdateTabIfNeeded = function (tabId) {
    fetch(urlLastUpdateTimes)
    .then((response) => response.json())
    .then((json) => {
        lastUpdateOfLastUpdateTimes = getTime();
        for (let lastUpdateTimeId in json) {
            // copy values to local object (+ converting to seconds)
            lastUpdateTimes[lastUpdateTimeId] = json[lastUpdateTimeId] / 1000;
        }

        if (checkIfTabIsUpToDate(tabId)) {
            // tab is up-to-date
            return;
        } else {
            // tab needs to be updated
            updateDataForTab(tabId);
        }
    })
    .catch((error) => {
        console.log(error);
        document.getElementById("last-update-"+tabId).innerText = "Fehlgeschlagen";
    });
};

let updateDataForTab = function (tabId) {
    fetch(tabs[tabId].url)
    .then((response) => response.json())
    .then((json) => {
        tabs[tabId].data = json;
        tabs[tabId].sortedColumn = null;
        tabs[tabId].lastUpdated = lastUpdateTimes[tabs[tabId].lastUpdateId];
        showTable(tabId);
        document.getElementById("last-update-"+tabId).innerText = convertDateToString(tabs[tabId].lastUpdated);
    })
    .catch((error) => {
        console.log(error);
        document.getElementById("last-update-"+tabId).innerText = "Fehlgeschlagen";
        if (tabs[tabId].data === undefined) {
            // switch only if no data is there from previous tries (otherwise there will still be a table with data)
            switchToNextTabIfAutoSwitching();
        }
    });
};

let checkIfTabIsUpToDate = function (tabId) {
    // TODO: return false is just for direct reloading / testing - remove later!
    return false; //tabs[tabId].lastUpdated && tabs[tabId].lastUpdated === lastUpdateTimes[tabs[tabId].lastUpdateId];
};

let convertDateToString = function (unixTimestampInSeconds) {
    let date = new Date(unixTimestampInSeconds*1000);
    return "hh:mm:ss (DD.MM.YYYY)".replace("hh", pad(date.getHours()))
                                  .replace("mm", pad(date.getMinutes()))
                                  .replace("ss", pad(date.getSeconds()))
                                  .replace("DD", pad(date.getDate()))
                                  .replace("MM", pad(date.getMonth()+1))
                                  .replace("YYYY", pad(date.getFullYear(),4));
};

let pad = function (value, length, character) {
    if (length === undefined) { length = 2; }
    if (character === undefined) { character = 0; }
    value = String(value);
    return String(character).repeat(Math.max(0, length-value.length)) + value;
};

let updateTextTabData = function (tabId) {
    fetch(tabs[tabId].url)
    .then((response) => response.json())
    .then((json) => {
        tabs[tabId].lastUpdated = getTime();
        let box = document.getElementById("box-"+tabId), p;
        removeAllInfoTextsInTab(tabId);
        if (isFullscreen()) {
            // show url of this page in info tab if url-bar is not visible
            json.push(getInfoTextURL());
        }
        for (let element of json) {
            p = document.createElement("P");
            p.classList.add("info-text-"+tabId);
            p.innerHTML = element;
            box.appendChild(p);
        }
    })
    .catch((error) => {
        console.log(error);
        if (document.getElementsByClassName("info-text-"+tabId).length === 0) {
            // no data there -> not necessary to show tab any longer
            switchToNextTabIfAutoSwitching();
        }
    });
};

let removeAllInfoTextsInTab = function (tabId) {
    let elements = document.getElementsByClassName("info-text-"+tabId);
    while (elements.length > 0) {
        elements[0].remove();
    }
};

let isFullscreen = function () {
    if (window.fullScreen) {
        // supported by Firefox
        return true;
    }
    return false;
};

let getInfoTextURL = function () {
    let url = window.location.href;
    return `Diese Webseite ist unter <a href="${url}">${url}</a> verfügbar.`;
};

let showTable = function (tabId) {
    let table = document.getElementById("table-"+tabId);
    let data = tabs[tabId].data;
    table.innerHTML = "";
    for (let rowId=0; rowId<data.length; rowId++) {
        let dataRow = data[rowId];
        let tableRow = table.insertRow(-1);
        if (!isNaN(dataRow[0]) && Number(dataRow[0]) <= tabs[tabId].qualifyingTeams) {
            tableRow.classList.add("qualified");
        }
        for (let cellId=0; cellId<dataRow.length; cellId++) {
            let cell = dataRow[cellId];
            if (rowId === 0) {
                // ignore header
            } else if (tabs[tabId].columnsScore.includes(cellId)) {
                cell = castScoreForTable(cell);
            } else if (tabs[tabId].columnsTime.includes(cellId)) {
                cell = castTimeForTable(cell);
            }
            tableRow.insertCell(-1).innerText = String(cell);
        }
    }
    makeTableSortable(tabId);
};

let sortTable = function (tabId, column) {
    let reverse = false;
    if (tabs[tabId].sortedColumn === column) {
        reverse = true;
        tabs[tabId].sortedColumn = null;
    } else {
        tabs[tabId].sortedColumn = column;
    }
    tabs[tabId].data = [tabs[tabId].data[0]].concat(tabs[tabId].data.slice(1).sort(function (a,b) {
        if (a[column] === b[column]) {
            return 0;
        } else if (tabs[tabId].columnsTime.includes(column) ||
                    tabs[tabId].columnsScore.includes(column)) {
            return reverse ? b[column] - a[column] : a[column] - b[column];
        } else if (typeof(a[column]) === "string" && typeof(b[column]) === "string") {
            return (reverse ? -1 : 1) * a[column].toLowerCase().localeCompare(b[column].toLowerCase());
        } else {
            return reverse ^ (a[column] < b[column]);
        }
    }));
    showTable(tabId);
};

let makeTableSortable = function (tabId) {
    let table = document.getElementById("table-"+tabId);
    let th = table.rows[0];
    for (let i=0; i<th.cells.length; i++) {
        (function (i) {
            th.cells[i].addEventListener('click', function () {
                sortTable(tabId, i);
            });
        }(i));
    }
};

let castScoreForTable = function (score) {
    return score === null || score === undefined ? "-" : score;
};

let castTimeForTable = function (time) {
    if (time === null || time === undefined) {
        return "-:--";
    }
    let minutes = Math.floor(time/60);
    let seconds = Math.floor(time%60);
    seconds = (seconds < 10 ? "0" : "") + seconds;
    return minutes + ":" + seconds;
};

let switchToNextTabIfAutoSwitching = function () {
    if (autoSwitchingTimeoutId) {
        switchToNextTabTimeout();
    }
};

let switchToNextTabTimeout = function (durationInSeconds) {
    if (!durationInSeconds) { durationInSeconds = 2; }
    switchToNextTabTimeoutId = setTimeout(function () {
        switchToNextTab();
        restartAutoSwitchingTabs(true); // restart so that progress starts at 0%
    }, durationInSeconds*1000);
};

let clearSwitchToNextTabTimeout = function () {
    clearTimeout(switchToNextTabTimeoutId);
    switchToNextTabTimeoutId = null;
};

let readTabIdFromLocalStorage = function () {
    return localStorage.getItem(LS_TAB_ID);
};

let writeTabIdToLocalStorage = function (tabId) {
    localStorage.setItem(LS_TAB_ID, tabId);
};

let startAutoSwitchingTabs = function (durationInSeconds) {
    if (durationInSeconds === undefined) { durationInSeconds = 15; }
    stopAutoSwitchingTabs();
    switchTabAfterTimeoutAndRepeat(durationInSeconds);
};

let restartAutoSwitchingTabs = function (dontClearSwitchToNextTabTimeout) {
    if (autoSwitchingTimeoutId) {
        stopAutoSwitchingTabs(dontClearSwitchToNextTabTimeout);
        switchTabAfterTimeoutAndRepeat(progressDuration);
    }
};

let stopAutoSwitchingTabs = function (dontClearSwitchToNextTabTimeout) {
    if (dontClearSwitchToNextTabTimeout === undefined) { dontClearSwitchToNextTabTimeout = false; }
    clearAutoSwitchingTimeout();
    clearProgressInterval();
    clearProgressBar();
    if (!dontClearSwitchToNextTabTimeout) {
        clearSwitchToNextTabTimeout();
    }
};

let switchTabAfterTimeoutAndRepeat = function (durationInSeconds) {
    autoSwitchingTimeoutId = setTimeoutWithProgressBar(function () {
        switchToNextTab();
        switchTabAfterTimeoutAndRepeat(durationInSeconds);
    }, durationInSeconds);
};

let setTimeoutWithProgressBar = function (func, durationInSeconds) {
    timeStartProgress = getTime();
    progressDuration = durationInSeconds;
    setProgressInterval();
    return setTimeout(function () {
        clearProgressBar();
        func();
    }, durationInSeconds*1000);
};

let updateProgress = function () {
    let percentage = (getTime() - timeStartProgress) / progressDuration;
    document.getElementById("progressbar").style.width = Math.min(100, 100*percentage) + "%";
    if (percentage > 1) {
        clearProgressInterval();
    }
};

let setProgressInterval = function () {
    if (!progressIntervalId) {
        progressIntervalId = setInterval(updateProgress, FREQUENCY_PROGRESS_UPDATE_IN_MS);
    }
};

let clearProgressInterval = function () {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
};

let clearAutoSwitchingTimeout = function () {
    clearTimeout(autoSwitchingTimeoutId);
    autoSwitchingTimeoutId = null;
};

let clearProgressBar = function () {
    document.getElementById("progressbar").style.width = "0%";
};
