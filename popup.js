// import functions from storelog.js
var imported = document.createElement("script");
imported.src = "storelog.js";  
document.getElementsByTagName("head")[0].appendChild(imported);

// Port that is opened to the background script.
var myPort

/**
 * Downloads a single log as plain text to the download folder.
 */
async function saveData(gameID) {
	try{
		// Load the current game based on its gameID
		var game = await loadStoredGameByGameID(gameID);
		
		// Prepare log for saving and create fileName
		message.innerHTML = game.log;
		var log = message.innerText;
		var date = game.date.replace(/\//g, "");
		var fileName = ["LogDog",date,game.players[0],game.players[1],gameID+".txt"].join("_"); 
		
		// parse game object to json
		var json = JSON.stringify(log),
			blob = new Blob([log], {type: "text/plain;charset=utf-8"}),
			url = window.URL.createObjectURL(blob);
		
		// Save as file to download folder
		chrome.downloads.download({
			url: url,
			filename: fileName
		});
	}catch(e){
		console.log("nothing to save ");
		console.log(e);
	}
}

/**
 * Function that copies the currently viewed log to the clipboard
 */
function copyTextToClipboard(text) {
	if(text.length > 10){
		//create an empty textArea to put in the text
		var textArea = document.createElement("textarea");

		// Position and style the textArea for minimal interference
		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;
		textArea.style.width = '2em';
		textArea.style.height = '2em';
		textArea.style.padding = 0;
		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';
		textArea.style.background = 'transparent';

		// set the text to copy as the textArea value
		textArea.value = text;
		
		// add the textarea to the body 
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		// copy the content of the textArea to the clipboard
		try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'Successful' : ' Not Successful';
			console.log('Copying text command was ' + msg);
		} catch (e) {
			console.log('Unable to copy to clipboard');
			console.log(e);
		}
		
		// remove the textArea again.
		document.body.removeChild(textArea);
	}
}

/**
 * funcrion that deletes the selected log from local storage. Cannot be undone
 */
function deleteSelectedLog(){
	if(previousGames.options.length>0){
		var delUUID = previousGames.options[previousGames.selectedIndex].value.split(",")[1];
		console.log(delUUID);
		// delete the selected game from the storage and inform the background script to delete temporary data, if it is the last/current game that was deleted
		chrome.storage.local.remove(delUUID, function(){
			myPort.postMessage({request: "deleteLog", uuid: delUUID});
			chrome.storage.local.get(null, fillPreviousMatches);
		});
	}
}


/**
 * Load the last log that is in the selection box.
 */
async function loadLastLog(){
	
	if(previousGames.options.length>0){
		var lastGameID = previousGames.options[0].value.split(",")[0];
		if(/#\d+/.test(lastGameID)){
			var game = await loadStoredGameByGameID(lastGameID);
			message.innerHTML = game.log;
			return;
		}
	}
	console.log("no Log available");
	message.innerHTML = "no Log available &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
}


/**
 * Fill the previous game selection box with all games that passed the filter.
 *  games - array of objects representing games (can be a filtered list already)
 *  filteredBy - If the list was filtered, this variable indicates, which filters 
 *               were applied
 */
async function fillPreviousMatches(games, filteredBy=["any","any"]) {
	
	// get all game ids from the array of games
	var allUUIDs = Object.keys(games);
	
	var allGameIDs = [];
	for(uuid of allUUIDs){
		if (checkUUID(uuid)){
			allGameIDs.push(games[uuid].gameID);
		}else{
			//For compatibility with older logs (before v0.0.7)
			if(uuid.match(/#\d+/) != null){
				// uuid is actually a gameID in the previous version
				// create a new uuid
				var oldGame = games[uuid];
				var dateArray = oldGame.date.split("/");
				var date = dateArray[2].substring(2)+dateArray[1]+dateArray[0];
				var newID = getDateUUID(date);
				var newGame = {
					uuid: newID,
					gameID: uuid,
					players: [oldGame.player1,oldGame.player2],
					date: oldGame.date,
					kingdom: "",
					log: oldGame.log
				};
				allUUIDs.push(newID);
				games[newID] = newGame;
				await storeLogLocally(oldGame.log, newID, kingdom = "", dateString = oldGame.date, ignoreBotGames = false)
				chrome.storage.local.remove(uuid);
			}
		}
	}
	
	// first, remove all entries in the select box
	for(i = previousGames.options.length-1; i>=0; i--){previousGames.remove(i);}
	
	// create arrays to hold all available players and dates that occur among all games
	var players = [];
	var dates = [];
	
	allUUIDs.sort();
	// get all players and dates of all games and put the games in the selection box
	for(uuid of allUUIDs){
		if (checkUUID(uuid)){
			var game = games[uuid];
			console.log()
			var gameID = game.gameID;
			players.push(game.players[0]);
			players.push(game.players[1]);
			dates.push(game.date);
			var el = document.createElement("option");
			el.textContent = [gameID, game.players[0],"vs.", game.players[1],"(" + game.date + ")"].join(" ");;
			el.value = [gameID, uuid].join(",");
			previousGames.appendChild(el);
		}
	}
	
	// get the unique set of players and dates
	players = new Set(players);
	dates = new Set(dates);
	
	// The next section is only relevant for options.html It will fill the date and player filter drop down menus 
	try{
		// Fill the date drop down menu (filterdBy[1] is the date filter)
		if(filteredBy[1] == "any" || filteredBy.indexOf("any") == -1){
			// First clear the date drop down menu
			for(i = dateSelect.options.length-1; i>=0; i--){dateSelect.remove(i);}
			
			// Add default fields "Filter for Date" and "Any" to the drop down
			var el = document.createElement("option");
			el.textContent = "Filter for Date";
			el.value = "any";
			el.style="display:none;";
			dateSelect.appendChild(el);
			var el = document.createElement("option");
			el.textContent = "Any";
			el.value = "any";
			dateSelect.appendChild(el);
			
			// Add all unique dates to the drop down.
			for(date of dates){
				var el = document.createElement("option");
				el.textContent = date;
				el.value = date;
				dateSelect.appendChild(el);
				if(date == filteredBy[1]){
					dateSelect.selectedIndex = dateSelect.options.length-1;
				}
			}
			// If Any was selectced, show "Filter for Date" in the drop down menu
			if(filteredBy[1] == "any"){
				dateSelect.selectedIndex = 0;
			}
		}
		// Fill the player drop down menu (filterdBy[0] is the player filter)
		if(filteredBy[0] == "any" || filteredBy.indexOf("any") == -1){
			// First clear the player drop down menu
			for(i = playerSelect.options.length-1; i>=0; i--){playerSelect.remove(i);}
			
			// Add default fields "Filter for Player" and "Any" to the drop down
			var el = document.createElement("option");
			el.textContent = "Filter for Player";
			el.value = "any";
			el.style="display:none;";
			playerSelect.appendChild(el);
			var el = document.createElement("option");
			el.textContent = "Any";
			el.value = "any";
			playerSelect.appendChild(el);
			
			// Add all unique players to the drop down.
			for(player of players){
				var el = document.createElement("option");
				el.textContent = player;
				el.value = player;
				playerSelect.appendChild(el);
				if(player == filteredBy[0]){
					playerSelect.selectedIndex = playerSelect.options.length-1;
				}
			}
			// If Any was selectced, show "Filter for Player" in the drop down menu
			if(filteredBy[0] == "any"){
				playerSelect.selectedIndex = 0;
			}
		}
	}catch(e){
	}// only works in options.html

	try{
		loadLastLog();
	}catch(e){
		message.innerHTML=emptyMessage;
		console.log("Error loading last log");
		console.log(e);
	}
}



	

/**
 * Called when the popup is loaded
 * All event listeners are setup in here, as well as the port to the background 
 * script
 */	
function onWindowLoad() {
	try{
		// HTML elements that are used here:
		var message = document.getElementById("message");
		var previousGames = document.getElementById("previousGames");
		var downloadBtn = document.getElementById("downloadLog");
		var copyBtn = document.getElementById("copyLog");
		var dateSelect = document.getElementById("dateSelect");
		var playerSelect = document.getElementById("playerSelect");
		var optionsButton = document.getElementById("options");
		var loadGameButton = document.getElementById("loadGame");
	
		//Load all previous games into the popup option selector 
		chrome.storage.local.get(null, fillPreviousMatches);
		
		// Interaction with background script
		
		// open port to background script
		myPort = chrome.runtime.connect({name:"port-from-cs"});
		
		// request the current game log of a running game on dominion.games
		myPort.postMessage({request: "getFullLog"});
		
		// Event listener that receives messages from the background script containing the current log.
		myPort.onMessage.addListener(async function(m) {
			// retrieve the log from the message
			log = m.log;
			if(log != null && log.length > 0){
				// view the log in the message div of the popup/options window
				message.innerHTML = log;
				// retrieve the information whether the game has finished
				var game_over = m.timeout;
				
				// retrieve the game id from the log
				var gameID = "";
				try{
					gameID = log.match(/#\d+/).toString();
				}catch(e){
					console.log("Error matching game id");	
					console.log(e);
				}
				
				// Select the current log in the drop down or make sure that it is not present in the list (found remains false)
				var found = false;
				var value = [gameID, m.uuid].join(",");
				for(i = 0; i< previousGames.length; i++){
					if(value === previousGames[i].value){
						previousGames.selectedIndex = i;
						found = true;
						break;
					}
				}
				
				// If the log is not yet listed, add it to the list of previous games and and save it to storage.local
				if(!found){
					if(/#\d+/.test(gameID)){
						
						// Store the game to storage.local TODO set uuid in background script!!
						storeLogLocally(log, m.uuid, kingdom = m.kingdom);
						
						// get the game object
						var game = await loadStoredGameByGameID(gameID);
												
						// add the game to the list of previous games
						var el = document.createElement("option");
						el.textContent = [gameID, game.players[0],"vs.", game.players[1],"(" + game.date + ")"].join(" ");;
						
		
						el.value = [gameID, uuid].join(",");
		
						previousGames.appendChild(el);
						
						// select this game entry
						previousGames.selectedIndex = previousGames.length - 1;
					}
				}
				// If the log is faulty (too short or mismatching gameID), load the last log
				if(log.length<10){
					loadLastLog();
				}
			}
		});
		
		// Event listener that will load the selected game from the drop down menu into the message div
		previousGames.addEventListener("change", async function(){
			
			// get the ID of the selected game
			var value = previousGames.options[previousGames.selectedIndex].value;
			
			// load the selected game
			var game = await loadStoredGameByUUID(value.split(",")[1]);
			
			// view the log 
			message.innerHTML = game.log;
		});
		
		
		// Button event handlers, calling above functions.
		
		document.getElementById('downloadLog').addEventListener('click',function(){
			saveData(message.innerText.match(/#\d+/).toString());
		});
		
		document.getElementById('copyLog').addEventListener('click',function(){copyTextToClipboard(message.innerText)});
		document.getElementById('deleteLog').addEventListener('click',function(){deleteSelectedLog()});
		
		if(loadGameButton!=null){
			loadGameButton.addEventListener('click', function(){
				var gameID = previousGames.options[previousGames.selectedIndex].value.split(",")[0];
				chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
					try{
						let tab = tabs[0];
						let url = tab.url;
						if(url.match(".*/dominion.games/.*")){
							chrome.tabs.sendMessage(tab.id, {
								action: "loadGame",
								gameID: gameID.replace("#","")
							});
						}
						window.close();
					}catch(e){
						console.log("Error loading bot game");
						console.log(e);
					}
				});
			});
		}
		if(optionsButton!=null){
			optionsButton.addEventListener('click',function() {
				if (chrome.runtime.openOptionsPage) {
					chrome.runtime.openOptionsPage();
				} else {
					window.open(chrome.runtime.getURL('options.html'));
				}
			});
		}
	}catch(e){
		console.log("Error while loading the popup");
		console.log(e);
	}
}

window.onload = onWindowLoad;
	
