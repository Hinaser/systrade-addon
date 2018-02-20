class Store {
  constructor(props){
    this.props = props || {};
    this.props.targetTabIds = this.props.targetTabIds || new Set();
    this.props.debug = this.props.debug || false;
    
    this.state = {};
  }
  
  updateProps(props){
    Object.keys(props).forEach(name => {
      this.props[name] = props[name];
    });
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
  
  loadState(){
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("state", value => {
        let state;
        try {
          state = value.state;
          state = JSON.parse(state);
        }
        catch (e) {
        }
        
        this.state = state;
        
        if(this.props.debug){
          console.debug("Load state from storage");
          console.debug(this.state);
        }
        
        resolve(state);
      });
    });
  }
  
  onMessageFromContentScript(message, sender, sendResponse) {
    if(this.props.debug){
      console.debug(message);
    }
  
    if(!sender || !sender.tab || !this.props.targetTabIds.has(sender.tab.id)){
      return;
    }
    
    if(message.type === "INIT_STATE"){
      const init_state = message.data;
  
      if(typeof(init_state||undefined) !== "object"
        || typeof(init_state.main||undefined) !== "object"
        || typeof(init_state.main.checkpoint||undefined) !== "object"
        || !init_state.main.checkpoint.hasOwnProperty("snapshot")){
        if(this.props.debug){
          console.debug("State from page is invalid:");
          console.debug(init_state);
        }
        return;
      }
      
      if(typeof(this.state||undefined) !== "object"
        || typeof(this.state.main||undefined) !== "object"
        || typeof(this.state.main.checkpoint||undefined) !== "object"
        || !this.state.main.checkpoint.hasOwnProperty("snapshot")
        || init_state.main.checkpoint.snapshot > this.state.main.checkpoint.snapshot){
        if(this.props.debug){
          console.debug("Looks like state in page is NEWER than that in addon. Adopting page state.");
          try{
            console.debug(`page#${init_state.main.checkpoint.snapshot}, addon#${this.state.main.checkpoint.snapshot}`);
            console.debug("Current addon state is:");
            console.debug(this.state);
          }
          catch(e){}
        }
        
        this.state = init_state;
        this.saveState();
      }
      else{
        if(this.props.debug) {
          console.debug("Looks like state in page is OLDER than addon. Page state is ignored.");
        }
      }
    }
    else if(message.type === "SNAPSHOT"){
      this.state = message.data;
    }
    else if(message.type === "MARKET_SET_STATE"){
      this.setState(message.data);
    }
    else if(message.type === "TRADER_SET_STATE"){
      this.setState(message.data);
    }
  }
  
  onTabClosed(tabId, removeInfo){
    if(this.props.targetTabIds.has(tabId)){
      if(this.props.debug){
        console.debug(`Tab#${tabId} is closing. The latest state is:`);
        console.debug(this.state);
      }
      
      this.saveState();
    }
  }
  
  saveState(){
    chrome.storage.local.set({state: JSON.stringify(this.state)});
  }
  
  startMonitor(){
    this.stopMonitor();
    chrome.runtime.onMessage.addListener(this.onMessageFromContentScript.bind(this));
    chrome.tabs.onRemoved.addListener(this.onTabClosed.bind(this));
  }
  
  stopMonitor(){
    const onMessage = chrome.runtime.onMessage;
    onMessage.hasListener(this.onMessageFromContentScript) &&
    onMessage.removeListener(this.onMessageFromContentScript);
    onMessage.hasListener(this.onTabClosed) &&
    onMessage.removeListener(this.onTabClosed);
  }
}