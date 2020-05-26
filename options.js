
function clearAllLogs(){
	
	if(confirm("Are you sure? Thisa will delete all logs permanently from this computer")){
		console.log("before:");
		chrome.storage.local.get(null, function(items) {
			var allKeys = Object.keys(items);
			console.log(allKeys);
		});
		chrome.storage.local.clear(function(){
			console.log("after");
			chrome.storage.local.get(null, function(items) {
				var allKeys = Object.keys(items);
				console.log(allKeys);
			});
		});
	}
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('chrome-extensions').addEventListener('click', function() {
        chrome.tabs.update({ url: 'chrome://extensions' });
    });
});
document.getElementById('clearLogs').addEventListener('click',clearAllLogs);