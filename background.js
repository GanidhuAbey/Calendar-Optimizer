//just seperate what you need into a different file and include it here.
importScripts("lib/notification_system.js", "lib/duedate_system.js");

//TODO: save settings in chrome.storage.
chrome.alarms.create({ delayInMinutes: 1, periodInMinutes: 1 });

const DAY_IN_MILLISECONDS = 8.64e+7;


var allDeadLines = [];
var missedEvents = [];

var duedate;//DueDate ENDS at 5 pm of that Day need to fix it
var current;

//in hours
var timeNeeded;

var timeOfEvent = 0;
var timeAllocatedForProj = 0;
var eventsCollector = [];

var notifEvent;

var feeds = {};

var newNotification = false;
var newEvent = 0;

var counter = 0;
var globalcounter = 0;

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'


feeds.requestInteracticeAuthToken = function() {
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

            var freetime = createFreetimeArr(events, current, result.end_time);

            console.log("freetime", freetime);

            var percentage = calculatePercentages(freetime);
            //console.log(percentage);

            console.log("time", timeNeeded);
            var allocation = allocateFreeTime(freetime, percentage);
            console.log("allocation", allocation);

            var newEventsList = createEventList(freetime, allocation);

            var allEventsInDays = orderByDays(newEventsList, duedate);


            console.log("newEventsList", newEventsList);
            console.log("events seperated into days", allEventsInDays);

            var seperatedEvents = [];
            var i;
            for (i = 0; i < allEventsInDays.length; i++) {
                var eventsInDay = allEventsInDays[i];
                console.log("freetime of that day", freetime[i]);
                seperatedEvents.push(evenDistribution(freetime[i], eventsInDay));
            }

            console.log(seperatedEvents);

            for (i = 0; i < seperatedEvents.length; i++) {
                feeds.pushEvents(seperatedEvents[i]);
            }




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
        duedate = new Date(request.duedate); //add 7 hours
        duedate = new Date(duedate.getTime() + DAY_IN_MILLISECONDS);
        duedate.setHours(23);
        duedate.setMinutes(0);
        duedate.setSeconds(0);

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
feeds.pushEvents = async function(newEventsList){


    chrome.identity.getAuthToken({interactive: false}, async function(token){// Get authtoken and calls function(token)
      var i;
      for(i = 0; i < newEventsList.length; i++){
          var something = await postEvents(newEventsList[i], token);
      }
    });

}

async function postEvents(body, token) {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(body),
    })
    const data = await response.json();
    return true;
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
/*========================================================*/


function workInProgressRec(freetime, left, right, secondLeft){
    var bb, bt, tb, tt;
    var current, former;
    var len = (right - left);
    globalcounter += 1;

    var createEventSuccess;

    console.log("HowManyRec", globalcounter);

    if(timeAllocatedForProj >= timeNeeded){
        return;
    }
    if( len < 0){
        return;
    }

    if(timeAllocatedForProj === 0){

      if ((len%2) != 0){//even
          current = Math.floor(len/2);
          current += left;

          createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
          if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

          if(timeAllocatedForProj >= timeNeeded){
              return;
          }

          createEventSuccess = createEventBlock(freetime, current + 1); //push.(30 min block in to event arr at current - 1);
          if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

          left = left;
          right = current - 1;
          secondLeft = current + 2;

      }
      else{//odd

          current = Math.floor(len/2);
          current += left;
          console.log("formerdasd", current);

          createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
          if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

          left = left;
          right = current - 1;
          secondLeft = current + 1;



      }


    }


    else if ((len%2) != 0){//even
        current = Math.floor(len/2);
        former = Math.floor(len/2);
        current += left;
        former += secondLeft;
        console.log("former", former);

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, former + 1); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, current + 1); //push.(30 min block in to event arr at current - 1);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, former); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }



        left = left;
        right = current - 1;
        secondLeft  = current + 2;


    }
    else{//odd
        console.log("fb");
        current = Math.floor(len/2);
        former = Math.floor(len/2);
        current += left;
        former += secondLeft;

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, former); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        left = left;
        right = current - 1;
        secondLeft = current + 1;



    }

    workInProgressRec(freetime, left, right, secondLeft);


}




function mirrorBottomHalf(left, right){
  var i = 0;
  var lastElement = right;

  var mid = Math.floor(len/2);
  while(timeAllocatedForProj < timeNeeded){


      i += 1;
  }//end While




}


function evenDistributionRecczxcz (freetime, left, right, worklist){

    var bb, bt, tb, tt;
    var len = (right - left);

    var createEventSuccess;
    if(timeAllocatedForProj >= timeNeeded){
        return;
    }
    if( len < 0){
        return;
    }

    if ((len%2) != 0){//even
        current = Math.floor(len/2);
        current += left;

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, current + 1); //push.(30 min block in to event arr at current - 1);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        bb = left;
        bt = current - 1;
        tb = current + 2;
        tt = right


    }
    else{//odd
        current = Math.floor(len/2);
        current += left;

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        bb = left;
        bt = current - 1;
        tb = current + 1;
        tt = right;


    }

    var distB = {
        'left': bb,
        'right': bt,
    };
    var distT = {
        'left': tb,
        'right': tt,
    };
    worklist.push(distB);
    worklist.push(distT);

    evenDistributionRec(freetime, bb, bt, worklist);



}


//var worklist = [];
function evenDisRTest(freetime, left, right){
    console.log(left);
    console.log(right);

    var bb, bt, tb, tt;
    var len = (right - left);

    var createEventSuccess;
    if(timeAllocatedForProj >= timeNeeded){
        return;
    }
    if( len < 0){
        return;
    }

    if ((len%2) != 0){//even
        current = Math.floor(len/2);
        current += left;

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        if(timeAllocatedForProj >= timeNeeded){
            return;
        }

        createEventSuccess = createEventBlock(freetime, current + 1); //push.(30 min block in to event arr at current - 1);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        bb = left;
        bt = current - 1;
        tb = current + 2;
        tt = right


    }
    else{//odd
        current = Math.floor(len/2);
        current += left;

        createEventSuccess = createEventBlock(freetime, current); //push.(30 min block in to event arr at current);
        if(createEventSuccess) timeAllocatedForProj += 0.5; // adds 30 mins to timeAllocated

        bb = left;
        bt = current - 1;
        tb = current + 1;
        tt = right;


    }

    var distB = {
        'left': bb,
        'right': bt,
    };
    var distT = {
        'left': tb,
        'right': tt,
    };
    worklist.push(distB);
    worklist.push(distT);

    left = worklist[0].left
    right = worklist[0].right
    worklist.shift()
    evenDisRTest(freetime, left, right);
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
