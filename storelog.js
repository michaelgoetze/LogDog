/**
 *
 * to save a game to local storage, use:
 *	var gameID = storeLogLocally(htmlCode, kingdom);
 *
 *	
 *	the calling function must be async!
 */
 


/**
 * Function that stores game information loaclly and returns the gameID
 *
 * returns: gameID
 */
async function storeLogLocally(gameLog, uuid, kingdom = "", dateString = "none", ignoreBotGames = null) { 
	try{
		// get game ID from the log
		var	gameID = gameLog.match(/#\d+/).toString();
		console.log(gameID)
		if(gameID.length > 0){
			// extract player name and order. This is tested for english and should work for german, french and might work for russian. 
			// It will fail before both players had their first turn.
			
			gameLog = gameLog.replace(/Rattington/g, "Rat");
			
			var regexp = />(Turn|Zug|Tour|Ход) 1 - (.+?)</g;
			players = [];
			console.log("trying to save")
			var player = regexp.exec(gameLog);
			var bots = ["Lord Rat","Revenge Witch","Lord Voldebot"];
			if(ignoreBotGames == null){
				ignoreBotGames = await getSetting("ignoreBotGames", defaultValue = false);
			}
			console.log("ignoreBotGames", ignoreBotGames);
			while(player!=null){
				players.push(player[2])
				console.log(player[2])
				if(ignoreBotGames && bots.indexOf(player[2])!=-1){
					console.log("Ignoring Bot Game")
					return;
				}
				player = regexp.exec(gameLog);
			}
			if(players.length <2){
				// not enough players
				console.log("Start of game, no player names available yet");
				return;
			}
			
			// get a String representing the current date
			if(dateString=="none"){
				dateString = getDateDDMMYYYY();
			}
			
			//generate object with game info (can be expanded later (e.g. VP counter))
			var game = {
				uuid: uuid,
				gameID: gameID,
				players: players,
				date: dateString,
				kingdom: kingdom,
				log: gameLog
			};
			
			// save the game to local storage
			var saveGame = {};
			saveGame[uuid] = game;
			if(/#\d+/.test(gameID)){               
				chrome.storage.local.set(saveGame, function() {
					console.log("Log saved locally: ", gameID, players, dateString);
				});
			}else{
				console.log("No correct gameID: " + gameID)
			}
			return gameID;
		}
	}catch(e){
		console.log("Error while saving the log");
		console.log(e);
		}
	
	return "none";
}

/**
 * Function that loads and returns a game from local storage by its game id. The 
 * function returns a promise and needs an await in an async function.
 */
function loadStoredGameByGameID(gameID) {
    return new Promise((resolve) => {
		chrome.storage.local.get(null, function(games) {
			var allGames = []
			for(uuid in games){
				if(games[uuid].gameID == gameID){
					allGames.push(games[uuid])
				}
			}
			
			if(allGames.length>1){
				var bots = ["Lord Rattington","Revenge Witch","Lord Voldebot"];
				for(game of allGames){
					//Check if the game was played without bots, if so, this is the original game 
					var combined = bots.concat(game.players);
					if((combined.length == new Set(combined).size)){
						resolve(game);
						return;
					}
				}					
			}
			resolve(allGames[0]);
			return;
		});
    });
}

/**
 * Function that loads and returns a game from local storage by its game id. The 
 * function returns a promise and needs an await in an async function.
 */
function loadStoredGameByUUID(uuid) {
    return new Promise((resolve) => {
		chrome.storage.local.get([uuid], function(games) {
			resolve(games[uuid]);
		});
    });
}

/**
 * Functions to handle user-defined settings values.
 */
function getSetting(property, defaultValue = undefined){
	return new Promise((resolve) => {
		chrome.storage.local.get("settings",function(value){
			settings = value["settings"];
			try{
				if(defaultValue == undefined || settings[property] != undefined){
					resolve(settings[property]);
					return;
				}
			}catch(e){}			
			resolve(defaultValue);
		});
	});
	
}

function setSetting(property, value){
	chrome.storage.local.get(["settings"], function(settings){
		if(settings == undefined){
			settings = {}
		}
		settings[property] = value;
		var settingsObj = {}
		settingsObj["settings"] = settings;
		chrome.storage.local.set(settingsObj, function(){
			console.log("updated settings",settings)
		});
	});
}

/**
 * A function that returns an array with DD, MM, YYYY info of the current day. This function is used below to generate two different date strings for files and logs.
 */
function getDateArray(){
	var today = new Date();
	var dd = today.getDate().toString();
	while (dd.length < 2) {
        dd = '0' + dd;
    }
	var mm = (today.getMonth()+1).toString();
	while (mm.length < 2) {
        mm = '0' + mm;
    }
	var yyyy = (today.getYear()+1900).toString();
	
	return [dd,mm,yyyy];
}

/**
 * Function that returns today as DDMMYYYY with a selected separator such as 
 * 28/05/2020
 */
function getDateDDMMYYYY(separator="/"){
	return getDateArray().join(separator);
}

/**
 * Function that returns today as DDMMYYYY with a selected separator such as 
 * 20/05/28
 */
function getDateYYMMDD(separator="/"){
	var date = getDateArray();
	var newDate = [];
	newDate.push(date[2].substring(2));
	newDate.push(date[1]);
	newDate.push(date[0]);
	
	return newDate.join(separator);
}

/** function that generates a uuid
 *
 */
function getDateUUID(date=null) {
  if(date == null){
	  date = getDateYYMMDD("");
  }
  return date + '-xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * check whter a key is a uuid
 */
function checkUUID(uuid){
	try{
		return uuid.match(/\d{6}(-[0-9abcdef]{4}){4}/)[0] == uuid;
	}catch(e){
		return false;
	}
}
 
 
// variable that can be put ito the message div, if there is nothing to show.
var emptyMessage = "no&nbsp;Log&nbsp;available&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"