//chrome.identity.getAuthToken({ interactive: true });

var feeds = {};
var duedate;
var current;

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'

feeds.events = [];

feeds.requestInteracticeAuthToken = function() {
    duedate = new Date(duedate);
    console.log(duedate);
    console.log(current);
    chrome.identity.getAuthToken({interactive: true}, function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        feeds.fetchEvents();
        //feeds.fetchEvents();
    })
}

/*
feeds.fetchEvents = function() {
    console.log(feeds.ids);
    //fetch events of all calendars
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        var j;
        console.log(feeds.ids[0]);
        for (j = 0; j < feeds.ids.length; j++) {
            fetch(feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.ids[j])), {
                headers: {
                    'Authorization': 'Bearer ' + token,
                }
            })
            .then(response => response.json())
            .then(data => console.log(data));

            console.log("hi");
        }
        console.log('5');
    });
    console.log('6');
}
*/


feeds.fetchEvents = function() {
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        awaitGetData(feeds.CALENDAR_LIST_API_URL_, token)
            .then(data => {
                var i;
                for (i = 0; i < data.items.length; i++) {
                    var url = feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(data.items[i].id));
                    var params = {timeMax: duedate.toISOString(), timeMin: current.toISOString()}
                    url = url + new URLSearchParams(params);
                    console.log(url);
                    awaitGetData(url, token)
                        .then(eventData => {
                            console.log(eventData);
                        });
                }
                //console.log(feeds.events);
            });

        //console.log(Object.keys(feeds.ids));


        //console.log(feeds.test_array);
        /*
        var j;
        for (j = 0; j < 3; j++) {
            //console.log(feeds.ids[0]);
            awaitGetData(feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(feeds.ids[j])), token)
                .then(data => {
                    console.log(data);
                });
        }
        */
    })
}

async function awaitGetData(url = '', token) {
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
        }
    })

    return response.json();
}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "sign_in" ) {
        current = new Date();
        duedate = request.duedate;
        feeds.requestInteracticeAuthToken();
    }
  }
);
