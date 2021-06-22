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
        time.push(difference_sum);
    }

    return time;
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


function assignEventsToDay(freetimeInDay, eventsInDay, eventName='') {
    //sum up total time all events
    var newEventsInDay = [];
    var amtOfBlocks = eventsInDay.length;
    var timeForEventBlock = 30 * 60000; // 30 mins in milliseconds
    var totalFreeTime = freetimeInDay;
    var timeBlocks = freetimeInDay.length;

    //TODO: CAN PROBABLY FIT BOTH LOOPS IN ONE TO SAVE TIME.

    //sum up total time of freetime blocks
    var i;
    for (i = 0; i < freetimeInDay.length; i++) {
        newEventsInDay.push([]);
    }

    var j = 0;
    for (i = 0; i < amtOfBlocks; i++) {
        if (j >= timeBlocks) {
            j = 0;
        }
        var starttime = findFurthestSpace(totalFreeTime[j], newEventsInDay[j], timeForEventBlock);
        //console.log("starttime of where the event should be placed: ", starttime);
        var newEvent = feeds.createGapEvent(eventName, starttime, timeForEventBlock);
        newEventsInDay[j].push(newEvent);

        j++;
    }
    //convert newEventsInDay to single array
    var all_events = [];
    for (i = 0; i < newEventsInDay.length; i++) {
        var j;
        for (j = 0; j < newEventsInDay[i].length; j++) {
            all_events.push(newEventsInDay[i][j]);
        }
    }
    console.log(all_events)
    return all_events;
}

function sortToBlocks(eventsInDay, freetime) {
    var sorted_events = [];
    var i;
    for (i = 0; i < freetime.length; i++) {
        sorted_events.push([]);
    }

    for (i = 0; i < eventsInDay.length; i++) {
        var j;
        for (j = 0; j < freetime.length; j++) {
            var event_start = new Date(eventsInDay[i].start.dateTime);
            var freetime_start = new Date(freetime[j].startTime);
            var freetime_end = new Date(freetime[j].endTime);

            if (event_start.getTime() > freetime_start.getTime() && event_start.getTime() < freetime_end.getTime()) {
                sorted_events[j].push(eventsInDay[i]);
                break;
            }
        }
    }

    return sorted_events;
}

function findFurthestSpace(freeTimeBlock, eventsInBlock, timeForEventBlock) {
    if (eventsInBlock.length == 0) {
        return (new Date(freeTimeBlock.startTime));
    }

    //else we have to figure out where to put the event.

    //convert freetime into integer of 30 minute blocks
    var startBlock = new Date(freeTimeBlock.startTime);
    var endBlock = new Date(freeTimeBlock.endTime);

    var difference = endBlock.getTime() - startBlock.getTime();

    var spots = Math.floor(difference / timeForEventBlock);

    //convert event into integer represting place on spots.
    var eventSpots = [];
    var i;
    for (i = 0; i < eventsInBlock.length; i++) {
        var eventTime = new Date(eventsInBlock[i].start.dateTime)
        var eventSpot = Math.floor((eventTime.getTime() -  startBlock.getTime()) / timeForEventBlock);

        eventSpots.push(eventSpot);
    }

    var smallest = 0;
    var current_spot = 0;
    for (i = 0; i < spots; i++) {
        var j;
        var length = spots;
        for (j = 0; j < eventSpots.length; j++) {
            var length_event = Math.abs(eventSpots[j] - i);

            if (length_event < length) {
                length = length_event;
            }
        }
        if (length > smallest) {
            smallest = length;
            current_spot = i;
        }
    }

    //convert spot into a time.
    var start_event = current_spot * timeForEventBlock + startBlock.getTime();
    //start_event = start_event - timeForEventBlock;
    return (new Date(start_event));
}


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
function assignDayEvemts(freeTimeInDay, amtOfEvents) {
    chrome.storage.local.get(["start_time", "end_time"], async function(result) {
        var left = result.start_time.hour;
        var right = result.end_time.hour;

        var len = right - left;

        var current = Math.floor(len / 2);
        current += left;

        //check if event on current;
        checkEvent(current);
    });
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
        if(topHalf  && bottomHalf){
            freetime[index1] = bottomHalf.concat(topHalf);
        }else if(bottomHalf) freeTime[index1] = bottomHalf;
        else if(topHalf) freetime[index1] = topHalf;



        return true;
    }


    else if(startTime.getTime() == eventStartTime.getTime()){
        freetime[index1][index2].startTime =  new Date(eventEndTime);

        return true;
    }
    else if(endTime.getTime() == eventEndTime.getTime()){
        freetime[index1][index2].endTime =  new Date(eventStartTime);

        return true;
    }

    return false;

}
