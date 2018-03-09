function onMessageFromBackground(message, sender, sendResponse){
  if(message.type === "BACKGROUND_STATE"){
    window.postMessage({
      type: "YES_I_M_HERE",
      state: message.data,
    }, window.origin)
  }
}

chrome.runtime.onMessage.addListener(onMessageFromBackground);

window.addEventListener("message", function(event){
  if(event.source !== window || !event.data.type){
    return;
  }
  
  if(event.data.type === "ARE_YOU_THERE"){
    chrome.runtime.sendMessage({
      type: "INIT_STATE",
      data: event.data.data,
    });
  }
  else if(event.data.type === "SNAPSHOT"
    || event.data.type === "MARKET_SET_STATE"
    || event.data.type === "TRADER_SET_STATE")
  {
    chrome.runtime.sendMessage({
      type: event.data.type,
      data: event.data.data,
    });
  }
}, false);

console.debug("================================\n" +
              "  SysTrade Addon is activated!  \n" +
              "================================");
