//this javascript file will send the due date and time required data from the user
//to the storage, where it will be acessed by the background.js file.

var currentTime = new Date();
var notificationTime = 0;

document.getElementById('button').addEventListener("click", function() {
    window.setInterval(notificationCheck, 5000);
    chrome.runtime.sendMessage({"message": "sign_in", "duedate": Date.parse(document.getElementById('due').value), "requiredTime": document.getElementById('timeNeeded').value});

});
//Date.parse(document.getElementById('due').value)

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "notification" ) {
        notificationTime = new Date(request.timer);
    }
  }
);

function notificationCheck() {
    if (currentTime.getTime() == notificationTime.getTime()) {
        chrome.runtime.sendMessage({"message": "made_it", "notif": notificationTime});
    }
    currentTime = new Date();
}
