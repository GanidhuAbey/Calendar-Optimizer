


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "notification" ) {
        notificationEvent = request.event;

        nextNotificationTime = 3.6e+6;

        console.log("hello");
        alert("hello");

        notificationTime = new Date(notificationEvent.start.dateTime);
        show_notifications = true;
        notificationCheck();
    }
  }
);

function notificationCheck() {
    if (show_notifications && currentTime.getTime() >= notificationTime.getTime()) {
        //alert("notification recieved")
        chrome.runtime.sendMessage({"message": "made_it", "notif": notificationEvent});
        show_notifications = false;
    }
    if ((notificationTime.getTime() - currentTime.getTime()) < nextNotificationTime) {
        nextNotificationTime = notificationTime.getTime() - currentTime.getTime() + 5000;
    }
    currentTime = new Date();

    window.setInterval(notificationCheck, nextNotificationTime);
}

//alert("something");
