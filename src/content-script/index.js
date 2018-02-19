window.addEventListener("message", function(event){
  if(event.source !== window || !event.data.type){
    return;
  }
  
  if(event.data.type === "ARE_YOU_THERE"){
    chrome.runtime.sendMessage({
      type: "SNAPSHOT",
      data: event.data.data,
    });
    
    event.source.postMessage({
      type: "YES_I_M_HERE",
    }, event.origin);
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
