document.querySelectorAll("[data-text]").forEach((el)=>{
  let msgId = el.getAttribute("data-text");
  el.textContent = chrome.i18n.getMessage(msgId);
});
