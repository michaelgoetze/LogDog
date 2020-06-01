
 /**
  * central function that parses the HTML code to extract the game log from 
  * dominion.games
  */
function getGameLog() {
	let ended = "none";
	let value = "none";
	try {
		value = document.getElementsByClassName('game-log')[0].innerHTML;
		ended = document.getElementsByClassName('timeout')[0].innerHTML;
		
		
	}catch (e) {
		console.log("Game not over yet");
		
	}
	
	let result = {
		"timeout": ended,
		"html": value
	}
	return result;
}

chrome.runtime.sendMessage({
    action: "getLog",
    domLog: getGameLog()
});
