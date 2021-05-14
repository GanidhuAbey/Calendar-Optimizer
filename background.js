//chrome.identity.getAuthToken({ interactive: true });

var duedate;
var current;

var feeds = {};

var counter = 0;

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'


feeds.requestInteracticeAuthToken = function() {
    duedate = new Date(duedate);
    console.log(duedate);
    console.log(current);
    chrome.identity.getAuthToken({interactive: true}, async function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        feeds.fetchEvents();
    })
}

feeds.fetchEvents = function() {
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        var calList = [];
        var events = [];
        var calendarIds = [];
        calList = await GetData(feeds.CALENDAR_LIST_API_URL_, token);

        var k;
        for (k = 0; k < calList.items.length; k++) {
            calendarIds.push(calList.items[k].id);
        }

        var i;
        for (i = 0; i < calendarIds.length; i++) {
            var d = duedate.toISOString();
            var c = current.toISOString();

            var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(calendarIds[i]));
            var params = {orderBy: "startTime", singleEvents: true, timeMax: d, timeMin: c}
            url = url + new URLSearchParams(params);

            var eventData = await GetData(url, token);
            var j;
            for (j = 0; j < eventData.items.length; j++) {
                events.push(eventData.items[j]);
            }
        }
        events = convertToDays(events);
    });
}

function convertToDays(events) {
    var difference = Date.parse(duedate) - Date.parse(current);
    difference = Math.ceil(difference/86400000); //convert miliseconds to days

    var allEvents = [];

    //populate allEvents
    var j;
    for (j = 0; j < difference; j++) {
        allEvents.push([]);
    }

    var i;
    for (i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventDay = Date.parse(currentEvent.start.dateTime) - Date.parse(current);
        eventDay = Math.ceil(eventDay/86400000); //convert miliseconds to days

        allEvents[eventDay].push(currentEvent);
    }

    return allEvents;
}


//****function below does the same thing as function above but does not include blank arrays
//****to represent days with no events.

/*
//function converts one dimensional event array into 2-dimensional array based on days
function convertToDays(events) {
    var allEvents = [];
    var currentDay = current.getDate();

    var eventsForDay = [];
    var i;
    for (i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventDay = new Date(Date.parse(currentEvent.start.dateTime));
        eventDay = eventDay.getDate();

        if (currentDay == eventDay) {
            eventsForDay.push(currentEvent);
        }
        else {
            if (eventsForDay.length != 0) {
                allEvents.push(eventsForDay);
            }
            eventsForDay = [currentEvent];
            currentDay = eventDay;
        }
    }
    allEvents.push(eventsForDay);

    return allEvents;
}
*/


async function GetData(url = '', token) {
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    })
    const data = await response.json();
    return data;
}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "sign_in" ) {
        current = new Date();
        duedate = request.duedate;
        console.log(duedate);
        feeds.requestInteracticeAuthToken();
    }
  }
);

/*========================================================
Description: Adds an event in to the users calendar
Parameters:none
Returns:none
SideEffects: Adds event to the users Calendar
Globals Used: none
Notes: NOT COMPLETE
========================================================*/

feeds.addEvents = function(){

    chrome.identity.getAuthToken({interactive: false}, function(token){// Get authtoken and calls function(token)

      var eventToAdd = feeds.createEvent('Dinner sap');//calls createvent func with name 'Dinner Sap'

      fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', //sending a request to the google calendar api, primary user calendar
      {
          method: 'POST', // Sends the information in to the api
          headers: {
              'Authorization': 'Bearer ' + token, //type of permissions + authorization token for the api
          },
          body: JSON.stringify(eventToAdd), // Data being send to the api

      })
      .then(data => console.log(data)); // log the sent request in the terminal

    });

}

/*========================================================
Description: Creates a new calendar event.
Parameters: Name of the event
Returns: An Event variable
SideEffects: none
Globals Used: duedate
Notes: *Just a testing function for right now
========================================================*/

feeds.createEvent = function(summary = ''){
    var startDate = new Date(duedate);// Copies duedate -> startDate
    var newDate = new Date(duedate);

    var hour = startDate.getHours(); // return the hours in startDate in integer format -> hour
    newDate.setHours(hour + 1);// Sets the hours in newDate

    var event = {// Calendar api event: https://developers.google.com/calendar/v3/reference/events#resource-representations
      'summary' : summary,
      'start': {'dateTime' : startDate.toISOString()},
      'end': {'dateTime' : newDate.toISOString()},
    };

    return event;

}
