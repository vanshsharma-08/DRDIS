const { fallbackParse } = require('./fallbackParse');

// Test the exact string from the user's request
const testText = "Survey 404. Medical emergency in Sector 9, 15 people bleeding";
const result = fallbackParse(testText);

console.log("Input:", testText);
console.log("Result:", JSON.stringify(result, null, 2));

// Verify the fix
if (result.people_count === 15 && result.location_tag === "Sector 9") {
    console.log("\n✅ SUCCESS: Exact match achieved!");
    console.log("   - people_count: 15 (correct)");
    console.log("   - location_tag: 'Sector 9' (correct)");
} else {
    console.log("\n❌ FAILURE: Mismatch detected");
    console.log("   - Expected people_count: 15, Got:", result.people_count);
    console.log("   - Expected location_tag: 'Sector 9', Got:", result.location_tag);
}