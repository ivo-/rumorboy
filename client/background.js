(function() {
    chrome.browserAction.onClicked.addListener(function (tab) {
        chrome.tabs.sendMessage(tab.id, {type: 'click'}, function(response) {
            var iconPath = response.activeIcon ? 'active.png' : 'inactive.png';

            chrome.browserAction.setIcon({
                path: 'images/' + iconPath,
                tabId: tab.id
            });
        });
    });
})();
