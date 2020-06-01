var fullLog = "";
var ended = "";
var gameID = ""
var timer;
var timerPaused = true;

// import functions from storelog.js
var imported = document.createElement("script");
imported.src = "storelog.js";  
document.getElementsByTagName("head")[0].appendChild(imported);

chrome.runtime.onInstalled.addListener(function() {
	console.log('Background script is installed');
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
	chrome.declarativeContent.onPageChanged.addRules([{
		conditions: [new chrome.declarativeContent.PageStateMatcher({
			pageUrl: {hostEquals: 'dominion.games'},
		})],
		actions: [new chrome.declarativeContent.ShowPageAction()]
	}]);
	});
  
	console.log("starting timer after extension update/install");
	startTimer();
});

function startTimer(){
	if(timerPaused){
		console.log('Timer started');
		timer = setInterval(checkLog, 1000);
		timerPaused = false;
	}
}

chrome.webNavigation.onCompleted.addListener(function() {
  console.log("starting timer (webnavigation completed)");
  startTimer();
});

// start the script to run constantly. checkLog() will do anything on dominion.games
chrome.runtime.onStartup.addListener(function() {
  console.log("starting timer (webnavigation completed)");
  startTimer();
});

chrome.runtime.onConnect.addListener(connected);

// called, whenever getPagesSource.js is called to update the log and save the current progress
chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getLog") {
		// remove unnecessary code or code that will otherwise give errors later. saves space!
		var log = request.domLog.html;
		log = log.replace(/<!---->/g, "");
		log = log.replace(/(data-ng-animate|own|onmouse.+?|class|ng-(if|repeat|bind-html))=".+?"\s*/g,"");
		log = log.replace(/(cursor:\s*default;|user-select:\s*auto;)\s*/g,"")
		log = log.replace(/\s*style=""\s*>/g, ">");
		
		dominion_log = log;
		currentGameID = dominion_log.match(/#\d+/);
		if(currentGameID != null){
			currentGameID = currentGameID.toString();
			if(!(gameID === currentGameID)){
				
				fullLog = dominion_log;
				ended = request.domLog.timeout;
				gameID = currentGameID;
				console.log("New game started " + gameID);
				
				storeLogLocally(fullLog);
				
			}else if(fullLog.length < dominion_log.length){
				fullLog = dominion_log;
				ended = request.domLog.timeout;
				console.log("Log updated " + gameID);
				
				storeLogLocally(fullLog);
			}
		}else{
			console.log("no active game running");
		}
	}else if(request.action=="clearAllLogs"){
		console.log("clearing all Logs!");
		fullLog = "";
		ended = "";
		gameID = ""
	}

});

// called, when the popup is opened and will stop the interval timer
function connected(p) { //from https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/connect
	console.log("connected to "+p);
	
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
	clearInterval(timer);
	timerPaused = true;
	console.log('Timer paused');
}

// called, when the popup is closed and wil restart the interval timer again.
function disconnected(p) {
  console.log("backgroundscript disconnected from popup " + p);
  startTimer();
}


// extract the log information from dominion.games
function checkLog(){
	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
		try{
			let tab = tabs[0];
			let url = tab.url;
			if(url.match(".*/dominion.games/.*")){
                chrome.tabs.executeScript(tab.id, {
					 file: "getLogFromSource.js"
                }, null)
			}
		}catch(e){
			console.log("Error extracting log from dominion.games");
			console.log(e);
		}
    });
}