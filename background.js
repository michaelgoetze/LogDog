
//information about the currently played game
var uuid = ""
var fullLog = "";
var gameStatus = "";
var gameID = ""
var kingdom = "";
var VPs = "";
var turn = 0;
var timer;
var timerPaused = true;

/**
 * import functions from storelog.js
 */
var imported = document.createElement("script");
imported.src = "storelog.js";  
document.getElementsByTagName("head")[0].appendChild(imported);

/**
 * Timer that frequently checks whether the log has changed frequency is every second
 */
function startTimer(){
	if(timerPaused){
		console.log('Timer started');
		timer = setInterval(checkLog, 1000);
		timerPaused = false;
	}
}

/**
 * start the script to run constantly. checkLog() will only run on dominion.games
 */
chrome.runtime.onInstalled.addListener(function() {
	console.log("starting timer after extension update/install");
	startTimer();
});

chrome.runtime.onStartup.addListener(function() {
  console.log("starting timer (chrome started)");
  startTimer();
});

chrome.tabs.onUpdated.addListener(function() {
  console.log("starting timer (tabs updated)");
  startTimer();
});

/**
 * called, whenever getPagesSource.js is called to update the log and save the current progress
 */
chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "getLog") {
		// remove unnecessary code or code that will otherwise give errors later. saves space!
		let log = request.domLog.html;
		log = log.replace(/<!---->/g, "");
		log = log.replace(/(data-ng-animate|own|onmouse.+?|class|ng-(if|repeat|bind-html))=".+?"\s*/g,"");
		log = log.replace(/(cursor:\s*default;|user-select:\s*auto;)\s*/g,"")
		log = log.replace(/\s*style=""\s*>/g, ">");
		log = log.replace(/\s+/g," ");
		log = log.replace(/\n/g," ");
		dominion_log = log;
		currentGameID = dominion_log.match(/#\d+/);
		let regexp = /(?:Turn|Zug|Tour|Ход) (\d+)(?![\s\S]*(?:Turn|Zug|Tour|Ход))/;
		try{
			let currentTurn = parseInt(regexp.exec(dominion_log)[1]);
		}catch(e){currentTurn = -1}
		
		gameStatus = request.domLog.gameStatus;
		if(currentGameID != null){
			currentGameID = currentGameID.toString();
			//Store the game, if it wasn't stored before.
			if(!(gameID === currentGameID)){
				
				uuid = getDateUUID();
				console.log("New game started ", gameID, uuid);
				fullLog = dominion_log;
				kingdom = request.domLog.kingdom;
				VPs = request.domLog.VPs;
				gameID = currentGameID;
				
				
				storeLogLocally(fullLog, uuid, gameStatus = gameStatus, VPs = VPs, kingdom = kingdom);
			//Store the game upon a change ?? //fullLog.length < dominion_log.length
			// Rather save game after every turn. or at every decision after game ended button popped up. 
			}else if(currentTurn > turn || (gameStatus != "" && fullLog.length < dominion_log.length)) {
				turn = currentTurn
				fullLog = dominion_log;
				kingdom = request.domLog.kingdom;	
				VPs = request.domLog.VPs;			
				storeLogLocally(fullLog, uuid, gameStatus = gameStatus, VPs = VPs, kingdom = kingdom);
			}
		}else{
			console.log("no active game running");
		}
	}else if(request.action == "clearAllLogs"){
		console.log("clearing all Logs!");
		fullLog = "";
		gameStatus = "";
		gameID = ""
		kingdom = "";
		VPs = "";
	}
});

/**
 * called, when the popup is opened and will stop the interval timer
 */
function connected(p) { //from https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/connect
	console.log("connected to ",p);
	
	p.onMessage.addListener(function(m) {
		if(m.request === "getFullLog"){
			checkLog();
			setTimeout(function(){p.postMessage({log: fullLog, uuid: uuid, gameStatus: gameStatus, kingdom: kingdom }); }, 200);
		}
		if(m.request === "deleteLog"){
			console.log("delete received of game " + m.gameID);
			if(m.uuid === uuid){
				
				uuid = ""
				kingdom = "";
				VPs = "";
				gameStatus = "";
				gameID = "";
				fullLog = "";
				turn = 0;
			}
		}
	});
	
	p.onDisconnect.addListener(disconnected);
	clearInterval(timer);
	timerPaused = true;
	console.log('Timer paused');
}
chrome.runtime.onConnect.addListener(connected);

/**
 * called, when the popup is closed and wil restart the interval timer again.
 */
function disconnected(p) {
  console.log("backgroundscript disconnected from popup ", p);
  startTimer();
}

/**
 * extract the log information from dominion.games
 */
function checkLog(){
	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
		try{
			let tab = tabs[0];
			let url = tab.url;
			if(url.match(".*/dominion.games/.*")){
				
				//enable the LogDog icon
				chrome.pageAction.show(tab.id);
                chrome.tabs.sendMessage(tab.id, {
					action: "getLogFromContent"
				});
			}else{
				chrome.pageAction.hide(tab.id);
			}
		}catch(e){}
    });
}