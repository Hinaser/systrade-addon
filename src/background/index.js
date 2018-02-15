const defaultValue = {
  urlsToRewriteHeader: ["*://*/*"],
  pageUrlsToActivateAddon: [
    "^http[s]?://localhost(:[0-9]*)?(/.*|/?)$",
    "^http[s]?://hinaser\.github\.io/systrade-web(/.*|/?)"
  ],
  remoteUrlWhiteList: ["^http[s]?://.*\.bitflyer\.jp(/.*|/?)$"],
  remoteUrlBlackList: [],
};

let urlsToRewriteHeader = defaultValue.urlsToRewriteHeader;
let pageUrlsToActivateAddon = defaultValue.pageUrlsToActivateAddon;

let remoteUrlWhiteList = defaultValue.remoteUrlWhiteList;
let remoteUrlBlackList = defaultValue.remoteUrlBlackList;

let activatedTabIds = new Set();
let requestIdsMonitored = {}; // I once considered to use `new Map()` but turned it down as it is too slow.

const captureRequestingHeader = function(details){
  let tabId = details.tabId;
  if(!activatedTabIds.has(tabId)){
    return;
  }
  
  const requestHeaders = details.requestHeaders.find(h => h.name.toLowerCase() === "access-control-request-headers");
  if(requestHeaders){
    requestIdsMonitored[details.requestId] = requestHeaders.value
  }
};

const rewriteResponseHeader = function(details) {
  let responseHeaders = details.responseHeaders;
  let tabId = details.tabId;
  
  // If the request was not issued from target tabs,
  // just pass through.
  if(!activatedTabIds.has(tabId)){
    return {responseHeaders};
  }
  
  let allowOrigin = {name: "Access-Control-Allow-Origin", value: "*"};
  let allowMethods = {name: "Access-Control-Allow-Methods", value: "GET, PATCH, PUT, POST, DELETE, HEAD, OPTIONS"};
  let allowHeaders = {name: "Access-Control-Allow-Headers", value: "*"};
  
  if(requestIdsMonitored.hasOwnProperty(details.requestId)){
    allowHeaders.value = requestIdsMonitored[details.requestId] || "*";
    delete requestIdsMonitored[details.requestId];
  }
  else{
    allowHeaders = null;
  }
  
  responseHeaders = responseHeaders.filter(function(h){
    return ![
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-headers"
    ].includes(h.name.toLowerCase());
  });
  
  allowOrigin && responseHeaders.push(allowOrigin);
  allowMethods && responseHeaders.push(allowMethods);
  allowHeaders && responseHeaders.push(allowHeaders);
  
  return {responseHeaders};
};

const onMessageFromExternal = function(message, sender, sendResponse) {
  if(message.type === "ARE_YOU_THERE?"){
    sendResponse({
      type: "YES_I_M_HERE"
    });
  }
};

const load = function(){
  chrome.webRequest.onBeforeSendHeaders.addListener(
    captureRequestingHeader,
    {urls: urlsToRewriteHeader},
    ["blocking", "requestHeaders"]
  );
  
  chrome.webRequest.onHeadersReceived.addListener(
    rewriteResponseHeader,
    {urls: urlsToRewriteHeader},
    ["blocking", "responseHeaders"]
  );
  
  chrome.runtime.onMessageExternal.addListener(onMessageFromExternal);
};

const unload = function(){
  const onBeforeSendHeaders = chrome.webRequest.onBeforeSendHeaders;
  onBeforeSendHeaders.hasListener(captureRequestingHeader) &&
  onBeforeSendHeaders.removeListener(captureRequestingHeader);
  
  const onHeadersReceived = chrome.webRequest.onHeadersReceived;
  onHeadersReceived.hasListener(rewriteResponseHeader) &&
  onHeadersReceived.removeListener(rewriteResponseHeader);
  
  const onMessageExternal = chrome.runtime.onMessageExternal;
  onMessageExternal.hasListener(onMessageFromExternal) &&
  onMessageExternal.removeListener(onMessageFromExternal);
};

const reload = function(){
  unload();
  load();
};

const isTargetTab = function(url){
  return pageUrlsToActivateAddon.some(function(t){
    return new RegExp(t, "g").test(url);
  });
};

const setActivePopup = (tabId) => {
  chrome.browserAction.setIcon({path: "../icon128_active.png"});
  chrome.browserAction.setPopup({popup: "../popup/active.html"});
  
  activatedTabIds.add(tabId);
};
const setInactivePopup = (tabId) => {
  chrome.browserAction.setIcon({path: "../icon128_inactive.png"});
  chrome.browserAction.setPopup({popup: "../popup/inactive.html"});
  
  activatedTabIds.delete(tabId);
};

const init = () => {
  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
    setInactivePopup(tabId);
  });
  
  chrome.tabs.onActivated.addListener(function(activeInfo){
    chrome.tabs.get(activeInfo.tabId, function(tab){
      if(tab && tab.url){
        isTargetTab(tab.url) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
      }
    });
  });
  
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if(tab.url){
      isTargetTab(tab.url) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
    }
  });
  
  chrome.webNavigation.onCommitted.addListener(function(details){
    if(details.frameId !== 0) return;
    
    isTargetTab(details.url) ? setActivePopup(details.tabId) : setInactivePopup(details.tabId);
  });
  
  chrome.tabs.query({active: false}, function(tabs){
    tabs.forEach(tab => {
      isTargetTab(tab.url) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
    });
  });
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    let tab = tabs[0];
    isTargetTab(tab.url) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
  });
};

const wakeThemUp = () => {
  chrome.tabs.query({}, function(tabs){
    tabs.forEach(function(tab){
      if(isTargetTab(tab.url)){
        chrome.tabs.executeScript(tab.id, {
          code: "window.postMessage({type: 'YES_I_M_HERE'}, window.location.toString());"
        });
      }
    });
  })
};

let main = function(){
  reload();
  init();
  wakeThemUp();
};

main();