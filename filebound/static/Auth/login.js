$(document).ready(function () {

    $("#loadBtn").click(function () {
        login();
    });

    $("#showTokenBtn").click(function () {
        showStoredLogin();
    });

    $("#clearBtn").click(function () {
        clearStorage();
    });

    // Check existing login
    const existing = localStorage.getItem("loginGuid");

    if (existing) {
        $("#output").html("Existing login found in localStorage.");
    }

});


function login() {

    $("#output").html("Logging in...");

    const cred = `${data.cred.usr}:${data.cred.pswd}`;

    $.ajax({
        url: data.baseUrl + data.ep.login,
        type: "POST",

        beforeSend: function (request) {
            request.setRequestHeader(
                "Authorization",
                "Basic " + btoa(cred)
            );
        },

        success: function (loginGuid) {

            // Store WITHOUT stringify 
            localStorage.setItem("loginGuid", loginGuid);

            console.log("Stored loginGuid:", loginGuid);

            $("#output").html(
                "Login successful.<br>Saved to localStorage."
            );
        },

        error: function (xhr) {
            console.error(xhr);

            $("#output").html(
                "Login Failed.<br>Status: " + xhr.status +
                "<br>Response: " + xhr.responseText
            );
        }
    });
}


function showStoredLogin() {

    const saved = localStorage.getItem("loginGuid");

    if (saved) {
        $("#output").html(
            "Stored Login:<br><pre>" + saved + "</pre>"
        );
    } else {
        $("#output").html("Nothing stored.");
    }
}


function clearStorage() {

    localStorage.removeItem("loginGuid");

    $("#output").html("Stored login cleared.");
}