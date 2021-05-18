//this javascript file will send the due date and time required data from the user
//to the storage, where it will be acessed by the background.js file.

var currentTime = new Date();
var notificationTime;
var notificationEvent;

var show_notifications = false;

var nextNotificationTime = 3.6e+6;

document.getElementById('button').addEventListener("click", function() {
    chrome.runtime.sendMessage({"message": "sign_in", "duedate": Date.parse(document.getElementById('due').value), "requiredTime": document.getElementById('timeNeeded').value});
});
//Date.parse(document.getElementById('due').value)

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "notification" ) {
        notificationEvent = request.event;

        nextNotificationTime = 3.6e+6;

        notificationTime = new Date(notificationEvent.start.dateTime);
        show_notifications = true;
        notificationCheck();
    }
  }
);


function notificationCheck() {
    if (show_notifications && currentTime.getTime() >= notificationTime.getTime()) {
        alert("notification recieved")
        chrome.runtime.sendMessage({"message": "made_it", "notif": notificationEvent});
        show_notifications = false;
    }
    if ((notificationTime.getTime() - currentTime.getTime()) < nextNotificationTime) {
        nextNotificationTime = notificationTime.getTime() - currentTime.getTime() + 1000;
    }
    currentTime = new Date();

    window.setInterval(notificationCheck, nextNotificationTime);
}
