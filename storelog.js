/**
 *
 * to save a game to local storage, use:
 *	var gameID = storeLogLocally(htmlCode);
 *
 * to load logs from storage, use:
 * 	var game = await loadStoredGame(gameID);
 *	
 *	the calling function must be async!
 */
 


/**
 * Function that stores game information loaclly and returns the gameID
 *
 * returns: gameID
 */
function storeLogLocally(gameLog, dateString = "none") { 
	try{
		// get game ID from the log
		var	gameID = gameLog.match(/#\d+/).toString();
		
		if(gameID.length > 0){
			// extract player name and order. This is tested for english and should work for german, french and might work for russian. 
			// It will fail before both players had their first turn.
			
			
			console.log(gameID);
			
			var regexp = />(Turn|Zug|Tour|Ход) 1 - (.+?)</g;
			var player1 = regexp.exec(gameLog)[2];
			var player2 = regexp.exec(gameLog)[2];
			
			
			console.log(player1,player2);
			// get a String representing the current date
			if(dateString=="none"){
				dateString = getDateDDMMYYYY();
			}
			console.log(dateString);
			//generate object with game info (can be expanded later (e.g. VP counter)
			var game = {
				player1: player1,
				player2: player2,
				date: dateString,
				log: gameLog
			};
			
			// save the game to local storage
			var saveGame = {};
			saveGame[gameID] = game;
			if(/#\d+/.test(gameID)){               
				chrome.storage.local.set(saveGame, function() {
					console.log('Log saved locally');
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
function loadStoredGame(gameID) {
    return new Promise((resolve) => {
		chrome.storage.local.get([gameID], function(games) {
			resolve(games[gameID]);
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

// variable that can be put ito the message div, if there is nothing to show.
var emptyMessage = "no&nbsp;Log&nbsp;available&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"