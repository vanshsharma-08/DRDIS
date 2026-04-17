// This script acts like your React frontend and pings your live server directly.
fetch('https://drdis.onrender.com/analyze/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        requests: [
            { text: "Survey 404. Medical emergency in Sector 9, 15 people bleeding" }
        ]
    })
})
.then(response => response.json())
.then(data => {
    console.log("================ API RESPONSE ================");
    console.log(JSON.stringify(data, null, 2));
    console.log("==============================================");
})
.catch(error => console.error("❌ Failed to reach server. Is it running?", error));