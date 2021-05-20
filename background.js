chrome.alarms.create({ delayInMinutes: 0, periodInMinutes: 1 });

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

//will be set in user preferences
var START_DAY = 0;

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

        var freetime = createFreetimeArr(events, new Date());

        console.log("freetime", freetime);

        var percentage = calculatePercentages(freetime);
        //console.log(percentage);

        console.log("time", timeNeeded);
        var allocation = allocateFreeTime(freetime, percentage);
        console.log("allocation", allocation);

        var newEventsList = createEventList(freetime, allocation);
        console.log("newEventsList", newEventsList);
        //feeds.pushEvents(newEventsList);

        //makeNewNotif(newEventsList[newEventsList.length - 1]);


        allDeadLines.push(newEventsList);
        console.log("Finished");
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
        //console.log(duedate);
        feeds.requestInteracticeAuthToken();
    }
  }
);


/*========================================================
Description: listener that waits for popup.js to ask for a notification.
             (popup.js asks for notification only when event is overlappying with
             users current time.)
Parameters:none
Returns: none
SideEffects: none
Globals Used: none
Notes:- function does very little maybe possible to merge with sendNotificationToUser()
========================================================*/
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "made_it" ) {
        console.log("notification has been requested");
        sendNotificationToUser(request.notif);
    }
  }
);



/*========================================================
Description: creates a notification for user
Parameters:none
Returns: none
SideEffects: none
Globals Used: recentEvent
Notes:- maybe add another button to reschedule the event
========================================================*/
function sendNotificationToUser(recentEvent) {
    console.log("sending notification...");



    const title = "Event: ".concat(recentEvent.summary);
    const options = {
      body: 'Mark this event as in progress?',
      actions: [
          {
              action: 'complete-event',
              title: 'Working on Event...'
          },
          {
              action: 'reschedule',
              title: 'Reschedule Event'
          }
      ]
    };
    notifEvent = recentEvent;

    registration.showNotification(title, options);
}

/*========================================================
Description: listens for a response to desktop notification
Parameters:none
Returns: none
SideEffects: none
Globals Used: recentEvent
Notes:- do something when user ignores event (maybe resechdule the event for later)
========================================================*/
self.addEventListener('notificationclick', function(event) {
  const clickedNotification = event.notification;
  clickedNotification.close();
  makeNewNotif(notifEvent);

  // Do something as the result of the notification click
  switch (event.action) {
    case 'complete-event':
        break;
    case 'reschedule':
        rescheduleEvent(notifEvent);
        break;
  }
});


//grabs notification from here
chrome.alarms.onAlarm.addListener(() => {
    var currentTime = new Date();

    if (newEvent != 0 && newNotification) {
        console.log(newEvent.summary);
    }

    //may need to change how this is currently functioning
    if (newNotification != true && newEvent == 0) {
        //create dummy event that will never be selected.
        makeNewNotif({start: {dateTime: 0}});
        console.log("hello");
    }


    if (newNotification && currentTime.getTime() >= (new Date(newEvent.start.dateTime)).getTime()) {
        newNotification = false;
        sendNotificationToUser(newEvent);
    }
});

/*========================================================
Description: reschedule given event to next available time slot and delete event
             from current slot.
Parameters: recentEvent
Returns: none
SideEffects: none
Globals Used: recentEvent
Notes:- TODO: have to schedule events from the next day onwards, but the
              createFreetimeArr() does not have functionality for choosing the
              start time for when the time gaps are calculated.
========================================================*/
function rescheduleEvent(recentEvent) {
    //grab current day
    var day = new Date();
    day.setHours(0);
    day.setMinutes(0);
    day.setSeconds(0);
    day.setMilliseconds(0);

    day = new Date(day.getTime() + DAY_IN_MILLISECONDS);


    //calculate total time event takes
    var eventTime = (new Date(recentEvent.end.dateTime)).getTime() - (new Date(recentEvent.start.dateTime)).getTime();

    chrome.identity.getAuthToken({ interactive: false }, async function(token) {
        //iterate through each day one at a time till solution is found
        var cont = true;
        while (cont) {

            //add 1 day to current day to get next day.
            var newDay = day.getTime() + DAY_IN_MILLISECONDS;

            //console.log("start of day its searching", day);
            //console.log("end of day its searching: ", new Date(newDay));

            //make fetch call for that day.
            //TODO: change to grab events from all user calendars
            var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?';
            var params = {orderBy: "startTime", singleEvents: true, timeMax: (new Date(newDay)).toISOString(), timeMin: day.toISOString()};

            url = url + new URLSearchParams(params);

            var eventsInDay = await GetData(url, token);
            eventsInDay = filterMonthlyEvents(eventsInDay.items);



            //console.log("all events after filter: ", eventsInDay)

            //TODO: check for empty eventData (should already be covered though)

            //calculate freetime of that day

            //TODO: add user preferences, and change the '8' with whatever users
            //      start time is.
            var startOfNextDay = new Date(day.getTime());
            startOfNextDay.setHours(8);
            var newFreeTime = createFreetimeArr([eventsInDay], startOfNextDay);

            console.log("freetime of ", startOfNextDay, newFreeTime);
            //console.log("time gaps between events: ", newFreeTime);

            //iterate through time gaps, if freetime > event time, push event into freetime
            var i;
            for (i = 0; i < newFreeTime[0].length; i++) {
                var difference = (newFreeTime[0][i].endTime).getTime() - (newFreeTime[0][i].startTime).getTime();

                if (difference >= eventTime) {
                    var startOfTime = new Date((newFreeTime[0][i].startTime).getTime());
                    var endOfTime = new Date(startOfTime.getTime() + eventTime);

                    console.log("where event is scheduled: ", startOfTime, endOfTime);

                    var newEvent = feeds.createEvent(recentEvent.summary, startOfTime, endOfTime);


                    console.log("rescheduled event to: ", startOfTime, endOfTime);
                    feeds.pushEvents([newEvent]);

                    //delete current event now
                    await deleteEvent(recentEvent, token);

                    //found slot for event so get out of all loops now.
                    cont = false;
                    break;
                }
            }
            //else continue iterating through days
            day = new Date(newDay);
        }
    });
}

//TODO: change the calendar from primary to a parameter that user can enter
//      add documentation to function.
async function deleteEvent(eventToDelete, token) {
    var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + eventToDelete.id;
    //url.replace("{eventId}", eventToDelete.id);

    //console.log("event id: ", eventToDelete.id);

    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    })
}

/*========================================================
Description: grabs the most recent event coming up for the user and makes it the
             event that the notification system will wait on.
Parameters: none
Returns: newRecentEvent (new current event for the notification system to wait on)
SideEffects: none
Globals Used: none
Notes:- none
========================================================*/

function makeNewNotif(recentEvent) {
    chrome.identity.getAuthToken({ interactive: false }, async function(token) {
        //TODO: change method of grabbing time so its not dependent on users local
        //      time, maybe change all times to a single timezone so they are all same
        var currentTime = new Date();


        //change calendar from primary to grab all calendars later.
        var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?';
        var params = {orderBy: "startTime", singleEvents: true, timeMin: currentTime.toISOString()};

        url = url + new URLSearchParams(params);

        //TODO: filter events to remove day long events.
        var eventData = await GetData(url, token);

        newEvent;

        var cont = true;
        var k = 0;

        //TODO: add case for when their is no events in eventData.

        while (cont) {
            if (eventData.items[k].start.dateTime == recentEvent.start.dateTime) {
                k++
            }
            else {
                newEvent = eventData.items[k];
                cont = false;
            }
        }
        //console.log(newEvent.summary);
        //chrome.runtime.sendMessage("message": "notification", "event": recentEvent);
        //chrome.runtime.sendMessage({"message": "notification", "event": newEvent});
        newNotification = true;
    });
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
function createFreetimeArr(eventsArr, startDate){

    //Variables To be set Gloabally
    var gap; // Take the abs of gap
    gap = 15 * 60000;// 15 mins gap break after event in milliseconds
    var start_of_day = new Date(startDate.getTime());

    var end_of_day = new Date(startDate.getTime());

    //TODO: add user preferences to set where the event can be rescheduled.
    end_of_day.setHours(21);
    console.log("freetime from ", start_of_day, "to ", end_of_day);


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
