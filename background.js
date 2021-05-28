//chrome.identity.getAuthToken({ interactive: true });

var duedate;//DueDate ENDS at 5 pm of that Day need to fix it
var current;


var timeNeeded;
var timeOfEvent = 0;
var timeAllocatedForProj = 0;
var eventsCollector = [];

//will be set in user preferences
var START_DAY = 0;

var feeds = {};

var counter = 0;
var globalcounter = 0;

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

        console.log("events", events);

        var freetime = createFreetimeArr(events);
        console.log("freetime", freetime);

        CreateEvenDistribution(freetime);
        console.log("eventsCollector", eventsCollector);

        console.log("freetime", freetime);
        feeds.pushEvents(eventsCollector);

        //var percentage = calculatePercentages(freetime);
        //console.log(percentage);

        //console.log("time", timeNeeded);
        //var allocation = allocateFreeTime(freetime, percentage);
        //console.log("allocation", allocation);

        //var newEventsList = createEventList(freetime, allocation);
        //console.log("newEventsList", newEventsList);


        /*
        var firstEvent = grabFirstEvent(newEventsList);

        //check that event was returned
        if (firstEvent != false) {
            timeOfEvent = new Date(firstEvent.start.dateTime);
            timeOfEvent.getTime();
        }

        chrome.runtime.sendMessage({"message": "notification", "timer": timeOfEvent})
        */

        console.log("Finished");
    });

}


function grabFirstEvent(newEventsList) {
    if (newEventsList.length > 0) {
        return newEventsList[0];
    }
    return false;
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
        //console.log(duedate);
        feeds.requestInteracticeAuthToken();
    }
  }
);

//TODO: send notification to user email.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "made_it" ) {
        console.log("notification should be sent from here to user email now")
    }
  }
);


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
function createFreetimeArr(eventsArr){

    //Variables To be set Gloabally
    var gap; // Take the abs of gap
    gap = 15 * 60000;// 15 mins gap break after event in milliseconds
    var start_of_day = new Date();
    var end_of_day = createDateVar(21,0,0);



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
    var timeForEventBlock = 30 * 60000; // 30 mins in milliseconds

    var newEvents = [];
    var gap;
    var timeInDay;
    var startTime;
    var endTime;
    var newEvent;
    var remainder = 0;

    var i;
    for(i = 0; i < freetime.length; i++){
          timeInDay = hourPer[i];


          var j = 0;
          while(timeInDay >= timeForEventBlock){
                startTime = new Date(freetime[i][j].startTime);
                endTime = new Date(freetime[i][j].endTime);

                gap = endTime.getTime() - startTime.getTime();

                while((gap - timeForEventBlock) >= 0 && timeInDay >= timeForEventBlock){
                    gap -= timeForEventBlock;

                    newEvent = feeds.createGapEvent(name, startTime, timeForEventBlock);
                    newEvents.push(newEvent);
                    startTime = new Date(startTime.getTime() + timeForEventBlock);

                    timeInDay -= timeForEventBlock;
                }

                //remainder += timeInDay;
                j += 1;

          }


    }

    return newEvents;

}

/*========================================================
Description: Even Distributes the 30 min time blocks
Parameters: freetime, hourPer
Returns: remainder
SideEffects: none
Globals Used: none
Notes: *Just a testing function for right now
========================================================*/
/*
function evenDistribution (freetime, hourPer){
    //Need to be parameters/globals:
    var timeForEventBlock = 30 * 60000; // 30 mins in milliseconds
    var current = new Date();
    var dayInBetween = duedate.getTime() - current.getTime();
    dayInBetween = Math.floor(dayInBetween/8.64e+7);

    var amtOfBlocks = Math.floor(timeNeeded/30);//

    var i;
    for(i = 0; i < amtOfBlocks; i++){
        if ((dayInBetween%2) != 0){//odd
            current = Math.floor(dayInBetween/2);
            push.(30 min block in to event arr);
        }
        else{//even
          current = Math.floor(dayInBetween/2);
          push.(30 min block in to event arr);
          current += 8.64e+7;

        }
    }

    return rem;
}
*/
/*===========================================================================================*/

function CreateEvenDistribution(freetime){
    timeAllocatedForProj = 0;
    var current = createDateVar(0, 0, 0);
    var daysInBetween = duedate.getTime() - current.getTime();
    // var worklist = [];
    daysInBetween = Math.floor(daysInBetween/8.64e+7);

    console.log(daysInBetween);
    while(timeAllocatedForProj < timeNeeded){
        evenDistributionRec (freetime, 0, daysInBetween);
        //workInProgressRec(freetime, 0, daysInBetween, 0);
    }
}

var worklist = [];
function evenDistributionRec(freetime, left, right){

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

    left = worklist[0].left;
    right = worklist[0].right;
    worklist.shift();
    evenDistributionRec(freetime, left, right);

}



function createEventBlock(freetime, index){
  //Need to be parameters/globals:
  var name = 'EvenDistrib Events'; // name of the event
  var tFEB = 30 * 60000; // 30 mins in milliseconds
  var gapBetweenEvents = 15 * 60000;

  var gap;
  var startTime;
  var endTime;
  var newEvent;


  var i;
  for(i = 0; i < freetime[index].length; i++){
              startTime = new Date(freetime[index][i].startTime);
              startTime = new Date(startTime.getTime() + gapBetweenEvents);
              endTime = new Date(freetime[index][i].endTime);

              gap = endTime.getTime() - startTime.getTime();

              if((gap - tFEB) >= 0){
                  newEvent = feeds.createGapEvent(name, startTime , tFEB);
                  eventsCollector.push(newEvent);

                  //startTime = new Date(startTime.getTime() + tFEB + gapBetweenEvents);
                  //freetime[index][i].startTime = startTime;

                  removeFreetime(freetime, index, i, newEvent);


                  return true;

              }

    }

    return false;
}


function removeFreetime(freetime, index1, index2, eventToAdd){

    var topHalf;
    var bottomHalf;

    var startTime = new Date(freetime[index1][index2].startTime);
    var endTime = new Date(freetime[index1][index2].endTime);

    var eventStartTime = new Date(eventToAdd.start.dateTime);
    var eventEndTime = new Date(eventToAdd.end.dateTime);

    //console.log(startTime);
    //console.log(eventEndTime);

    if(startTime.getTime() < eventStartTime.getTime()){
        freetime[index1][index2].endTime =  eventStartTime;

        bottomHalf = freetime[index1].slice(0, index2 + 1);
        topHalf = freetime[index1].slice(index2 + 1);

        var dateObj = {
            'startTime' : new Date(eventEndTime),
            'endTime' :  new Date(endTime),
        };

        bottomHalf.push(dateObj);
        freetime[index1] = bottomHalf.concat(topHalf);

        return true;

    }

    else if((startTime.getTime() == eventStartTime.getTime()) && (endTime.getTime() == eventEndTime.getTime())) {
        bottomHalf = freetime[index1].slice(0, index2);
        topHalf = freetime[index1].slice(index2 + 1);
        freeTime[index1] = bottomHalf.concat(topHalf);

        return true;
    }


    else if(startTime.getTime() == eventStartTime.getTime()){
        console.log("working");
        freetime[index1][index2].startTime =  new Date(eventEndTime);

        return true;
    }
    else if(endTime.getTime() == eventEndTime.getTime()){
        freetime[index1][index2].endTime =  new Date(eventStartTime);

        return true;
    }

    return false;

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
function sumArr(arr, len){
  var sum = 0;
  var i;
  for(i = 0; i < len; i++){
      sum += arr[i];
  }
  return sum;
}


/*========================================================
Work-in Progress functions
========================================================*/

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
