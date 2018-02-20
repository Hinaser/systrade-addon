const defaultValue = {
  targetRemoteUrls: ["*://*/*"],
  targetOriginUrls: [
    "^http[s]?://localhost(:[0-9]*)?(/.*|/?)$",
    "^http[s]?://hinaser\.github\.io/systrade-web(/.*|/?)"
  ],
  remoteUrlWhiteList: ["^http[s]?://.*\.bitflyer\.jp(/.*|/?)$"],
  remoteUrlBlackList: [],
};

let targetRemoteUrls = defaultValue.targetRemoteUrls;
let targetOriginUrls = defaultValue.targetOriginUrls;
let remoteUrlWhiteList = defaultValue.remoteUrlWhiteList;
let remoteUrlBlackList = defaultValue.remoteUrlBlackList;

let main = function(){
  const tabMonitor = new TabMonitor({
    targetOriginUrls,
  });
  
  const httpHandler = new HttpHandler({
    targetRemoteUrls,
  });
  
  const store = new Store();
  
  store.loadState()
    .then(state => {
      tabMonitor.onTabStateChange(targetTabIds => {
        httpHandler.updateProps({targetTabIds});
        store.updateProps({targetTabIds});
      });
    
      httpHandler.startMonitor();
      store.startMonitor();
      tabMonitor.startMonitor();
      tabMonitor.wakeThemUp(state);
    })
    .catch(err => {
      console.error(err);
    });
};

main();

