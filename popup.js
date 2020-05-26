var myPort

function saveData(data) {
	try{
		console.log("Saving data: "+data);
		var fileName = "DominionLog_" + data.match(/#\d+/).toString() + ".txt"; 
		var a = document.createElement("a");
		document.body.appendChild(a);
		a.style = "display: none";

		var json = JSON.stringify(data),
			blob = new Blob([data], {type: "text/plain;charset=utf-8"}),
			url = window.URL.createObjectURL(blob);
		a.href = url;
		a.download = fileName;
		a.click();
		window.URL.revokeObjectURL(url);
		console.log("Log saved");
		document.getElementById('info').innerText = "Log Saved To Download Folder.";
	}catch(e){
		console.log("nothing to save");
		document.getElementById('info').innerText = "No Log To Download";
	}
}

function copyTextToClipboard(text) {
  if(text.length > 10){
	  var textArea = document.createElement("textarea");

			console.log("copying data: "+text);
	  // Place in top-left corner of screen regardless of scroll position.
	  textArea.style.position = 'fixed';
	  textArea.style.top = 0;
	  textArea.style.left = 0;

	  // Ensure it has a small width and height. Setting to 1px / 1em
	  // doesn't work as this gives a negative w/h on some browsers.
	  textArea.style.width = '2em';
	  textArea.style.height = '2em';

	  // We don't need padding, reducing the size if it does flash render.
	  textArea.style.padding = 0;

	  // Clean up any borders.
	  textArea.style.border = 'none';
	  textArea.style.outline = 'none';
	  textArea.style.boxShadow = 'none';

	  // Avoid flash of white box if rendered for any reason.
	  textArea.style.background = 'transparent';

	  textArea.value = text;

	  document.body.appendChild(textArea);
	  textArea.focus();
	  textArea.select();

	  try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'Successful' : ' Not Successful';
		console.log('Copying text command was ' + msg);
		document.getElementById('info').innerText = "Copying Log To Clipboard was " + msg + ".";
	  } catch (err) {
		console.log('Oops, unable to copy');
		document.getElementById('info').innerText = "Error: Copying Log To Clipboard was Not Successful.";
	  }

	  document.body.removeChild(textArea);
  }else{
	  document.getElementById('info').innerText = "No Log To Copy";
  }
}

function deleteSelectedLog(){
	
	var previousGames = document.getElementById('previousGames');;
	if(previousGames.length>0){
		var delGameID = previousGames.options[previousGames.selectedIndex].value;
		
		chrome.storage.local.remove(delGameID, function(){
			myPort.postMessage({request: "deleteLog", gameID: delGameID});
			for(i=previousGames.length-1; i>=0; i--){
				previousGames.remove(i);
			}
			chrome.storage.local.get(null, function(items) {
				var allKeys = Object.keys(items);
				for(elt of allKeys){
					
				console.log("after deleted Log key: \""+elt+"\"")
					if(/#\d+/.test(elt)){
						var el = document.createElement("option");
						el.textContent = elt;
						el.value = elt;
						console
						previousGames.appendChild(el);
					}
				}
				console.log("load Last Log")
				try{
					loadLastLog();
				}catch(e){
					message.innerHTML="";
					console.log("error loading log, probably no log file saved");}
			});
			
		});
	}else{
		 document.getElementById('info').innerText = "No Log To Delete";
	}
}

function loadLastLog(){
	var previousGames = document.getElementById('previousGames');
	console.log(previousGames.length-1);
	var lastGameID = previousGames.options[0].value;
	if(/#\d+/.test(lastGameID)){
		chrome.storage.local.get(lastGameID,function(result){
			message.innerHTML = result[Object.keys(result)[0]];
		});
	}else{
		console.log("no Log available");
		info.innerText = "No Log of a Current Game Available.";
		message.innerHTML = "";
	}
}

function onWindowLoad() {
	try{
		var message = document.getElementById('message');
		var info = document.getElementById('info');
		var previousGames = document.getElementById('previousGames');
		var downloadBtn = document.getElementById('downloadLog');
		var copyBtn = document.getElementById('copyLog');
		//____________________________________________________________
		//
		//Load previous games into the popup option selector 
		//____________________________________________________________
		
		chrome.storage.local.get(null, function(items) {
			var allKeys = Object.keys(items);
			for(elt of allKeys){
				if(/#\d+/.test(elt)){
					var el = document.createElement("option");
					el.textContent = elt;
					el.value = elt;
					try{
						previousGames.appendChild(el);
					}catch(e){}
				}
			}
		});
		
		previousGames.addEventListener("change", function(){
			console.log(typeof this.value);
			chrome.storage.local.get(this.value,function(result){
				message.innerHTML = result[Object.keys(result)[0]];
				
			});
				
		});
		
		
		//____________________________________________________________
		//____________________________________________________________
		
		// Interaction with background script
		myPort = chrome.runtime.connect({name:"port-from-cs"});
		myPort.postMessage({request: "getFullLog"});
		myPort.onMessage.addListener(function(m) {
			console.log("In popup script, received message from background script: ");
			
			dominion_log = m.log;
			
			message.innerHTML = dominion_log;
			console.log("case closed");
			var game_over = m.timeout;
			console.log(game_over);
			var gameID = "";
			try{
				gameID = dominion_log.match(/#\d+/).toString();
			}catch(e){}
			var result = "DominionLog_" + gameID + ".txt"; 
			var found = false;
			//Select the current game from the dropdown menu.
			for(i = 0; i< previousGames.length; i++){
				if(gameID === previousGames[i].value){
					previousGames.selectedIndex = i;
					found = true;
					break;
				}
			}
			if(!found){
				console.log("Log not listed");
				var game = {};
				if(/#\d+/.test(gameID)){
					game[gameID] = dominion_log;
					chrome.storage.local.set(game, function() {
						console.log('Log saved locally');
					});
				
					var el = document.createElement("option");
					el.textContent = gameID;
					el.value = gameID;
					previousGames.appendChild(el);
					previousGames.selectedIndex = previousGames.length - 1;
				}
				
			}
			console.log("log: \""+dominion_log+"\"");
			if(dominion_log.length>10){
				info.innerHTML="Loaded Log of Last/Current Game";
			}else{
				loadLastLog();
			}
		});
		
		document.getElementById('downloadLog').addEventListener('click',function(){saveData(message.innerText)});
		document.getElementById('copyLog').addEventListener('click',function(){copyTextToClipboard(message.innerText)});
		document.getElementById('deleteLog').addEventListener('click',function(){deleteSelectedLog()});
		document.getElementById('options').addEventListener('click',function() {
			if (chrome.runtime.openOptionsPage) {
				chrome.runtime.openOptionsPage();
			} else {
				window.open(chrome.runtime.getURL('options.html'));
			}
		});
	}catch(e){}

}

window.onload = onWindowLoad;
	
