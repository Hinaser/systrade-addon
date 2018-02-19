class TabMonitor {
  constructor(props){
    this.props = props || {};
    this.props.listeners = this.props.listeners || [];
    this.props.targetOriginUrls = this.props.targetOriginUrls || [];
    
    this.state = {
      targetTabIds: new Set(),
    };
  }
  
  updateProps(props){
    Object.keys(props).forEach(name => {
      this.props[name] = props[name];
    });
  }
  
  onTabStateChange(callback){
    this.props.listeners.push(callback);
  }
  
  isTargetTab(url){
    return this.props.targetOriginUrls.some(function(t){
      return new RegExp(t, "g").test(url);
    });
  };
  
  activateTab(tabId){
    chrome.browserAction.setIcon({path: "../icon128_active.png"});
    chrome.browserAction.setPopup({popup: "../popup/active.html"});
    
    this.state.targetTabIds.add(tabId);
    this.props.listeners.forEach(cb => cb(this.state.targetTabIds))
  }
  
  deactivateTab(tabId){
    chrome.browserAction.setIcon({path: "../icon128_inactive.png"});
    chrome.browserAction.setPopup({popup: "../popup/inactive.html"});
  
    this.state.targetTabIds.delete(tabId);
    this.props.listeners.forEach(cb => cb(this.state.targetTabIds))
  }
  
  startMonitor(){
    const that = this;
    
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
      that.deactivateTab(tabId);
    });
  
    chrome.tabs.onActivated.addListener(function(activeInfo){
      chrome.tabs.get(activeInfo.tabId, function(tab){
        if(tab && tab.url){
          that.isTargetTab(tab.url) ? that.activateTab(tab.id) : that.deactivateTab(tab.id);
        }
      });
    });
  
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
      if(tab.url && tab.active){
        that.isTargetTab(tab.url) ? that.activateTab(tab.id) : that.deactivateTab(tab.id);
      }
    });
  
    chrome.webNavigation.onCommitted.addListener(function(details){
      if(details.frameId !== 0) return;
  
      that.isTargetTab(details.url) ? that.activateTab(details.tabId) : that.deactivateTab(details.tabId);
    });
  
    chrome.tabs.query({active: false}, function(tabs){
      tabs.forEach(tab => {
        that.isTargetTab(tab.url) ? that.activateTab(tab.id) : that.deactivateTab(tab.id);
      });
    });
  
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
      let tab = tabs[0];
      that.isTargetTab(tab.url) ? that.activateTab(tab.id) : that.deactivateTab(tab.id);
    });
  }
  
  wakeThemUp(){
    const that = this;
    
    chrome.tabs.query({}, function(tabs){
      tabs.forEach(function(tab){
        if(that.isTargetTab(tab.url)){
          chrome.tabs.executeScript(tab.id, {
            code: "window.postMessage({type: 'YES_I_M_HERE'}, window.location.toString());"
          });
        }
      });
    })
  }
}