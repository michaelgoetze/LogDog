
 /**
  * central function that parses the HTML code to extract the game log from 
  * dominion.games
  */
function getGameLog(kingdom = "") {
	let ended = "none";
	let value = "none";
	
	try {
		value = document.getElementsByClassName('game-log')[0].innerHTML;
		ended = document.getElementsByClassName('timeout')[0].innerHTML;
		if(kingdom == ""){
			kingdom = getKingdom();
			console.log("Kingdom updated")
			console.log(kingdom)
		}
	}catch (e) {}

	let result = {
		"timeout": ended,
		"html": value,
		"kingdom": kingdom
	}
	return result;
}


/**
 * load a previously played game again with Lord Rat as opponent
 */ 
function loadGame(gameID){
	console.log("LOADING OLD GAME AS BOT GAME "+gameID);
	var delay = 400;
	if(["New Table","Neuer Tisch","Nouvelle table","Новый стол","新規卓","新房間"].indexOf(document.getElementsByClassName('tab-button')[1].innerText)!=-1){
		document.getElementsByClassName('tab-button')[1].click();
		setTimeout(function(){
			// Load old game button
			document.getElementsByClassName('lobby-button')[1].click();
			setTimeout(function(){
				// Fill out game id
				var gameIdInput = document.getElementsByClassName('table-rule-text-input')[0];
				gameIdInput.value=gameID;
				gameIdInput.dispatchEvent(new Event('change'));
				setTimeout(function(){
					// Click load game button
					document.getElementsByClassName('lobby-button')[2].click()
					setTimeout(function(){
						// Fill out decision value
						var decision = document.getElementsByClassName('table-rule-text-input')[1];
						decision.value = 0;
						decision.dispatchEvent(new Event('change'));
						setTimeout(function(){
							//Add Bot Lord Rattington
							var botButton = document.getElementsByClassName('lobby-button kingdom-selection')[0];
							if(botButton.parentElement.ariaHidden=="false"){
								botButton.click()
							}
							setTimeout(function(){
								//Click Load Game again to lock decision
								document.getElementsByClassName('lobby-button')[3].click();
							},delay);
						},delay);
					},delay);
				},delay);
			},delay);
		},delay);
	}else{
		console.log("Cannot create new table");
	}
}


/** get the kingdom cards (including landscape cards) to also save alongside the log.
 *	Complicated picks: castles, shelters (Necropolis,Overgrown Estate,Hovel), platinum, others?
 *  
 *  Those are all kingdom cards:
 *   document.getElementsByClassName('kingdom-viewer-group')[0].getElementsByClassName('full-card-name card-name')
 *   document.getElementsByClassName('full-card-name card-name')
 *
 *  document.getElementsByClassName('kingdom-viewer-header-container') //Contains card groups name
 *  document.getElementsByClassName('kingdom-viewer-group') //contains cards
 *
 ******************************************************************************************************************************************
 *  Exclude cards, that are not kingdom supply cards?
 *
 * Standard Supply:
 * "Copper","Curse","Duchy","Estate","Gold","Potion","Province","Silver",
 *
 * Headers:
 * "Hexes","Boons","Prize",
 *
 * Prices :
 * "Bag of Gold","Princess","Diadem","Followers","Trusty Steed",
 * 
 * Travellers:
 * "Treasure Hunter","Warrior","Hero","Champion","Soldier","Fugitive","Disciple","Teacher",
 *
 * Knights:
 * "Dame Anna","Dame Josephine","Dame Molly","Dame Natalie","Dame Sylvia","Sir Martin","Sir Bailey","Sir Destry","Sir Michael","Sir Vander",
 *
 * Ruins:
 * "Abandoned Mine","Ruined Library","Ruined Market","Ruined Village","Survivors",
 *
 * Castles:
 * "Humble Castle","Crumbling Castle","Small Castle","Haunted Castle","Opulent Castle","Sprawling Castle","Grand Castle","King's Castle",
 *
 * Zombies:
 * "Zombie Apprentice","Zombie Mason","Zombie Spy"
 * 
 * Heirloom:
 * "Haunted Mirror","Magic Lamp","Goat","Pasture","Pouch","Cursed Gold","Lucky Coin",
 *
 * Spirit:
 * "Will-o'-Wisp","Imp","Ghost",
 * 
 * Extra cards:
 * "Bat","Horse","Madman","Mercenary","Spoils","Wish",];
 * 
 * Boons:
 * "The Earth's Gift","The Field's Gift","The Flame's Gift","The Forest's Gift","The Moon's Gift","The Mountain's Gift","The River's Gift","The Sea's Gift","The Sky's Gift","The Sun's Gift","The Swamp's Gift","The Wind's Gift",
 *
 * Hexes:
 * "Bad Omens","Delusion","Envy","Famine","Fear","Greed","Haunting","Locusts","Misery","Plague","Poverty","War",
 *
 * Artifacts:
 * "Flag","Horn","Key","Lantern","Treasure Chest"
 *
 * States:
 * "Lost in the Woods","Deluded","Envious","Miserable","Twice Miserable"
 *
 */ 
function getKingdom(){
	//exclude mixed piles, ruins and landscape cards (see above).
	var excluded = [
	"Abandoned Mine","Ruined Library","Ruined Market","Ruined Village","Survivors",
	"Dame Anna","Dame Josephine","Dame Molly","Dame Natalie","Dame Sylvia","Sir Martin","Sir Bailey","Sir Destry","Sir Michael","Sir Vander",
	"Humble Castle","Crumbling Castle","Small Castle","Haunted Castle","Opulent Castle","Sprawling Castle","Grand Castle","King's Castle",
	"The Earth's Gift","The Field's Gift","The Flame's Gift","The Forest's Gift","The Moon's Gift","The Mountain's Gift","The River's Gift","The Sea's Gift","The Sky's Gift","The Sun's Gift","The Swamp's Gift","The Wind's Gift",
	"Bad Omens","Delusion","Envy","Famine","Fear","Greed","Haunting","Locusts","Misery","Plague","Poverty","War",
	"Flag","Horn","Key","Lantern","Treasure Chest",
	"Lost in the Woods","Deluded","Envious","Miserable","Twice Miserable"]
	try{
		var cards = [];
		for(elt of document.getElementsByClassName('kingdom-viewer-group')[0].getElementsByClassName('full-card-name card-name')){
			var card = elt.innerText.trim();
			if(excluded.indexOf(card)==-1){
				cards.push(card);
			}
		}
		
		for(elt of document.getElementsByClassName('landscape-name')){
			if(elt.className.indexOf('unselectable')==-1){
				var card = elt.innerText.trim();
				if(excluded.indexOf(card)==-1){
					cards.push(card);
				}
			}
		}
		
		var shelters = false;
		var colonyPlatin = false;
		
		for (elt of document.getElementsByClassName('full-card-name card-name')){
			if(["Platinum","Colony"].indexOf(elt.innerText.trim()) !=-1){
				colonyPlatin = true;	
			}
		}
		
		if(document.getElementsByClassName('game-log')[0].innerText.indexOf("Hovel")!=-1){
			shelters = true;
		}
		
		cards = new Set(cards);

		return {
			kingdomCards: Array.from(cards),
			colonyPlatin: colonyPlatin,
			shelters: shelters
		}
	}catch(e){}
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if(message.action == "loadGame"){
		// Load game as a bot game
		loadGame(message.gameID);
	}else if(message.action == "getLogFromContent"){
		// get log information
		chrome.runtime.sendMessage({
			action: "getLog",
			domLog: getGameLog(message.kingdom)
		});
	}
});