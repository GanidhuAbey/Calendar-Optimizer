//just seperate what you need into a different file and include it here.
importScripts("lib/notification_system.js")

//TODO: save settings in chrome.storage.
chrome.alarms.create({ delayInMinutes: 0, periodInMinutes: 0.5 });

const DAY_IN_MILLISECONDS = 8.64e+7;


var allDeadLines = [];
var missedEvents = [];

var duedate;//DueDate ENDS at 5 pm of that Day need to fix it
var current;

//in hours
var timeNeeded;

var timeOfEvent = 0;

var notifEvent;

var newNotification = false;
var newEvent = 0;

var feeds = {};

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


/*========================================================
Description: central function that handles creating the deadline events and posting
            it to google api.
Parameters: none
Returns: none
SideEffects: none
Globals Used: duedate, current, timeNeeded, timeOfEvent, recentEvent, feeds
Notes:- none
========================================================*/
feeds.fetchEvents = function() {
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        //did this the easy way, hard way is to somehow make fetching the end_time
        //data asynchronus so that we dont have to work inside this get call.
        chrome.storage.local.get(["end_time"], async function(result) {
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


            events = filterMonthlyEvents(events);

            events = orderByDays(events, duedate);

            console.log("events", events);

            var freetime = createFreetimeArr(events, new Date(), result.end_time);

            console.log("freetime", freetime);

            var percentage = calculatePercentages(freetime);
            //console.log(percentage);

            console.log("time", timeNeeded);
            var allocation = allocateFreeTime(freetime, percentage);
            console.log("allocation", allocation);

            var newEventsList = createEventList(freetime, allocation);
            console.log("newEventsList", newEventsList);
            //feeds.pushEvents(newEventsList);


            allDeadLines.push(newEventsList);
            console.log("Finished");
        });
    });
}

/*========================================================
Description: filters events to remove events without a start or end time (these
            would be events that span an entire day like birthday events)
Parameters: newEventsList (1-dimensional array of all the new deadline events added)
Returns: newEventsList[0] or false (returns the first element in the given list
                                    or false if that event does not exist)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/
function grabFirstEvent(newEventsList) {
    if (newEventsList.length > 0) {
        return newEventsList[0];
    }
    return false;
}

/*========================================================
Description: filters events to remove events without a start or end time (these
            would be events that span an entire day like birthday events)
Parameters: events (1- dimensional array presenting all the events from users
                    current time to the due date the user set.)
Returns: filteredEvents (1-dimensional array that filters out events without a
                        start or end time.)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/
function filterMonthlyEvents(events) {

    var filteredEvents = [];

    var i;
    for (i = 0; i < events.length; i ++) {
        if (Object.keys(events[i].start)[0] == "dateTime") {
            filteredEvents.push(events[i]);
        }
    }
    return filteredEvents;
}

/*========================================================
Description: orders the list of events into individual days
Parameters: events (1-dimensional array presenting all the events from users
                    current time to the due date the user set.)
Returns: allEvents (2-dimensional array that organizes the events into individual
                    days)
SideEffects: none
Globals Used: duedate, current,
Notes:- none
========================================================*/
function orderByDays(events, endDate) {
    var allEvents = [];


    //set start of current day
    var currentStart = new Date(current);
    currentStart.setHours(0);
    currentStart.setMinutes(0);
    currentStart.setSeconds(0);
    currentStart.setMilliseconds(0);

    var difference = (endDate).getTime() - currentStart.getTime();
    difference = Math.ceil(difference/86400000); //convert miliseconds to days

    //console.log(difference);

    //populate allEvents
    var j;
    for (j = 0; j < difference; j++) {
        allEvents.push([]);
    }

    //console.log(allEvents.length);

    var i;
    for (i = 0; i < events.length; i++) {
        var currentEvent = events[i];
        var eventDay = new Date(currentEvent.start.dateTime);

        //console.log(eventDay);

        eventDay.setHours(0);
        eventDay.setMinutes(0);
        eventDay.setSeconds(0);
        eventDay.setMilliseconds(0);



        eventDay = eventDay.getTime() - currentStart.getTime();
        eventDay = Math.ceil(eventDay/86400000); //convert miliseconds to days


        allEvents[eventDay].push(currentEvent);
    }

    return allEvents;
}

/*========================================================
Description: calculates the amount of freetime a user has in days as a percentage
Parameters: freetime (2-dimensional array of freetime slots in users calendar per day)
Returns: percentage (1-dimensional array presenting amount of freetime in day as %)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/
function calculatePercentages(freetime) {
    var time = convertToMiliseconds(freetime);
    //console.log(time);

    var average = calculateAverage(time);

    var percentage = [];

    var i;
    for (i = 0; i < time.length; i++) {
        percentage.push(time[i] / average);
    }

    return percentage;
}

/*========================================================
Description: allocates user freetime and returns array of hours needed each day
Parameters: freetime (2-dimensional array of freetime slots in users calendar per day)
            percentage (1-dimensional array presenting amount of freetime in day as %)
Returns: allocate (the amount of time that needs to be allocated for the deadline
                  event in users calendar)
SideEffects: none
Globals Used: timeNeeded
Notes:- none
========================================================*/
function allocateFreeTime(freetime, percentage) {
    //convert freetime array to hours
    var milliseconds = convertToMiliseconds(freetime);

    var timeRequired = (timeNeeded * 3.6e+6) / milliseconds.length;

    //apply percentages to each day
    var allocate = [];
    var i;
    for (i = 0; i < milliseconds.length; i++) {
        allocate.push((timeRequired * percentage[i]));
    }

    //return new array
    return allocate;
}



/*========================================================
Description: calculate the average value from an array of numbers. (sum array and divide by length)
Parameters: time (1-dimensional array representing total freetime in day in milliseconds)
Returns: sum / size (average of the given array)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/
function calculateAverage(time) {
    var sum = 0;
    var size = time.length;
    var i;
    for (i = 0; i < size; i++) {
        sum += time[i];
    }

    return sum / size;
}

/*========================================================
Description: converts the time slots from freetime array to miliseconds
Parameters: freetime (2-dimensional array of freetime slots in users calendar per day)
Returns: time (1-dimensional array representing total freetime in day in milliseconds)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/
function convertToMiliseconds(freetime) {
    var time = [];

    var i;
    for (i = 0; i < freetime.length; i++) {
        var difference_sum = 0
        var j;
        for (j = 0; j < freetime[i].length; j++) {
            difference_sum += (freetime[i][j].endTime).getTime() - (freetime[i][j].startTime).getTime();
        }
        time.push(difference_sum / 3.6e+6);
    }

    return time;
}


/*========================================================
Description: asynchronus function to make fetch request,
             currently only handles GET request
Parameters:url (a url that the fetch request is making a request to)
           token (the required google api token given from user)
Returns: none
SideEffects: none
Globals Used: none
Notes:- need to implement a more generalized version allowing for POST requests
========================================================*/
async function GetData(url = '', token) {
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    })
    const data = await response.json();
    return data;
}



/*========================================================
Description: listens for user request to create new deadline events.
Parameters:none
Returns: none
SideEffects: none
Globals Used: current, duedate, timeNeeded
Notes:- none
========================================================*/
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "sign_in" ) {
        current = new Date();
        duedate = request.duedate + 25200000; //add 7 hours
        timeNeeded = request.requiredTime;

        feeds.requestInteracticeAuthToken();
    }
  }
);

//TODO: Add some indicator on the settings page to indicate that settigns have been
//     updated.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "settings" ) {
        //console.log("the start_time is: ", result);
        const start_time = setTimeOfDay(request.startTime);
        chrome.storage.local.set({start_time});

        const end_time = setTimeOfDay(request.endTime);
        chrome.storage.local.set({end_time});

        const snoozeTime = request.snoozeTime;
        console.log("the updated snooze is: ", snoozeTime);
        chrome.storage.local.set({snoozeTime});

        console.log("settings updated");
    }
  }
);



function setTimeOfDay(timeOfDay, start) {
    var startArray = timeOfDay.split(":");

    var hour = parseInt(startArray[0], 10);
    var minute = parseInt(startArray[1], 10);

    var dateTime;

    dateTime = {
        hour: hour,
        minute: minute,
    };

    return dateTime;
}


/*========================================================
Description: Creates an two dimensional array organaized by days and in each day their Datetime obj
Parameters:none
Returns: freeTimeArray
SideEffects: none
Globals Used: none
Notes:- I have to fix the gap option in this function
      - Need to add an option where on the day of adding an event, how much of a gap there should be till assigned events on that day
      - Fix the filling array helper Function
      - make gap, start_of_day, end_of_day global variables
========================================================*/
function createFreetimeArr(eventsArr, startDate, endDate){

    //Variables To be set Gloabally
    var gap; // Take the abs of gap
    gap = 15 * 60000;// 15 mins gap break after event in milliseconds
    var start_of_day = new Date(startDate.getTime());

    var end_of_day = new Date(startDate.getTime());

    end_of_day.setHours(endDate.hour);
    end_of_day.setMinutes(endDate.minute);


    //console.log("freetime from ", start_of_day, "to ", end_of_day);


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

        currentTimeOfDay = new Date(start_of_day.getTime());
        numOfEvents = eventsArr[i].length;

        var j;
        for(j = 0; j < numOfEvents; j++){

              endTime = new Date(eventsArr[i][j].start.dateTime);//change .startTime
              endTime.setTime(endTime.getTime() - gap);
              endTime = new Date(endTime); // to store as a date obj(COULD BE REMOVED)

                dateObj = {
                    'startTime' : (new Date(currentTimeOfDay)),
                    'endTime' : (new Date(endTime)),
                };
                if((endTime.getTime() - currentTimeOfDay.getTime()) > 0)
                freetime[i].push(dateObj);

              //Introducing X min break between events
              currentTimeOfDay = new Date(eventsArr[i][j].end.dateTime);//change .endTime
              currentTimeOfDay.setTime(currentTimeOfDay.getTime() + gap);
              currentTimeOfDay = new Date(currentTimeOfDay); // to store as a date obj(COULD BE REMOVED)
              }

          dateObj = {
              'startTime' : (new Date(currentTimeOfDay)),
              'endTime' : end_of_day,
          };
          if((end_of_day.getTime() - currentTimeOfDay.getTime()) > 0)
              freetime[i].push(dateObj);

          //Adding days in milliseconds to start and end of day value
          if(i == 0){
              start_of_day = createDateVar(8,0,0); // this should be set using a global variable
          }
          start_of_day = new Date(start_of_day.getTime() + 8.64e+7); // adding a day to start_of_day
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
Notes: Need to figure how to push a entire list
========================================================*/
feeds.createNewCalendar = function(newEventsList){


    chrome.identity.getAuthToken({interactive: false}, function(token){// Get authtoken and calls function(token)

      var i;
      for(i = 0; i < newEventsList.length; i++){
          fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', //sending a request to the google calendar api, primary user calendar
          {
              method: 'POST', // Sends the information in to the api
              headers: {
                  'Authorization': 'Bearer ' + token, //type of permissions + authorization token for the api
              },
              body: JSON.stringify(newEventsList[i]), // Data being send to the api

          })
          .then(data => console.log(data)); // log the sent request in the terminal
      }
    });

}

/*========================================================
Description: Adds an event in to the users calendar
Parameters:none
Returns:none
SideEffects: Adds event to the users Calendar
Globals Used: none
Notes: NOT COMPLETE
========================================================*/
feeds.pushEvents = function(newEventsList){


    chrome.identity.getAuthToken({interactive: false}, function(token){// Get authtoken and calls function(token)

      var i;
      for(i = 0; i < newEventsList.length; i++){
          fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', //sending a request to the google calendar api, primary user calendar
          {
              method: 'POST', // Sends the information in to the api
              headers: {
                  'Authorization': 'Bearer ' + token, //type of permissions + authorization token for the api
              },
              body: JSON.stringify(newEventsList[i]), // Data being send to the api

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
Description: Creates a new calendar event.
Parameters: Name of the event, startDate(Date Obj), timeOfEvent(date in milliseconds)
Returns: An Event variable
SideEffects: none
Globals Used: duedate
Notes: *Just a testing function for right now
========================================================*/
feeds.createGapEvent = function(summary = '', startDate, timeOfEvent){

    endDate = new Date(startDate.getTime() + timeOfEvent); //iff timeOfEvent is in miliseconds

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
function createEventList (freetime, hourPer){
    //Need to be parameters/globals:
    var name = 'Test Event'; // name of the event
    var timeOfEvent = 30 * 60000; // 30 mins in milliseconds

    var newEvents = [];
    var remainder = 0;
    var gap;
    var timeInDay;
    var startTime;
    var endTime;

    var newEvent;





    var i;
    for(i = 0; i < freetime.length; i++){
          timeInDay = hourPer[i];


          var j = 0;
          while(timeInDay > timeOfEvent){
                startTime = new Date(freetime[i][j].startTime);
                endTime = new Date(freetime[i][j].endTime);

                gap = endTime.getTime() - startTime.getTime();

                while((gap - timeOfEvent) >= 0){
                    gap -= timeOfEvent;

                    newEvent = feeds.createGapEvent(name, startTime, timeOfEvent);
                    newEvents.push(newEvent);
                    startTime = new Date(startTime.getTime() + timeOfEvent);

                    timeInDay -= timeOfEvent;
                }

                remainder += gap;
                j += 1;

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
function createDateVar(hours, minutes, seconds){
    date = new Date();
    if(hours != 'NaN')
    date.setHours(hours);
    if(minutes != 'NaN')
    date.setMinutes(minutes);
    if(seconds != 'NaN')
    date.setSeconds(seconds);

    return date;
}
function loadScript(scriptName) {
    var scriptEl = document.createElement('script');
    scriptEl.src = chrome.extension.getURL('lib/' + scriptName + '.js');
    //scriptEl.addEventListener('load', callback, false);
    document.head.appendChild(scriptEl);
}

//opens a new tab with the given url.
function openPage(newUrl) {
    chrome.tabs.create({url: newUrl});
}
