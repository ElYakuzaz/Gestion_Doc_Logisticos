// Wait for DOM
$(document).ready(function () {

    $("#dividersBtn").click(async function () {

        $("#output").html("Loading dividers...");

        try {
            const data = await getDividers();
            renderDividers(data);
        } catch (err) {
            console.error(err);

            $("#output").html(
                "Error loading dividers.<br>Check console."
            );
        }

    });

});


// ============================
// API CALL (ONLY FETCH DATA)
// ============================
async function getDividers() {

    const token = localStorage.getItem("loginGuid");

    if (!token) {
        throw new Error("No login GUID found. Please login first.");
    }

    console.log("Calling API...");
    console.log("GUID:", token);

    return await $.ajax({
        url: data.baseUrl + data.ep.dividers + "?guid=" + token,
        type: "GET"
    });
}


// ============================
// RENDER FUNCTION (ONLY UI)
// ============================
function renderDividers(dividers) {

    console.log("Dividers received:", dividers);

    // If API returns array directly
    if (!Array.isArray(dividers)) {
        $("#output").html(
            "<pre>" + JSON.stringify(dividers, null, 2) + "</pre>"
        );
        return;
    }

    if (dividers.length === 0) {
        $("#output").html("No dividers found.");
        return;
    }

    let html = "<h3>Dividers:</h3><ul>";

    dividers.forEach((d, index) => {

        // Adjust based on actual API fields
        html += `
            <li>
                #${index + 1} <br>
                ${formatDivider(d)}
            </li>
        `;
    });

    html += "</ul>";

    $("#output").html(html);
}


// ============================
// FORMAT EACH ITEM
// ============================
function formatDivider(d) {

    // You can customize this depending on API structure

    if (typeof d === "string") {
        return d;
    }

    if (typeof d === "object") {
        return Object.entries(d)
            .map(([key, value]) => `${key}: ->${value}`)
            .join("<br>");
    }

    return JSON.stringify(d);
}