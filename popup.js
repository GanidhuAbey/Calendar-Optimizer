//TODO: add input box for user to give name to deadline events they are adding

var currentTime = new Date();
var notificationTime;
var notificationEvent;

var show_notifications = false;

var nextNotificationTime = 3.6e+6;

document.getElementById('submitEvents').addEventListener("click", function() {
    //TODO: currently the only way the settings are inputted is when a user adds their events, this should not be the case, as notifications
    //      run without having to add events first and they also need to know the user's start and end times to reschedule their events.

    //remove previous error
    var error = document.getElementById("error");
    error.textContent = "";

    //calculate maximum time from the length of time given
    var due_date = new Date(document.getElementById('due').value);
    var current_time = new Date();
    var max_time = due_date.getTime() - current_time.getTime();
    var user_time = document.getElementById('timeNeeded').value;

    user_time = parseInt(user_time, 10);

    //check if user has given name for events
    var event_name = document.getElementById('eventName');

    if (user_time == "") {
        error.style.color = "red";
        error.textContent = "please input how many hours of events you need!";
    }
    else if (isNaN(user_time)) {
        error.style.color = "red";
        error.textContent = "please input a valid number for time needed!";
    }
    else if (event_name.value == "") {
        error.style.color = "red";
        error.textContent = "please give a name for your events!";
    }
    else if (user_time * 3.6e+6 > max_time) {
        error.style.color = "red";
        error.textContent = "their isnt enough time in the day to allocate that many events!"
    }
    else {
        chrome.runtime.sendMessage({"message": "sign_in",
                                    "duedate": document.getElementById('due').value,
                                    "requiredTime": document.getElementById('timeNeeded').value,
                                    "deadlineName": event_name.value});
    }
});


document.getElementById('submitSettings').addEventListener("click", function() {
    var startOfDay = document.getElementById('startTime').value;
    var endOfDay = document.getElementById('endTime').value;

    var snoozeTime = document.getElementById('snoozeTime').value;

    if (startOfDay.value == "") {
        startOfDay = "08:00";
    }
    if (endOfDay.value == "") {
        endOfDay = "09:00";
    }
    if (snoozeTime.value == "") {
        snoozeTime = "5"
    }

    //set the default values to the updated version
    localStorage.setItem("startOfDay", startOfDay);
    localStorage.setItem("endOfDay", endOfDay);
    localStorage.setItem("snoozeTime", snoozeTime);

    chrome.runtime.sendMessage({"message": "settings",
                                "startTime": new String(startOfDay),
                                "endTime": new String(endOfDay),
                                "snoozeTime": snoozeTime});
})


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "error" ) {
        var error = document.getElementById("error");
        error.textContent = "not enough time in schedule to add events";
        error.style.color = "red";
    }
  }
);



//Date.parse(document.getElementById('due').value)
function openPage(evt, pageName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.display = "none";
  }
  document.getElementById(pageName).style.display = "block";
  evt.currentTarget.className += " active";
}

document.getElementById('openEvents').addEventListener("click", function() {
    var tabcontent = document.getElementsByClassName("tabcontent");
    var i;
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    var tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById("Events").style.display = "block";
});

document.getElementById('openSettings').addEventListener("click", function() {
    var tabcontent = document.getElementsByClassName("tabcontent");
    var i;
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    var tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById("Settings").style.display = "block";
});

window.onload = function() {
    var eventContent = document.getElementById("Events");
    if (eventContent.style.display == "none") {
        eventContent.style.display = "block";
    }



    var startOfDay, endOfDay, snoozeTime;

    //load in the saved settings
    if (localStorage.getItem("startOfDay")) {
        startOfDay = localStorage.getItem("startOfDay");
        document.querySelector("#startTime").value = startOfDay;
    }
    if (localStorage.getItem("endOfDay")) {
        endOfDay = localStorage.getItem("endOfDay");
        document.querySelector("#endTime").value = endOfDay;
    }
    if (localStorage.getItem("snoozeTime")) {
        snoozeTime = localStorage.getItem("snoozeTime");
        document.querySelector("#snoozeTime").value = snoozeTime;
    }

    //maybe not bests solution but on load we will just save the previous settings.
    /*
    chrome.runtime.sendMessage({"message": "settings",
                                "startTime": new String(startOfDay),
                                "endTime": new String(endOfDay),
                                "snoozeTime": snoozeTime});
    */
};
