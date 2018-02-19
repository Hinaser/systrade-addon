class HttpHandler {
  constructor(props){
    this.props = props || {};
    this.props.targetRemoteUrls = this.props.targetRemoteUrls || [];
    this.props.targetTabIds = this.props.targetTabIds || new Set();
    
    this.state = {requestIds: {}};
  }
  
  updateProps(props){
    Object.keys(props).forEach(name => {
      this.props[name] = props[name];
    });
  }
  
  startMonitor(){
    this.stopMonitor();
    
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleRequest.bind(this),
      {urls: this.props.targetRemoteUrls},
      ["blocking", "requestHeaders"]
    );
  
    chrome.webRequest.onHeadersReceived.addListener(
      this.handleResponse.bind(this),
      {urls: this.props.targetRemoteUrls},
      ["blocking", "responseHeaders"]
    );
  }
  
  stopMonitor(){
    const onBeforeSendHeaders = chrome.webRequest.onBeforeSendHeaders;
    onBeforeSendHeaders.hasListener(this.handleRequest) &&
    onBeforeSendHeaders.removeListener(this.handleRequest);
  
    const onHeadersReceived = chrome.webRequest.onHeadersReceived;
    onHeadersReceived.hasListener(this.handleResponse) &&
    onHeadersReceived.removeListener(this.handleResponse);
  }
  
  handleRequest(details){
    let tabId = details.tabId;
    if(!this.props.targetTabIds.has(tabId)){
      return;
    }
  
    const requestHeaders = details.requestHeaders.find(h => h.name.toLowerCase() === "access-control-request-headers");
    if(requestHeaders){
      this.state.requestIds[details.requestId] = requestHeaders.value
    }
  }
  
  handleResponse(details){
    let responseHeaders = details.responseHeaders;
    let tabId = details.tabId;
  
    // If the request was not issued from target tabs,
    // just pass through.
    if(!this.props.targetTabIds.has(tabId)){
      return {responseHeaders};
    }
  
    let allowOrigin = {name: "Access-Control-Allow-Origin", value: "*"};
    let allowMethods = {name: "Access-Control-Allow-Methods", value: "GET, PATCH, PUT, POST, DELETE, HEAD, OPTIONS"};
    let allowHeaders = {name: "Access-Control-Allow-Headers", value: "*"};
  
    if(this.state.requestIds.hasOwnProperty(details.requestId)){
      allowHeaders.value = this.state.requestIds[details.requestId] || "*";
      delete this.state.requestIds[details.requestId];
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
  }
}