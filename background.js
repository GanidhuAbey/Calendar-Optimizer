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

async function requestInteracticeAuthToken() {
    duedate = new Date(duedate);
    console.log(duedate);
    console.log(current);
    chrome.identity.getAuthToken({interactive: true}, async function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        fetchEvents();
    })
}

async function fetchEvents() {
    var events = [];
    await chrome.identity.getAuthToken({interactive: false}, async function(token) {
        awaitGetData(CALENDAR_LIST_API_URL_, token)
            .then(data => {
                var i;
                for (i = 0; i < data.items.length; i++) {
                    feeds.calendarIds.push(data.items[i].id);
                }
            })
            .then(async function() {
                //console.log(calendarIds.length);
                feeds.events = await recurseEvents(calendarIds.length, token, []);
                console.log(feeds.events);
            });

    });
}
//make calendarIds parameter of function
async function recurseEvents(size, token, event_list) {
    var currentSize = size - 1;

    if (currentSize == -1) {
        return;
    }

    var url = CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.calendarIds[currentSize]));
    var params = {singleEvents: true, timeMax: duedate.toISOString(), timeMin: current.toISOString()}
    url = url + new URLSearchParams(params);

    await awaitGetData(url, token)
        .then(async function(eventData) {
            var j;
            for (j = 0; j < eventData.items.length; j++) {
                var eventsForCalendar = eventData.items[j];
                event_list.push(eventsForCalendar);
            }
            await recurseEvents(currentSize, token, event_list);
        });
    return event_list;
}

async function awaitGetData(url = '', token) {
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
        requestInteracticeAuthToken();
    }
  }
);
