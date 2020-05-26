var fullLog = "";
var ended = "";
var gameID = ""
var timer;
chrome.runtime.onInstalled.addListener(function() {
  console.log('Background script is running');
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'dominion.games'},
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
  

});

chrome.runtime.onStartup.addListener(function() {
  console.log('open');
  timer = setInterval(checkLog, 1000);
})

chrome.runtime.onConnect.addListener(connected);

// called, whenever getPagesSource.js is called to update the log and save the current progress
chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getLog") {

		dominion_log = request.domLog.html;
		currentGameID = dominion_log.match(/#\d+/);
		if(currentGameID != null){
			currentGameID = currentGameID.toString();
			if(!(gameID === currentGameID)){
				
				fullLog = dominion_log;
				ended = request.domLog.timeout;
				gameID = currentGameID;
				console.log("New game started " + gameID);
				var game = {};
				game[gameID] = fullLog;
				chrome.storage.local.set(game, function() {
					console.log('Log saved locally');
				});
			}else if(fullLog.length < dominion_log.length){
				fullLog = dominion_log;
				ended = request.domLog.timeout;
				console.log("Log updated " + gameID);
				var game = {};
				game[gameID] = fullLog;
				chrome.storage.local.set(game, function() {
					console.log('Log saved locally');
				});
			}
		}else{
			console.log("no active game running");
		}
	}

});

// called, when the popup is opened and will stop the interval timer
function connected(p) { //from https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/connect
	console.log("connected to "+p);
	
	chrome.storage.local.get(null, function(items) {
		var allKeys = Object.keys(items);
		console.log(allKeys);
	});
	
	p.onMessage.addListener(function(m) {
		console.log("In background script, received message from content script")
		console.log(m.request);
		if(m.request === "getFullLog"){
			checkLog();
			setTimeout(function(){p.postMessage({log: fullLog, timeout: ended }); }, 200);
		}
		if(m.request === "deleteLog"){
			console.log("delete received of game " + m.gameID);
			if(m.gameID === gameID){
				
				gameID = "";
				fullLog = "";
			}
		}
		
		
		
	});
	
	p.onDisconnect.addListener(disconnected);
	clearInterval(timer)
}

// called, when the popup is closed and wil restart the interval timer again.
function disconnected(p) {
	console.log("disconnected from "+p);
	timer = setInterval(checkLog, 1000);
}



function checkLog(){
	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
		try{
			let tab = tabs[0];
			let url = tab.url;
			if(url.match(".*/dominion.games/.*")){
                chrome.tabs.executeScript(tab.id, {
					 file: "getPagesSource.js"
                }, null)
			}else{
			
			}
		}catch(e){
			//console.log("Some error that you can ignore "+e.toString());
		}
    });
}