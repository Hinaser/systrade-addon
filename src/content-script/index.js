window.addEventListener("message", function(event){
  if(event.source !== window){
    return;
  }
  
  if(event.data.type && event.data.type === "ARE_YOU_THERE"){
    event.source.postMessage({
      type: "YES_I_M_HERE",
    }, event.origin);
  }
}, false);

console.debug("================================\n" +
              "  SysTrade Addon is activated!  \n" +
              "================================");
