const { Paynow } = require("paynow");

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ message: "Method Not Allowed" }) };
    }

    const { PAYNOW_ID_USD, PAYNOW_KEY_USD } = process.env;
    if (!PAYNOW_ID_USD || !PAYNOW_KEY_USD) {
        console.error("CRITICAL: Paynow credentials are not configured for status checking.");
        return { statusCode: 500, headers, body: JSON.stringify({ message: "Server configuration error." }) };
    }

    let pollUrl;
    try {
        const data = JSON.parse(event.body);
        pollUrl = data.pollUrl;
        if (!pollUrl || !pollUrl.startsWith('https://')) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid or missing pollUrl." }) };
        }
    } catch (error) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON in request body." }) };
    }

    try {
        // The SDK needs to be instantiated to use its methods, but the pollUrl is self-contained.
        // We use one set of credentials as it doesn't affect the GET request to the pollUrl.
        const paynow = new Paynow(PAYNOW_ID_USD, PAYNOW_KEY_USD);
        const status = await paynow.pollTransaction(pollUrl);

        console.log(`Poll result for ${pollUrl}: Status=${status.status}, Paid=${status.paid()}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                isPaid: status.paid(),
                status: status.status,
            }),
        };
    } catch (error) {
        console.error("Error polling transaction status:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: "An internal error occurred while checking status.",
                isPaid: false,
                status: 'error'
            }),
        };
    }
};
