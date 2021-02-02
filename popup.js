// Port that is opened to the background script.
var myPort

// close the image popup when clicking anywhere
document.addEventListener("mousedown", function (evt) {
	try{
		div_hide();
	}catch(e){}
});
// import functions from storelog.js

/**
 * Downloads a single log as plain text to the download folder.
 */
async function saveData(gameID) {
	try{
		let LogPanel = document.getElementById("LogPanel");
		// Load the current game based on its gameID
		let game = await loadStoredGameByGameID(gameID);
		
		// Prepare log for saving and create fileName
		LogPanel.innerHTML = game.log;
		let log = LogPanel.innerText;
		let date = game.date.replace(/\//g, "");
		let fileName = ["LogDog",date,game.players[0],game.players[1],gameID+".txt"].join("_"); 
		
		// parse game object to json
		let json = JSON.stringify(log),
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
function copyTextToClipboard() {
	let LogPanel = document.getElementById("LogPanel");
	text = LogPanel.innerText;
	if(text.length > 10){
		//create an empty textArea to put in the text
		let textArea = document.createElement("textarea");

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
		let successful = document.execCommand('copy');
		let msg = successful ? 'Successful' : ' Not Successful';
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
		let delUUID = previousGames.options[previousGames.selectedIndex].value.split(",")[1];
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
async function loadLog(index = -1){				
	let previousGames = document.getElementById("previousGames");
	let resultPanel = document.getElementById('ResultPanel');
	let kingdomPanel = document.getElementById('KingdomPanel');
	let LogPanel = document.getElementById("LogPanel");
	
	if (index == -1){
		index = previousGames.options.length - 1
	}
	if(previousGames.options.length>0){
		previousGames.selectedIndex = index
		let gameID = previousGames.options[index].value.split(",")[0];
		if(/#\d+/.test(gameID)){
			let game = await loadStoredGameByGameID(gameID);
			if(game!=undefined){
				let LogPanel = document.getElementById("LogPanel");
				LogPanel.innerHTML = game.log;
				getDateYYMMDD("")
				if(kingdomPanel!= null){
					kingdomPanel.innerText = "";
					let txt = ""
					try{
						// Fill the log-tab and kingdom-tab 
						for(VP of game.VPs){
							txt=txt + VP.player + " (<span style='color:green;'><b>" + VP.vp_value + "VP</b></span>)<br> ";
						}
						let gameStatus = game.gameStatus;
					
						if(gameStatus!=undefined){
							txt=txt+gameStatus;
						}
					}catch(e){}
					try{
						game.kingdom.kingdomCards.forEach(card =>{
							let cardImage = new Image();
							if(["Avanto", "Bustling Village", "Emporium", "Fortune", "Plunder", "Rocks"].indexOf(card) == -1){
								cardImage.src = "images/dominionCards/"+card.replace(/ /g,"_")+"_small.jpg";
								cardImage.addEventListener("click",function(a,b){
									div_show(b,'images/dominionCards/'+card.replace(/ /g,"_")+'.jpg')
								});
								cardImage.style="margin:3px;";
								kingdomPanel.appendChild(cardImage);
							}

						});
						let licenseLink = document.createElement("div");
						licenseLink.style="font-family:TrajanPro-Bold; font-letiant:small-caps; font-size:12pt;";
						licenseLink.innerHTML = 'Images from <a href="http://wiki.dominionstrategy.com/">wiki.dominionstrategy.com</a> <br>under <a class="external" href="http://creativecommons.org/licenses/by-nc-sa/3.0/" style="user-select: auto;">Creative Commons Attribution Non-Commercial Share Alike</a> license'
						kingdomPanel.appendChild(licenseLink);
					}catch(e){kingdomPanel.innerText="Only available for new games (since LogDog 0.0.13)"}
					resultPanel.innerHTML=txt
				}
			}
			return;
		}
	}
	console.log("no Log available");
	LogPanel.innerHTML = "no Log available &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
}


/**
 * function that shows shows full-size images of kingdom-card thumb-nails
 */
function div_show(ee,img){
	div_hide();
	let curImage= document.getElementById('currentImg');
	curImage.src=img;
	curImage.alt=img;
	curImage.title=img;document.getElementById('largeImage').style.visibility='visible';
	//set absolute position of full-size image
	document.getElementById('largeImage').style.left=160+"px";
	document.getElementById('largeImage').style.top=200+"px";
}


/**
 * Function that hides the full-soze image.
 */
function div_hide(){
	document.getElementById('largeImage').style.visibility='hidden';
}


/** 
 * function that sorts select boxes
 * from https://stackoverflow.com/a/278509/2627410
 *
 */
 
function sortSelect(selElem, skip=0) {
    if(skip>0)skip--;
	let tmpAry = new Array();
    for (let i=skip;i<selElem.options.length;i++) {
        tmpAry[i-skip] = new Array();
        tmpAry[i-skip][0] = selElem.options[i].text;
        tmpAry[i-skip][1] = selElem.options[i].value;
    }
	tmpAry.sort(function (a, b) {
		return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
	});
	while (selElem.options.length > skip+1) {
        selElem.options[skip+1] = null;
    }
    for (let i=0;i<tmpAry.length;i++) {
        let op = new Option(tmpAry[i][0], tmpAry[i][1]);
        selElem.options[i+skip] = op;
    }
    return;
}

/**
 * Fill the previous game selection box with all games that passed the filter.
 *  games - array of objects representing games (can be a filtered list already)
 *  filteredBy - If the list was filtered, this variable indicates, which filters 
 *               were applied
 */
async function fillPreviousMatches(games, filteredBy=["any","any"]) {
	let previousGames = document.getElementById("previousGames");
	let playerSelect = document.getElementById('playerSelect');
	let dateSelect = document.getElementById('dateSelect');
	let LogPanel = document.getElementById("LogPanel");
	
	// get all game ids from the array of games
	let allUUIDs = Object.keys(games);
	
	let allGameIDs = [];
	for(uuid of allUUIDs){
		if (checkUUID(uuid)){
			allGameIDs.push(games[uuid].gameID);
		}else{
			//For compatibility with older logs (before v0.0.7)
			if(uuid.match(/#\d+/) != null){
				// uuid is actually a gameID in the previous version
				// create a new uuid
				let oldGame = games[uuid];
				let dateArray = oldGame.date.split("/");
				let date = dateArray[2].substring(2)+dateArray[1]+dateArray[0];
				let newID = getDateUUID(date);
				let newGame = {
					uuid: newID,
					gameID: uuid,
					players: [oldGame.player1,oldGame.player2],
					date: oldGame.date,
					kingdom: "",
					VPs: "",
					log: oldGame.log
				};
				allUUIDs.push(newID);
				games[newID] = newGame;
				await storeLogLocally(oldGame.log, newID, gameStatus = "unknown", VPs = "", kingdom = "", dateString = oldGame.date, ignoreBotGames = false)
				chrome.storage.local.remove(uuid);
			}
		}
	}
	// first, remove all entries in the select box
	for(i = previousGames.options.length-1; i>=0; i--){previousGames.remove(i);}
	
	// create arrays to hold all available players and dates that occur among all games
	let players = [];
	let dates = [];
	
	allUUIDs.sort();
	// get all players and dates of all games and put the games in the selection box
	for(uuid of allUUIDs){
		if (checkUUID(uuid)){
			let game = games[uuid];
			console.log()
			let gameID = game.gameID;
			players.push(game.players[0]);
			players.push(game.players[1]);
			dates.push(game.date);
			let el = document.createElement("option");
			el.textContent = [gameID, game.players.join(" vs. "),"(" + game.date + ")"].join(" ");;
			el.value = [gameID, uuid].join(",");
			previousGames.appendChild(el);
		}
	}
	sortSelect(previousGames);
	
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
			let el = document.createElement("option");
			el.textContent = "Filter for Date";
			el.value = "any";
			el.style="display:none;";
			dateSelect.appendChild(el);
			el = document.createElement("option");
			el.textContent = "Any";
			el.value = "any";
			dateSelect.appendChild(el);
			
			// Add all unique dates to the drop down.
			for(date of dates){
				let el = document.createElement("option");
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
			let el = document.createElement("option");
			el.textContent = "Filter for Player";
			el.value = "any";
			el.style="display:none;";
			playerSelect.appendChild(el);
			el = document.createElement("option");
			el.textContent = "Any";
			el.value = "any";
			playerSelect.appendChild(el);
			
			// Add all unique players to the drop down.
			for(player of players){
				let el = document.createElement("option");
				el.textContent = player;
				el.value = player;
				playerSelect.appendChild(el);
				
			}
			
			sortSelect(playerSelect,skip=2);
			// If Any was selectced, show "Filter for Player" in the drop down menu
			if(filteredBy[0] == "any"){
				playerSelect.selectedIndex = 0;
			}else{
				for(i = 0;i<playerSelect.options.length;i++){
					if(playerSelect.options[i].value == filteredBy[0]){
						playerSelect.selectedIndex = i;
						break;
					}
				}
			}
		}
	}catch(e){
	}// only works in options.html

	try{
		loadLog();
	}catch(e){
		LogPanel.innerHTML=emptyMessage;
		console.log("Error loading last log");
		console.log(e);
	}
}

/**
 * function that filters matches in the previous games drop down menu based on the 
 * selected player and date.
 *
 * Player and date options are dynamically changed based on the other drop down box
 * selection.
 */
function filterGames(){
	let playerSelect = document.getElementById('playerSelect');
	let dateSelect = document.getElementById('dateSelect');
	let LogPanel = document.getElementById("LogPanel");
	
	//get the values that will be used for filtering ("any" is one of the options).
	let player = playerSelect.options[playerSelect.selectedIndex].value
	let date = dateSelect.options[dateSelect.selectedIndex].value
	let previousGames = document.getElementById("previousGames");
	
	
	// remove all games from the drop down menu first
	for(i = previousGames.length-1; i>=0; i--){previousGames.remove(i);}
	
	// Load all games and filter for the matching ones 
	chrome.storage.local.get(null,async function(games){
		// get all game IDs
		let allUUIDs = Object.keys(games);
		// create a new array that will hold the filtered game ids
		let filteredGames = {};
		for(uuid of allUUIDs){
			//check if the uuid key actually is a uuid to prevent exceptions
			if (checkUUID(uuid)){
				let game = games[uuid];
				//compare the filter to each game and push matching ids into gameIDs
				if((date.trim() == "any" || game.date == date)&&(player.trim() == "any" || game.players.indexOf(player) != -1)){
					filteredGames[uuid] = game;
				}
			}
		}
		
		// Load only the filtered matches again
		fillPreviousMatches(filteredGames, [player,date]);
		
		// Load the last entry of the list
		try{
			loadLog();
		}catch(e){
			LogPanel.innerHTML=emptyMessage;
			console.log("error loading log, probably no log file saved");
			console.log(e);
		}
	});
};


	

/**
 * Called when the popup is loaded
 * All event listeners are setup in here, as well as the port to the background 
 * script
 */	
document.addEventListener('DOMContentLoaded', function() {
	try{
		let previousGames = document.getElementById("previousGames");
		let LogPanel = document.getElementById("LogPanel");
		
		
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
				
				// view the log in the LogPanel div of the popup/options window
				LogPanel.innerHTML = log;
				// retrieve the information whether the game has finished
				let gameStatus = m.gameStatus;
				
				// retrieve the game id from the log
				let gameID = "";
				try{
					gameID = log.match(/#\d+/).toString();
				}catch(e){
					console.log("Error matching game id");	
					console.log(e);
				}
				
				// Select the current log in the drop down or make sure that it is not present in the list (found remains false)
				let found = false;
				let value = [gameID, m.uuid].join(",");
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
						
						// Store the game to storage.local 
						storeLogLocally(log, m.uuid, gameStatus = m.gameStatus, VPs = m.VPs, kingdom = m.kingdom);
						
						// get the game object
						let game = await loadStoredGameByGameID(gameID);
												
						// add the game to the list of previous games
						let el = document.createElement("option");
						el.textContent = [gameID, game.players[0],"vs.", game.players[1],"(" + game.date + ")"].join(" ");;
						
		
						el.value = [gameID, uuid].join(",");
		
						previousGames.appendChild(el);
						// select this game entry
						previousGames.selectedIndex = previousGames.length - 1;
					}
				}
				// If the log is faulty (too short or mismatching gameID), load the last log
				if(log.length<10){
					loadLog();
				}
			}
		});
		
		// Event listener that will load the selected game from the drop down menu into the LogPanel div
		previousGames.addEventListener("change", function(){
			loadLog(previousGames.selectedIndex);
		});
		
		
		// Button event handlers, calling above functions.
		
		
		document.getElementById('playerSelect').addEventListener("change", filterGames);
		document.getElementById('dateSelect').addEventListener("change", filterGames);
	
		document.getElementById('downloadLog').addEventListener('click',function(){
			saveData(LogPanel.innerText.match(/#\d+/).toString());
		});
		
		document.getElementById('copyLog').addEventListener('click',function(){copyTextToClipboard()});
		document.getElementById('deleteLog').addEventListener('click',function(){deleteSelectedLog()});
		
		let loadKingdomButton = document.getElementById("loadKingdom");
		// Load a new game with kingdom cards of the selected game
		if(loadKingdomButton!=null){
			loadKingdomButton.addEventListener('click',async function(){
				let game = await loadStoredGameByGameID(previousGames.options[previousGames.selectedIndex].value.split(",")[0]);
				chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
					try{
						let tab = tabs[0];
						let url = tab.url;
						if(url.match(".*/dominion.games/.*")){
							chrome.tabs.sendMessage(tab.id, {
								action: "loadKingdom",
								kingdom: game.kingdom
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
		
		
		let loadGameButton = document.getElementById("loadGame");
		if(loadGameButton!=null){
			loadGameButton.addEventListener('click', function(){
				let gameID = previousGames.options[previousGames.selectedIndex].value.split(",")[0];
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
		
		let optionsButton = document.getElementById("options");
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
})


	
