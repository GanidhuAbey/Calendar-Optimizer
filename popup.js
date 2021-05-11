//this javascript file will send the due date and time required data from the user
//to the storage, where it will be acessed by the background.js file.

let event_name = document.getElementById("name");
let due_date = document.getElementById("duedate");
let time_needed = document.getElementById("time");

chrome.storage.sync.set({ event_name });
chrome.storage.sync.set({ due_date });
chrome.storage.sync.set({ time_needed });
