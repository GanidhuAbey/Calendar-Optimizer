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
    var events = [];
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        var calList = []
        calList = await GetData(feeds.CALENDAR_LIST_API_URL_, token);
        //console.log(calList.items.length);

        var k;
        for (k = 0; k < calList.items.length; k++) {
            feeds.calendarIds.push(calList.items[k].id);
        }

        //console.log(feeds.calendarIds);

        var i;
        for (i = 0; i < feeds.calendarIds.length; i++) {
            var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.calendarIds[i]));
            var params = {singleEvents: true, timeMax: duedate.toISOString(), timeMin: current.toISOString()}
            url = url + new URLSearchParams(params);

            var eventData = await GetData(url, token);
            var j;
            for (j = 0; j < eventData.items.length; j++) {
                feeds.events.push(eventData.items[j]);
            }
        }

        console.log(feeds.events);
    });
}

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
Description: Creates an two dimensional array organaized by days and in each day their Datetime obj
Parameters:none
Returns: freeTimeArray
SideEffects: none
Globals Used: ?
Notes: NOT COMPLETE
========================================================*/

feeds.createFreetimeArr = function(){
    var eventsarr = [];//testing
    var freetime = [];

    var currentTimeOfDay;
    var numOfEvents;
    var counter;

    currentTimeOfDay = START_OF_DAY;

    var i;
    for(i = 0; i < eventsarr.length; i++){
        numOfEvents = eventsarr[i].length;

        var j;
        for(j = 0; j < numOfEvents - 1; j++){

              var obj = {
                  'startTime' : currentTimeOfDay;
                  'endTime' : eventarr[j].startTime;
              };
              freetime[counter].push(obj);

              currentTimeOfDay = eventarr[counter].endTime;
              counter += 1;

        }

        var obj = {
            'startTime' : currentTimeOfDay;
            'endTime' : END_OF_DAY;
        };
        freetime[counter].push(obj);


    }


}






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

feeds.createEvent = function(summary = '', startDate, endDate){
    var event = {// Calendar api event: https://developers.google.com/calendar/v3/reference/events#resource-representations
      'summary' : summary,
      'start': {'dateTime' : startDate.toISOString()},
      'end': {'dateTime' : endDate.toISOString()},
    };
    return event;

}

/*========================================================
Description: Creates a new calendar event.
Parameters: Name of the event
Returns: An Event variable
SideEffects: none
Globals Used: duedate
Notes: *Just a testing function for right now
========================================================*/
/*
feeds.createEventList = function(){
    var hourPer = [];//testing
    var freetime =[];//testing

    var i;
    for(i = 0; i < freetime.length; i++){
          var timeInDay = hourPer[i];
          var j;
          for(j = 0; j < freetime[i].length; j++){
                var startDate = freetime[j].startDate;
                var endDate = freetime

          }

    }



}
*/
