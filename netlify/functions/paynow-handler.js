const { Paynow } = require("paynow");

// -- Paynow Instance Factory --
function getPaynowInstance(currency) {
    const isUSD = (currency || '').toUpperCase() === 'USD';
    const PAYNOW_ID = isUSD ? process.env.PAYNOW_ID_USD : process.env.PAYNOW_ID_ZWL;
    const PAYNOW_KEY = isUSD ? process.env.PAYNOW_KEY_USD : process.env.[PAYNOW_KEY_ZWL];

    if (!PAYNOW_ID || !PAYNOW_KEY) {
        throw new Error(`Missing Paynow credentials for ${isUSD ? 'USD' : 'ZWL'}`);
    }

    const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
    
    // Use real return/result URLs. The success redirect is handled by the frontend JS.
    paynow.resultUrl = `${process.env.URL}/.netlify/functions/paynow-webhook`;
    paynow.returnUrl = `${process.env.URL}/payment.html`;

    console.log('Paynow URLs configured:', { resultUrl: paynow.resultUrl, returnUrl: paynow.returnUrl });
    return paynow;
}

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
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: "Method Not Allowed" })};
    }

    console.log('=== SMARTPARK PAYNOW HANDLER INITIATED ===');
    try {
        const data = JSON.parse(event.body);
        const { paymentMethod, currency, paymentDetails, userId, email, lotId, slotId, hours, amount } = data;

        console.log('Payment request:', { paymentMethod, currency, userId, email, lotId, slotId, hours, amount });

        const requiredFields = { paymentMethod, currency, userId, email, lotId, slotId, hours, amount };
        const missing = Object.keys(requiredFields).filter(key => !requiredFields[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const paynow = getPaynowInstance(currency);
        
        // Create a unique, parsable reference
        const reference = `SP-${userId}-${lotId}-${slotId}-${hours}-${Date.now()}`;
        console.log('Creating payment with reference:', reference);

        const payment = paynow.createPayment(reference, email);
        payment.add(`Parking: ${slotId.toUpperCase()} for ${hours}h`, parseFloat(amount));

        let response;
        if (paymentMethod.toLowerCase().trim() === 'ecocash') {
            if (!paymentDetails || !/^(07[781356])\d{7}$/.test(paymentDetails)) {
                throw new Error("Invalid EcoCash phone number format.");
            }
            console.log(`Initiating mobile payment via ${paymentMethod}`);
            response = await paynow.sendMobile(payment, paymentDetails, paymentMethod);
        } else {
            console.log(`Initiating redirect payment for method: ${paymentMethod}`);
            response = await paynow.send(payment);
        }
        
        console.log('Paynow response:', { success: response.success, error: response.error || 'none' });

        if (response.success) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: "Payment initiated.",
                    pollUrl: response.pollUrl || null,
                    redirectUrl: response.redirectUrl || null,
                })
            };
        } else {
            throw new Error(response.error || "Payment initiation failed. Please try again.");
        }
    } catch (error) {
        console.error("=== PAYNOW HANDLER ERROR ===", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
