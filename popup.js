//this javascript file will send the due date and time required data from the user
//to the storage, where it will be acessed by the background.js file.

document.getElementById('button').addEventListener("click", function() {
    chrome.runtime.sendMessage({"message": "sign_in", "duedate": Date.parse(document.getElementById('due').value)});
});
//Date.parse(document.getElementById('due').value)
