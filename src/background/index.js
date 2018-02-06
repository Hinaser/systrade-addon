const defaultApiServerUrls = ["*://*/*"];
let apiServerUrls = defaultApiServerUrls;

const defaultTargetUrls = [
  "^http[s]?://localhost(:[0-9]*)?(/.*|/?)$",
  "http[s]?://hinaser\.github\.io/systrade-web(/.*|/?)"
];
let targetUrls = defaultTargetUrls;

let targetTabIds = {};

const rewriteHeader = function(details) {
  let responseHeaders = details.responseHeaders;
  let tabId = details.tabId;
  
  // If the request was not issued from target tabs,
  // just pass through.
  if(!targetTabIds.hasOwnProperty(tabId)){
    return {responseHeaders};
  }
  
  responseHeaders = responseHeaders.filter(function(h){
    return ![
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-headers"
    ].includes(h.name.toLowerCase());
  });
  
  responseHeaders = responseHeaders.concat([
    {name: "Access-Control-Allow-Origin", value: "*"},
    {name: "Access-Control-Allow-Methods", value: "*"},
    {name: "Access-Control-Allow-Headers", value: "*"}
  ]);
  
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
  chrome.webRequest.onHeadersReceived.addListener(
    rewriteHeader,
    {urls: apiServerUrls},
    ["blocking", "responseHeaders"]
  );
  
  chrome.runtime.onMessageExternal.addListener(onMessageFromExternal);
};

const unload = function(){
  if(chrome.webRequest.onHeadersReceived.hasListener(rewriteHeader)){
    chrome.webRequest.onHeadersReceived.removeListener(rewriteHeader);
  }
  
  if(chrome.runtime.onMessageExternal.hasListener(onMessageFromExternal)){
    chrome.runtime.onMessageExternal.removeListener(onMessageFromExternal);
  }
};

const reload = function(){
  unload();
  load();
};

const isTargetTab = function(tab){
  return targetUrls.some(function(t){
    return new RegExp(t, "g").test(tab.url);
  });
};

const setActivePopup = (tabId) => {
  chrome.browserAction.setIcon({path: "../icon128_active.png"});
  chrome.browserAction.setPopup({popup: "../popup/active.html"});
  
  targetTabIds[tabId] = true;
};
const setInactivePopup = (tabId) => {
  chrome.browserAction.setIcon({path: "../icon128_inactive.png"});
  chrome.browserAction.setPopup({popup: "../popup/inactive.html"});
  
  delete targetTabIds[tabId];
};

let main = function(){
  reload();
  
  chrome.tabs.onActivated.addListener(function(activeInfo){
    chrome.tabs.get(activeInfo.tabId, function(tab){
      isTargetTab(tab) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
    });
  });
  
  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
    setInactivePopup(tabId);
  });
  
  chrome.webNavigation.onCommitted.addListener(function(details){
    if(details.frameId !== 0) return;
    
    let isTargetUrl = targetUrls.some(function(t){
      return new RegExp(t, "g").test(details.url);
    });
    
    isTargetUrl ? setActivePopup(details.tabId) : setInactivePopup(details.tabId);
  });
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    let tab = tabs[0];
    isTargetTab(tab) ? setActivePopup(tab.id) : setInactivePopup(tab.id);
  });
  
  chrome.tabs.query({}, function(tabs){
    tabs.filter(function(tab){
      return targetUrls.some(function(t){
        return new RegExp(t, "g").test(tab.url);
      });
    }).forEach(function(tab){
      chrome.tabs.executeScript(tab.id, {
        code: "window.postMessage({type: 'YES_I_M_HERE'}, window.location.toString());"
      });
    });
  })
};

main();
