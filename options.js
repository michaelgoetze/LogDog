
/**
 * function that clears local storage for all games that are stored. Cannot be 
 * undone unless a backup was made before.
 *
 * Also clears select boxes and the temporarily stored log.
 */
function clearAllLogs(){
	let previousGames = document.getElementById("previousGames");
	if(confirm("Are you sure? This will delete all logs permanently from this computer")){
		chrome.storage.local.get(["settings"], function(settings){
			chrome.storage.local.clear(function(){
				while (previousGames.options.length) {
					previousGames.remove(0);
				}
				let value = {}
				value["settings"] = settings;
				chrome.storage.local.set(value, function(){
					console.log("cleared logs",settings)
				});
			});
		});
		
		document.getElementById('LogPanel').innerHTML = emptyMessage;
		
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
	var LogPanel = document.getElementById('LogPanel');
	let log = LogPanel.innerHTML;
	if(log.match(/#\d+/) != null){
		let players = [];
		let abbr = [];
		let newAbbr = [];
		// get current gameID from the presented log.
		gameID = log.match(/#\d+/).toString()
		
		// Load the corresponding game 
		const game = await loadStoredGameByGameID(gameID);
		for(let i=0; i<game.players.length; i++){
			// get the corrected player names (display the original ones)
			players[i] = prompt("Player "+(i+1), game.players[i]);
			
			if(players[i] == null) return;
			abbr[i] = game.players[i].charAt(0);
			newAbbr[i] = players[i].charAt(0);
		}
		
		// Determine old and new name abbreviations:
		
		let j=1;
		while(new Set(abbr).size < abbr.length){
			for(let i=0; i<game.players.length; i++){
				try{
					abbr[i] = abbr[i] + game.players[i].charAt(j);
				}catch(e){
					console.log("setting up abbr1");
					console.log(e);
					};
			}
			j++;
		}
		
		j=1;
		while(new Set(newAbbr).size < newAbbr.length){
			for(let i=0; i<game.players.length; i++){
				try{
					newAbbr[i] = newAbbr[i] + players[i].charAt(j);
				}catch(e){
					console.log("setting up abbr1");
					console.log(e);
					};
			}
			j++;
		};
		
		//Exchange names and abbreviations in the log 
		for(let i=0; i<game.players.length; i++){
			
			let re = new RegExp(game.players[i], 'g');
			game.log = game.log.replace(re, players[i]);
			re = new RegExp(">"+abbr[i]+"<", 'g');
			game.log = game.log.replace(re, ">"+newAbbr[i]+"<");
		}
		// store the modified log to the local storage
		await storeLogLocally(game.log, game.uuid, game.gameStatus, game.VPs, game.kingdom, game.date);
		
		// update the log in the browser view
		LogPanel.innerHTML = game.log;
		
		// refresh the previousGames drop down menu
		console.log("Filling Previous Matches")
		chrome.storage.local.get(null, fillPreviousMatches);	
	}else{
		alert("No game selected to change names.\n Play a game of dominion or load a backup");
	}
}





/**
 * function that saves the current local storage to a json file that can be loaded 
 * later as a backup or copied to a different computer.
 */
function backupLogs() {
	// set the fileName of the backup file with the current date in YYMMDD
	const fileName = "LogDog_backup_"+getDateYYMMDD("")+".json";
	
	//load all games and save them to the download folder
	chrome.storage.local.get(null, function(games) { 
		// Convert object to a Json string.
		const result = JSON.stringify(games);

		// Save the Json file
		const url = 'data:application/json;base64,' + btoa(result);
		chrome.downloads.download({
			url: url,
			filename: fileName
		});
	});
}


/**
 * function that checks whether a game is already present under a different uuid. If so, it should be only added, if the log is different.
 */
function addIfAbsent(backupGame){
	return new Promise((resolve) => {
		chrome.storage.local.get(null, function(games) {
			let allGames = []
			
			for(uuid in games){
				if(games[uuid].gameID == backupGame.gameID){
					allGames.push(games[uuid])
				}
			}
			let found = false;
			for(game of allGames){
				try{
					// include logs of identical logs and backup logs that are longer than the original but otherwise the same.
					if(backupGame.log.indexOf(game.log)==0){
						found = true;
						break;
					}
				}catch(e){}
			}
			if(!found){
				// Do only save the game, if the game-log is unique.
				return resolve(backupGame);				
			}
			return resolve(null);
		});
	});
}

/**
 * functio to control tabs
 */
function clickHandler(elem) {
	const target = elem.target;
	const panelId = target.getAttribute('aria-controls'),
		panel = document.getElementById(panelId);
	if(panel!=null){
		const selectedTab = document.querySelector('[aria-selected="true"]');
		selectedTab.setAttribute('aria-selected', false);
		target.setAttribute('aria-selected', true);
		const panels = document.querySelector('[aria-hidden="false"]');
		panels.setAttribute('aria-hidden', true);
		panel.setAttribute('aria-hidden', false);
	}
}

/**
 * Install event handlers, when content is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
	
	//Event handlers
	let previousGames = document.getElementById("previousGames");
		
	document.getElementById('clearLogs').addEventListener('click',clearAllLogs);
	document.getElementById('backupLogs').addEventListener('click',backupLogs);
	document.getElementById('changeNames').addEventListener('click',changeNames);

	document.getElementById('loadBackup').addEventListener('click',function(){
		document.getElementById('backup-file').click();
	});
	
	document.getElementById('tablist').addEventListener('click',clickHandler);
	
	/**
	 * Event listener that is triggered, when a file is selected for loading a backup.
	 * The backup will override games that are already in the list and add all games 
	 * that are not present. 
	 */
	 
	let backupFile = document.getElementById('backup-file');
	backupFile.addEventListener('change', function(){
		//get the file that was selected as a backup to load
		let file = backupFile.files[0];
		if (file) {
			let reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onload = async function (evt) {
				// parse String to JSON
				let newGames = {};
				let backupGames = JSON.parse(evt.target.result);
				for(uuid of Object.keys(backupGames)){
					let backupGame = backupGames[uuid];
					// See, if the game is already present.
					let newGame = await addIfAbsent(backupGame);
					if(newGame != null){
						newGames[newGame.uuid] = newGame;
					}
				}
				chrome.storage.local.set(newGames, function() {
					console.log("loaded backup")
					chrome.storage.local.get(null, fillPreviousMatches)
				});
			}
			reader.onerror = function (evt) {
				console.log("error reading file");
			}
			
			// set the file input value to null so that the same backup could be loaded again (e.g. if clearAllLogs was called after the backup.
			backupFile.value = null;
		}
	});

	
	// Status of settings: needs to load getSetting and setSetting first (avoid bug by loading it a bit later)
	let ignoreBotBox = document.getElementById('ignoreBotGames');
	setTimeout(async function(){
		ignoreBotBox.checked = await getSetting("ignoreBotGames", defaultValue = false);
		ignoreBotBox.addEventListener('change',function(){
			setSetting("ignoreBotGames",ignoreBotBox.checked);
		});
	},100);
	
	// Link to Chrome:extensions
	document.getElementById('chrome-extensions').addEventListener('click', function() {
		chrome.tabs.update({ url: 'chrome://extensions' });
	});
});
