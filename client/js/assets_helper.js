module.exports = {
    pathFor: function(asset) {
        return (chrome && chrome.extension) ? chrome.extension.getURL(asset) : asset;
    }
};
