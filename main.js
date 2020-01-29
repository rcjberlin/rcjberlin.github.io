const tabs = [
    { tabTitle: "Line", heading: "Rescue Line" },
    { tabTitle: "Line Entry", heading: "Rescue Line Entry" },
    { tabTitle: "Maze", heading: "Rescue Maze" },
    { tabTitle: "Maze Entry", heading: "Rescue Maze Entry" },
];

const FREQUENCY_PROGRESS_UPDATE_IN_MS = 20;

const LS_TAB_ID = "current-tab-id";

let currentTabId = null;

let timeStartProgress = null;
let progressDuration = null;
let progressIntervalId = null;
let autoSwitchingTimeoutId = null;

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
};

let showTab = function (tabId) {
    document.getElementById("tab-"+tabId).classList.add("active");
    document.getElementById("box-"+tabId).classList.add("active");
    currentTabId = tabId;
    writeTabIdToLocalStorage(tabId);
};

let switchToNextTab = function () {
    if (currentTabId === null) {
        switchToTab(0);
    } else {
        switchToTab(currentTabId+1);
    }
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

let stopAutoSwitchingTabs = function () {
    clearAutoSwitchingTimeout();
    clearProgressInterval();
    clearProgressBar();
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
