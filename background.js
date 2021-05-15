//chrome.identity.getAuthToken({ interactive: true });

var duedate;
var current;

//will be set in user preferences
var START_DAY = 8;

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
        freetime = createFreetimeArr(events);
        console.log(events);
        console.log(freetime);
    });
}

function convertToDays(events) {
    //set start of current day
    var currentStart = current;
    currentStart = currentStart.setHours(START_DAY);

    //console.log(currentStart);

    var difference = Date.parse(duedate) - currentStart;
    difference = Math.ceil(difference/86400000); //convert miliseconds to days

    var allEvents = [];

    //populate allEvents
    var j;
    for (j = 0; j < difference; j++) {
        allEvents.push([]);
    }
    //console.log(difference);

    var i;
    for (i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventDay = new Date(Date.parse(currentEvent.start.dateTime));
        eventDay = eventDay.setHours(8);
        eventDay = eventDay - currentStart;
        eventDay = Math.ceil(eventDay/86400000); //convert miliseconds to days

        //console.log(eventDay);
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
        duedate = request.duedate + 25200000; //add 7 hourse
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

function createFreetimeArr(eventsArr){
    var gap = 15 *  60000; // 15 mins gap break after event in milliseconds
    var freetime = [];
    var i = 0;
    for(i = 0; i < eventsArr.length; i++){
      freetime.push([]);
    }

    var currentTimeOfDay;
    var numOfEvents;
    var dateObj;
    var endTime;


    start_of_day = "8:00am";
    end_of_day = "9:00pm";

    currentTimeOfDay = start_of_day;


    var i;
    for(i = 0; i < eventsArr.length; i++){
        numOfEvents = eventsArr[i].length;

        var j;
        for(j = 0; j < numOfEvents - 1; j++){
              endTime = new Date(eventsArr[j].startTime);//change .startTime

              dateObj = {
                  'startTime' : currentTimeOfDay,
                  'endTime' : endTime,
              };
              freetime[i].push(dateObj);

              //Introducing X min break between events
              currentTimeOfDay = new Date(eventsArr[j].endTime);//change .endTime
              currentTimeOfDay.setTime(currentTimeOfDay.getTime(); + gap);
              currentTimeOfDay = new Date(currentTimeOfDay);

        }

        dateObj = {
            'startTime' : currentTimeOfDay,
            'endTime' : end_of_day,
        };
        freetime[i].push(dateObj);
    }
    return freetime;
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




/*========================================================
Helper Functions
========================================================*/

function populateArr(length, type){
  var arr = [];
  var i = 0;
  for(i = 0; i < length; i++){
    arr.push(type);
  }
  return arr;

}
