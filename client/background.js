(function() {
    chrome.browserAction.onClicked.addListener(function (tab) {
        chrome.tabs.sendMessage(tab.id, {type: 'click'}, function(response) {
            var iconPath = response.activeIcon ? 'icon.png' : 'other.png';

            chrome.browserAction.setIcon({
                path: iconPath,
                tabId: tab.id
            });
        });
    });
})();
