//chrome.identity.getAuthToken({ interactive: true });

var duedate;
var current;

var timeNeeded;

//will be set in user preferences
var START_DAY = 0;

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


        events = filterMonthlyEvents(events);

        events = orderByDays(events);

        //console.log(events);

        var freetime = createFreetimeArr(events);

        console.log(freetime);

        var percentage = calculatePercentages(freetime);
        //console.log(percentage);

        var allocation = allocateFreeTime(freetime, percentage);

        console.log(convertToMiliseconds(freetime));
        console.log(allocation);
    });
}


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


function orderByDays(events) {
    var allEvents = [];


    //set start of current day
    var currentStart = new Date(current);
    currentStart.setHours(0);
    currentStart.setMinutes(0);
    currentStart.setSeconds(0);
    currentStart.setMilliseconds(0);

    var difference = (duedate).getTime() - currentStart.getTime();
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

//allocates user freetime and returns array of hours needed each day
function allocateFreeTime(freetime, percentage) {
    //convert freetime array to hours
    var milliseconds = convertToMiliseconds(freetime);

    //calculate time needed to assign perday
    var days = duedate.getTime() - current.getTime();
    days = days / 8.64e+7;

    var timeRequired = (timeNeeded) / days;

    //apply percentages to each day
    var allocate = [];
    var i;
    for (i = 0; i < milliseconds.length; i++) {
        allocate.push((timeRequired * percentage[i]));
    }

    //return new array
    return allocate;
}

function calculateAverage(time) {
    var sum = 0;
    var size = time.length;
    var i;
    for (i = 0; i < size; i++) {
        sum += time[i];
    }

    return sum / size;
}

//converts freetime array to hours
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
        duedate = request.duedate + 25200000; //add 7 hours
        timeNeeded = request.requiredTime;
        console.log(timeNeeded);
        //console.log(duedate);
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
