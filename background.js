//chrome.identity.getAuthToken({ interactive: true });

var feeds = {};

feeds.CALENDAR_LIST_API_URL_ = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
feeds.CALENDAR_EVENTS_API_URL_ = 'https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?'
feeds.ids = [];

feeds.test_array = ["cat", "bat", "nat"];

feeds.requestInteracticeAuthToken = function() {
    chrome.identity.getAuthToken({interactive: true}, function(token) {
        if (chrome.runtime.lastError || !token) {
            return;
        }
        feeds.fetchCalenders();
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


feeds.fetchCalenders = function() {
    chrome.identity.getAuthToken({interactive: false}, async function(token) {
        awaitGetData(feeds.CALENDAR_LIST_API_URL_, token)
            .then(data => {
                var i;
                console.log(data.items);
                for (i = 0; i < data.items.length; i++) {
                    awaitGetData(feeds.CALENDAR_EVENTS_API_URL_.replace('{calendarId}', encodeURIComponent(data.items[i].id)), token)
                        .then(data => {
                            console.log(data);
                        });
                }
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
      feeds.requestInteracticeAuthToken();
    }
  }
);
