$(document).ready(function () {

    // LOGIN BUTTON
    $("#loadBtn").click(function () {
        login();
    });

    // SHOW TOKEN
    $("#showTokenBtn").click(function () {
        showStoredLogin();
    });

    // LOGOUT
    $("#clearBtn").click(function () {
        clearStorage();
    });

    // CHECK LOGIN STATUS ON LOAD
    updateLoginUI();
});


/* =========================
   UPDATE LOGIN UI */
function updateLoginUI() {

    const existing = localStorage.getItem("loginGuid");

    if (existing) {

        // HIDE LOGIN BUTTON
        $("#loadBtn").hide();

        // SHOW LOGGED IN TEXT
        if ($("#loggedText").length === 0) {

            $(".navbar-right").prepend(`
                <span id="loggedText" 
                    style="
                        color:#7CFFB2;
                        font-weight:500;
                        margin-right:10px;
                        margin-top:5.5px;
                    ">
                    ✓ Logged In
                </span>
            `);
        }

        // SHOW LOGOUT BUTTON
        $("#clearBtn").show();

        // OPTIONAL
        $("#output").html("User already logged in.");

    } else {

        // SHOW LOGIN BUTTON
        $("#loadBtn").show();

        // REMOVE LOGGED IN TEXT
        $("#loggedText").remove();

        // HIDE LOGOUT BUTTON
        $("#clearBtn").hide();

        $("#output").html("Waiting...");
    }
}


/* =========================
   LOGIN  */
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

            // SAVE LOGIN
            localStorage.setItem("loginGuid", loginGuid);

            console.log("Stored loginGuid:", loginGuid);

            $("#output").html(`
                Login successful.<br>
                Saved to localStorage.
            `);

            // UPDATE UI
            updateLoginUI();
        },

        error: function (xhr) {

            console.error(xhr);

            $("#output").html(
                "Login Failed.<br>Status: " +
                xhr.status +
                "<br>Response: " +
                xhr.responseText
            );
        }
    });
}


/* =========================
   SHOW STORED LOGIN */
function showStoredLogin() {

    const saved = localStorage.getItem("loginGuid");

    if (saved) {

        $("#output").html(
            "Stored Login:<br><pre>" +
            saved +
            "</pre>"
        );

    } else {

        $("#output").html("Nothing stored.");
    }
}


/* =========================
   LOGOUT */
function clearStorage() {

    // REMOVE LOGIN
    localStorage.removeItem("loginGuid");

    $("#output").html("Logged out.");

    // UPDATE UI
    updateLoginUI();
}