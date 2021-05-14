//chrome.identity.getAuthToken({ interactive: true });

var duedate;
var current;

var feeds = {};

var counter = 0;

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'

feeds.events = [];
feeds.calendarIds = [];
feeds.test_array = ["a", "b", "c"];

async function requestInteracticeAuthToken() {
    duedate = new Date(duedate);
    console.log(duedate);
    console.log(current);
    chrome.identity.getAuthToken({interactive: true}, async function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        fetchEvents();
    })
}

async function fetchEvents() {
    var events = [];
    await chrome.identity.getAuthToken({interactive: false}, async function(token) {
        awaitGetData(feeds.CALENDAR_LIST_API_URL_, token)
            .then(data => {
                var i;
                for (i = 0; i < data.items.length; i++) {
                    feeds.calendarIds.push(data.items[i].id);
                }
            })
            .then(async function() {
                //console.log(calendarIds.length);
                feeds.events = await recurseEvents(feeds.calendarIds.length, token, []);
                console.log(feeds.events);
            });

    });
}
//make calendarIds parameter of function
async function recurseEvents(size, token, event_list) {
    var currentSize = size - 1;

    if (currentSize == -1) {
        return;
    }

    var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.calendarIds[currentSize]));
    var params = {singleEvents: true, timeMax: duedate.toISOString(), timeMin: current.toISOString()}
    url = url + new URLSearchParams(params);

    await awaitGetData(url, token)
        .then(async function(eventData) {
            var j;
            for (j = 0; j < eventData.items.length; j++) {
                var eventsForCalendar = eventData.items[j];
                event_list.push(eventsForCalendar);
            }
            await recurseEvents(currentSize, token, event_list);
        });
    return event_list;
}

async function awaitGetData(url = '', token) {
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
        requestInteracticeAuthToken();
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
