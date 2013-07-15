var contextsManager = new ContextsManager();
var extensionsManager = new ExtensionsManager();
var iconAnimation;

function init() {
	iconAnimation = new IconAnimation({
		canvasObj: document.getElementById('canvas'),
		imageObj: document.getElementById('image'),
		defaultIcon: "icons/context.png"
	});

	if(CONFIG.get('firstRun') == 'yes') {
		openConfig();
	}
}

/*CONTEXT CHANGING*/
function reloadConfiguration(callback) {
	//show animation
	iconAnimation.animate("icons/context_cog.png");

	//reload list of all extensions and always enabled extensions
	extensionsManager.init(callback);
}

function enableAllExtensions() {
	reloadConfiguration(function() {
		extensionsManager.enableAllExtensions();
	});
}

function disableAllExtensions() {
	reloadConfiguration(function() {
		extensionsManager.disableAllExtensions();
	});
}

function changeContext(selectedContext) {
	reloadConfiguration(function() {
		//change context
		var context = contextsManager.getContext(selectedContext);

		if(context) {
			var allExtensions = extensionsManager.getExtensionsList();
			var enableList = [];
			var disableList = [];

			//check which extensions should be enabled and which should be disabled
			for(var i in allExtensions) {
				var extension = allExtensions[i];
				var found = false;

				//first, check if extension should be always enabled, if not, check if it is enabled in given context
				if(extensionsManager.isAlwaysEnabled(extension.id)) {
					found = true;
				} else {
					found = contextsManager.isInContext(context, extension);
				}

				if(found) {
					enableList.push(extension);
				} else {
					disableList.push(extension);
				}
			}

			//disable extensions first, then enable extensions
			extensionsManager.disableExtensions(disableList, function(){
				extensionsManager.enableExtensions(enableList);
			});
		}
	});
}

function activateContext(selectedContext) {
	reloadConfiguration(function() {
		//activate context
		var context = contextsManager.getContext(selectedContext);

		if(context){
			var allExtensions = extensionsManager.getExtensionsList();
			var enableList = [];

			//check which extensions should be enabled
			for(var i in allExtensions) {
				var extension = allExtensions[i];
				var found = false;

				//first, check if extension should be always enabled, if not, check if it is enabled in given context
				if(extensionsManager.isAlwaysEnabled(extension.id)) {
					found = true;
				} else {
					found = contextsManager.isInContext(context, extension);
				}

				if(found) {
					enableList.push(extension);
				}
			}

			//enable extensions
			extensionsManager.enableExtensions(enableList);
		}
	});
}

function deactivateContext(selectedContext) {
	reloadConfiguration(function() {
		//activate context
		var context = contextsManager.getContext(selectedContext);

		if(context){
			var allExtensions = extensionsManager.getExtensionsList();
			var disableList = [];

			//check which extensions should be disabled
			for(var i in allExtensions) {
				var extension = allExtensions[i];
				var found = false;

				//skip always enabled extensions
				if(extensionsManager.isAlwaysEnabled(extension.id)) {
					continue;
				} else {
					found = contextsManager.isInContext(context, extension);
				}

				if(found) {
					disableList.push(extension);
				}
			}

			//disable extensions
			extensionsManager.disableExtensions(disableList);
		}
	});
}

function configUpdated() {
	contextsManager.init();
	extensionsManager.init();

	iconAnimation.animate("icons/context_wrench.png");
}

/* NEW EXTENSION INSTALLATION */
var newestExtension;

function getNewestExtension() {
	return newestExtension;
}

chrome.management.onInstalled.addListener(function(extdata) {
	//if app support is disabled do nothing
	if(extdata.isApp && CONFIG.get('appsSupport') !== 'true') {
		return;
	}

	//check if extension exist in list of known extensions - hack to distinguish between extension installation and update
	if( extensionsManager.getExtensionData( extdata.id ) ) {
		return;//just an update
	}

	var contexts = contextsManager.getContextsList();

	if(contexts.length > 0 && CONFIG.get('newExtensionAction') == 'add_to_all') {
		for(var i in contexts) {
			contextsManager.addExtensionToContext( contexts[i], extdata.id );
		}

		contextsManager.save();
		configUpdated();
	} else if(CONFIG.get('newExtensionAction') == 'add_to_always_enabled') {
		extensionsManager.addExtensionToAlwaysEnabled( extdata.id );
		extensionsManager.save();
		configUpdated();
	} else if(contexts.length > 0 && CONFIG.get('newExtensionAction') == 'ask') {
		//looks like HTML notifications are being deprecated :( In chrome 30+ this doesn't work anymore.
		if(webkitNotifications.createHTMLNotification) {
			var notification = webkitNotifications.createHTMLNotification('notification.html');

			newestExtension = extdata;
			notification.show();
		}
	}
});

chrome.management.onUninstalled.addListener(function(extid) {
	//remove extension from all contexts
	var contexts = contextsManager.getContextsList();
	for(var i in contexts) {
		contextsManager.removeExtensionFromContext( contexts[i], extid );
	}
	contextsManager.save();

	//remove extension from always enabled extensions
	extensionsManager.removeExtensionFromAlwaysEnabled( extid );
	extensionsManager.save();

	//update list of known extensions
	extensionsManager.init();
});

//open extension config page
function openConfig() {
	chrome.tabs.getAllInWindow(null, function(tabs) {

		for(var i= 0, l=tabs.length; i<l;i++) {
			var tab = tabs[i];
			if(tab.url.indexOf(chrome.extension.getURL("options.html")) === 0) {
				chrome.tabs.update(tab.id, {
					url: chrome.extension.getURL("options.html"),
					selected: true
				});
				return;
			}
		}

		chrome.tabs.create({
			url:chrome.extension.getURL("options.html"),
			selected: true
		});
	});
}

$(document).ready(function() {
	init();
});