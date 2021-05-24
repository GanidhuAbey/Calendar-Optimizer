

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
        if (eventData.items.length == 0) {
            return;
        }
        eventData = filterMonthlyEvents(eventData.items);

        //var freetime = createFreetimeArr([eventData], new Date());

        //console.log("freetime: ", freetime);

        var cont = true;
        var k = 0;

        //console.log(eventData);




        while (cont) {
            if (eventData[k].start.dateTime == recentEvent.start.dateTime) {
                k++
            }
            else {
                newEvent = eventData[k];
                newNotification = true;
                cont = false;
            }

            //give up on finding notification, there is none available.
            if (k >= eventData.length) {
                cont = false;
            }
        }
        //console.log(newEvent.summary);
        //chrome.runtime.sendMessage("message": "notification", "event": recentEvent);
        //chrome.runtime.sendMessage({"message": "notification", "event": newEvent});
    });
}


/*========================================================
Description: reschedule given event to next available time slot and delete event
             from current slot.
Parameters: recentEvent
Returns: none
SideEffects: none
Globals Used: recentEvent
Notes:
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
        chrome.storage.local.get(["start_time", "end_time"], async function(result) {
            var cont = true;
            while (cont) {
                //add 1 day to current day to get next day.
                var newDay = day.getTime() + DAY_IN_MILLISECONDS;

                console.log("start of day its searching", day);
                console.log("end of day its searching: ", new Date(newDay));

                //make fetch call for that day.
                var allEvents = [];
                var allIds = await grabCalendars(token);

                //add 1 day to current day to get next day.
                var newDay = day.getTime() + DAY_IN_MILLISECONDS;

                console.log("start of day its searching", day);
                console.log("end of day its searching: ", new Date(newDay));

                //make fetch call for that day.
                var allEvents = [];
                var allIds = await grabCalendars(token);

                console.log(allIds);


                var i;

                for (i = 0; i < allIds.length; i++) {
                    var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(allIds[i]));
                    var params = {orderBy: "startTime", singleEvents: true, timeMax: (new Date(newDay)).toISOString(), timeMin: day.toISOString()};

                    url = url + new URLSearchParams(params);

                    var eventsInDay = await GetData(url, token);

                    console.log(eventsInDay);

                    eventsInDay = filterMonthlyEvents(eventsInDay.items);
                    var j;
                    for (j = 0; j < eventsInDay.length; j++) {
                        allEvents.push(eventsInDay[j]);
                    }
                }



                console.log("all events after filter: ", eventsInDay)

                //calculate freetime of that day

                 var newFreeTime = 1;

                var startOfNextDay = new Date(day.getTime());

                console.log(result.start_time);

                startOfNextDay.setHours(result.start_time.hour);
                startOfNextDay.setMinutes(result.start_time.minute);

                var endDate = {
                    hour: result.end_time.hour,
                    minute: result.end_time.minute,
                };

                newFreeTime = createFreetimeArr([allEvents], startOfNextDay, endDate);

                //iterate through time gaps, if freetime > event time, push event into freetime
                var i;
                for (i = 0; i < newFreeTime[0].length; i++) {
                    var difference = (newFreeTime[0][i].endTime).getTime() - (newFreeTime[0][i].startTime).getTime();

                    if (difference >= eventTime) {
                        var startOfTime = new Date((newFreeTime[0][i].startTime).getTime());
                        var endOfTime = new Date(startOfTime.getTime() + eventTime);

                        //console.log("where event is scheduled: ", startOfTime, endOfTime);

                        var newEvent = feeds.createEvent(recentEvent.summary, startOfTime, endOfTime);


                        //console.log("rescheduled event to: ", startOfTime, endOfTime);
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

async function grabCalendars(token) {
    var ids = [];
    var calList = await GetData(feeds.CALENDAR_LIST_API_URL_, token);

    var k;
    for (k = 0; k < calList.items.length; k++) {
        ids.push(calList.items[k].id);
    }
    return ids;
}
