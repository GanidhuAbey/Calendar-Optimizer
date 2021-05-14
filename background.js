//chrome.identity.getAuthToken({ interactive: true });

var feeds = {};
var duedate;
var current;

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'

feeds.events = [];
feeds.newEvents = [];

feeds.requestInteracticeAuthToken = function() {
    duedate = new Date(duedate);
    console.log(duedate);
    console.log(current);

    chrome.identity.getAuthToken({interactive: true}, function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        feeds.addEvents();
        feeds.fetchEvents();

        //feeds.fetchEvents();
    })
}

/*
feeds.fetchEvents = function() {
    console.log(feeds.ids);
    //fetch events of all calendars
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        var j;
        console.log(feeds.ids[0]);
        for (j = 0; j < feeds.ids.length; j++) {
            fetch(feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.ids[j])), {
                headers: {
                    'Authorization': 'Bearer ' + token,
                }
            })
            .then(response => response.json())
            .then(data => console.log(data));

            console.log("hi");
        }
        console.log('5');
    });
    console.log('6');
}
*/


feeds.fetchEvents = function() {
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        awaitGetData(feeds.CALENDAR_LIST_API_URL_, token)
            .then(data => {
                var i;
                for (i = 0; i < data.items.length; i++) {
                    var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(data.items[i].id));
                    var params = {timeMax: duedate.toISOString(), timeMin: current.toISOString()}
                    url = url + new URLSearchParams(params);
                    console.log(url);
                    awaitGetData(url, token)
                        .then(eventData => {
                            console.log(eventData);
                        });
                }
                //console.log(feeds.events);
            });

        //console.log(Object.keys(feeds.ids));


        //console.log(feeds.test_array);
        /*
        var j;
        for (j = 0; j < 3; j++) {
            //console.log(feeds.ids[0]);
            awaitGetData(feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.ids[j])), token)
                .then(data => {
                    console.log(data);
                });
        }
        */
    })
}

async function awaitGetData(url = '', token) {
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    })

    return response.jso
    return event;n();
}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "sign_in" ) {
        current = new Date();
        duedate = request.duedate;
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
