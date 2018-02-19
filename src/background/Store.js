class Store {
  constructor(){
    this.state = {};
    this.i=0;
  }
  
  setState(nextState){
    if(typeof(nextState) !== "object"){
      return null;
    }
    
    // Recursively set proposed value
    const updateState = (src, dst, key) => {
      if(!src.hasOwnProperty(key) || !dst.hasOwnProperty(key)){
        return this.state;
      }
      
      if(typeof(src[key]) === "object" && !Array.isArray(src[key])){
        Object.keys(src[key]).forEach(key2 => {
          updateState(src[key], dst[key], key2);
        });
      }
      else{
        dst[key] = src[key];
      }
    };
    
    Object.keys(nextState).forEach(key => {
      updateState(nextState, this.state, key);
    });
  }
  
  onMessageFromContentScript(message, sender, sendResponse) {
    if(message.type === "SNAPSHOT"){
      this.state = message.data;
    }
    else if(message.type === "MARKET_SET_STATE"){
      this.setState(message.data);
    }
    else if(message.type === "TRADER_SET_STATE"){
      this.setState(message.data);
    }
  
    this.i++;
  };
  
  startMonitor(){
    chrome.runtime.onMessage.addListener(this.onMessageFromContentScript.bind(this));
  }
  
  stopMonitor(){
    const onMessage = chrome.runtime.onMessage;
    onMessage.hasListener(this.onMessageFromContentScript) &&
    onMessage.removeListener(this.onMessageFromContentScript);
  }
}