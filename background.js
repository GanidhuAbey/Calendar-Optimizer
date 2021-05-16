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
        console.log(events);
        freetime = createFreetimeArr(events);

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

//converts freetime array to hours
function convertToHours() {

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
  //Variables To be set Gloabally
    var gap;
    gap = 0 * 60000;// 15 mins gap break after event in milliseconds
    var start_of_day = new Date();
    start_of_day.setHours(8);
    start_of_day.setMinutes(0);
    start_of_day.setSeconds(0);
    var end_of_day = new Date();
    end_of_day.setHours(21);
    end_of_day.setMinutes(0);
    end_of_day.setSeconds(0);



    var freetime = [];
    //Filling in the free time array with arrays
    var i = 0;
    for(i = 0; i < eventsArr.length; i++){
      freetime.push([]);
    }

    //variables used in the function
    var currentTimeOfDay;
    var numOfEvents;
    var dateObj;
    var endTime;

    var i;
    for(i = 0; i < eventsArr.length; i++){


        currentTimeOfDay = new Date(start_of_day);

        numOfEvents = eventsArr[i].length;

        var j;
        for(j = 0; j < numOfEvents; j++){

              endTime = new Date(eventsArr[i][j].start.dateTime);//change .startTime


                dateObj = {
                    'startTime' : (new Date(currentTimeOfDay)),
                    'endTime' : (new Date(endTime)),
                };
                if((endTime.getTime() - currentTimeOfDay.getTime()) > 0)
                freetime[i].push(dateObj);


              //Introducing X min break between events
              currentTimeOfDay = new Date(eventsArr[i][j].end.dateTime);//change .endTime
              currentTimeOfDay.setTime(currentTimeOfDay.getTime() + gap);
              currentTimeOfDay = new Date(currentTimeOfDay);

        }


              dateObj = {
                  'startTime' : (new Date(currentTimeOfDay)),
                  'endTime' : end_of_day,
              };
              if((end_of_day.getTime() - currentTimeOfDay.getTime()) > 0)
              freetime[i].push(dateObj);

              //Adding days in milliseconds to start and end of day value
              start_of_day = new Date(start_of_day.getTime() + 8.64e+7);
              end_of_day = new Date(end_of_day.getTime() + 8.64e+7);

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

feeds.pushEvents = function(){


    chrome.identity.getAuthToken({interactive: false}, function(token){// Get authtoken and calls function(token)
      var newEvents = [];
      newEvents = feeds.createEventList();//calls createvent func with name 'Dinner Sap'

      var i;
      for(i = 0; i < newEvents.length; i++){
          fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', //sending a request to the google calendar api, primary user calendar
          {
              method: 'POST', // Sends the information in to the api
              headers: {
                  'Authorization': 'Bearer ' + token, //type of permissions + authorization token for the api
              },
              body: JSON.stringify(newEvents[i]), // Data being send to the api

          })
          .then(data => console.log(data)); // log the sent request in the terminal
      }
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
    var newEvent = {// Calendar api event: https://developers.google.com/calendar/v3/reference/events#resource-representations
      'summary' : summary,
      'start': {'dateTime' : startDate.toISOString()},
      'end': {'dateTime' : endDate.toISOString()},
    };
    return newEvent;

}

/*========================================================
Description: Creates a  list of calendar events.
Parameters: ?
Returns: List of Events
SideEffects: ?
Globals Used: none
Notes: ?
========================================================*/

feeds.createEventList = function(){
    var hourPer = [];//testing
    var freetime =[];//testing

    var newEvents = [];

    var timeInDay;
    var startTime;
    var endTime;
    var gap;
    var name = 'dueDate Event'; //has to be a parameter
    var newEvent;


    var i;
    for(i = 0; i < freetime.length; i++){
          timeInDay = hourPer[i];

          var j;
          while(timeInDay > 0){
                startTime = new Date(freetime[i][j].startTime);
                endTime = new Date(freetime[i][j].endTime);

                gap = endTime.getTime() - startTime.getTime();


                if(gap <= timeInDay){
                    newEvent = feeds.createEvent(name, startTime, endTime);
                }
                else{
                    endTime = new Date(startTime.getTime() + timeInDay);
                    newEvent = feeds.createEvent(name, startTime, endTime);
                    gap = timeInDay

                }

                newEvents.push(newEvent);
                timeInDay -= timeInDay - gap;

          }

    }

    return newEvents;

}





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
