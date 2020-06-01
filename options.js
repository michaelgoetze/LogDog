// import functions from storelog.js and popup.js
var imported = document.createElement("script");
imported.src = "storelog.js";  
document.getElementsByTagName("head")[0].appendChild(imported);
imported.src = "popup.js";  
document.getElementsByTagName("head")[0].appendChild(imported);


// HTML elements that are used here:
var playerSelect = document.getElementById('playerSelect');
var dateSelect = document.getElementById('dateSelect');
var previousGames = document.getElementById("previousGames");
var message = document.getElementById('message');
var backupFile = document.getElementById('backup-file');


/**
 * function that clears local storage for all games that are stored. Cannot be 
 * undone unless a backup was made before.
 *
 * Also clears select boxes and the temporarily stored log.
 */
function clearAllLogs(){
	if(confirm("Are you sure? This will delete all logs permanently from this computer")){
		chrome.storage.local.clear(function(){
			while (previousGames.options.length) {
				previousGames.remove(0);
			}
		});
		
		//Fill message field with text:
		message.innerHTML = emptyMessage;
		
		// send message to background script, to clear the temporarily stored log as well 
		chrome.runtime.sendMessage({
			action: "clearAllLogs"
		});
		
		// clear the select field in the popup and options windows.
		chrome.storage.local.get(null, fillPreviousMatches);
	}
}

/**
 * function that allows to change the name of players in case the log was fetched
 * after the game was done and AI player took the place.
 *
 * The date of the match is kept and also Name abbreviations are changed. 
 */
async function changeNames(){
	var log = message.innerHTML;
	if(log.match(/#\d+/) != null){
		var player1;
		var player2;
		
		// get current gameID from the presented log.
		gameID = log.match(/#\d+/).toString()
		
		// Load the corresponding game 
		var game = await loadStoredGame(gameID);
		
		// get the corrected player names (display the original ones)
		var player1 = prompt("Player 1", game.player1);
		var player2 = prompt("Player 2", game.player2);
		
		// Determine old and new name abbreviations:
		var abbr1 = "";
		var abbr2 = "";
		let i=0;
		do{
			try{
				abbr1 = abbr1 + game.player1.charAt(i);
			}catch(e){
				console.log("setting up abbr1");
				console.log(e);
				};
			try{
				abbr2 = abbr2 + game.player2.charAt(i);
			}catch(e){
				console.log("Setting up abbr2");
				console.log(e);};
			i++;
		}while(abbr1 == abbr2);
		
		var newAbbr1 = "";
		var newAbbr2 = "";
		i=0;
		do{
			try{
				newAbbr1 = newAbbr1 + player1.charAt(i);
			}catch(e){
				console.log("Setting up newAbbr1");
				console.log(e);};
			try{
				newAbbr2 = newAbbr2 + player2.charAt(i);
			}catch(e){
				console.log("Setting up newAbbr2");
				console.log(e);};
			i++;
		}while(newAbbr1 == newAbbr2);
		
		//Exchange names and abbreviations in the log 
		var re = new RegExp(game.player1, 'g');
		game.log = game.log.replace(re, player1);
		re = new RegExp(game.player2, 'g');
		game.log = game.log.replace(re, player2);
		re = new RegExp(">"+abbr1+"<", 'g');
		game.log = game.log.replace(re, ">"+newAbbr1+"<");
		re = new RegExp(">"+abbr2+"<", 'g');
		game.log = game.log.replace(re, ">"+newAbbr2+"<");
		
		// store the modified log to the local storage
		storeLogLocally(game.log,game.date);
		
		// update the log in the browser view
		message.innerHTML = game.log;
		
		// refresh the previousGames drop down menu
		chrome.storage.local.get(null, fillPreviousMatches);	
	}else{
		alert("No game selected to change names.\n Play a game of dominion or load a backup");
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
	
	//get the values that will be used for filtering ("any" is one of the options).
	var player = playerSelect.options[playerSelect.selectedIndex].value
	var date = dateSelect.options[dateSelect.selectedIndex].value
	
	// remove all games from the drop down menu first
	for(i = previousGames.length-1; i>=0; i--){previousGames.remove(i);}
	
	// Load all games and filter for the matching ones 
	chrome.storage.local.get(null,async function(games){
		// get all game IDs
		var allGameIDs = Object.keys(games);
		
		// create a new array that will hold the filtered game ids
		var filteredGames = {};
		for(gameID of allGameIDs){
			//check if the gameID key actually is a gameID to prevent exceptions
			if(/#\d+/.test(gameID)){
				var game = games[gameID];
				//compare the filter to each game and push matching ids into gameIDs
				if((date == "any" || game.date == date)&&(player == "any" || game.player1 == player || game.player2 == player)){
					filteredGames[gameID] = game;
				}
			}
		}
		
		// Load only the filtered matches again
		fillPreviousMatches(filteredGames, [player,date]);
		
		// Load the last entry of the list
		try{
			loadLastLog();
		}catch(e){
			message.innerHTML=emptyMessage;
			console.log("error loading log, probably no log file saved");
			console.log(e);
		}
	});
};


/**
 * function that saves the current local storage to a json file that can be loaded 
 * later as a backup or copied to a different computer.
 */
function backupLogs() {
	// set the fileName of the backup file with the current date in YYMMDD
	var fileName = "LogDog_backup_"+getDateYYMMDD("")+".json";
	
	//load all games and save them to the download folder
	chrome.storage.local.get(null, function(games) { 
		// Convert object to a Json string.
		var result = JSON.stringify(games);

		// Save the Json file
		var url = 'data:application/json;base64,' + btoa(result);
		chrome.downloads.download({
			url: url,
			filename: fileName
		});
	});
}


// Event Listeners

/**
 * Triggers changes when filters are applied, filtering for players and match dates
 */
 
playerSelect.addEventListener("change", filterGames);
dateSelect.addEventListener("change", filterGames);

/**
 * Button events:
 */
document.getElementById('clearLogs').addEventListener('click',clearAllLogs);
document.getElementById('backupLogs').addEventListener('click',backupLogs);
document.getElementById('changeNames').addEventListener('click',changeNames);

/**
 * Event that is relayed to the file input selection
 */
document.getElementById('loadBackup').addEventListener('click',function(){
	backupFile.click();
});

/**
 * Link to Chrome:extensions
 */
document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('chrome-extensions').addEventListener('click', function() {
		chrome.tabs.update({ url: 'chrome://extensions' });
	});
});

/**
 * Event listener that is triggered, when a file is selected for loading a backup.
 * The backup will override games that are already in the list and add all games 
 * that are not present. 
 *
 * 
 */
backupFile.addEventListener('change',function(){
	//get the file that was selected as a backup to load
	var file = backupFile.files[0];
	if (file) {
		// Start a confirm dialog if the local storage alread contains games that might be overwritten.
		if(previousGames.options.length != 0) {
			if(!confirm("This will add all backed up games to your list. Any changes to games (e.g. player names) will be overwritten.\nProceed?")){
				return;
			}
		}
		
		// Read the backup file
		var reader = new FileReader();
		reader.readAsText(file, "UTF-8");
		reader.onload = function (evt) {
			// parse String to JSON
			var data = JSON.parse(evt.target.result);
			// Save the JSON backup to the local storage
			chrome.storage.local.set(data, function(){
				chrome.storage.local.get(null, fillPreviousMatches);
			});
		}
		reader.onerror = function (evt) {
			console.log("error reading file");
		}
		
		// set the file input value to null so that the same backup could be loaded again (e.g. if clearAllLogs was called after the backup.
		backupFile.value = null;
	}
});