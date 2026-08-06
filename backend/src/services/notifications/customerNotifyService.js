function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && process.env.TWILIO_FROM_NUMBER,
  );
}

function buildTrackLink(trackingToken) {
  const base = (process.env.CUSTOMER_FRONTEND_URL || 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
  return `${base}/order/${trackingToken}`;
}

async function sendSms(to, body) {
  const phone = String(to || '').replace(/\s/g, '');
  if (!phone) {
    return { sent: false, reason: 'missing_phone' };
  }

  if (!isSmsConfigured()) {
    console.info(`[Customer SMS] ${phone}: ${body}`);
    return { sent: false, reason: 'sms_not_configured', logged: true };
  }

  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
  ).toString('base64');

  const params = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Customer SMS] Twilio error:', errorText);
    return { sent: false, reason: 'twilio_error' };
  }

  return { sent: true };
}

async function notifyOrderAccepted(order) {
  const message = `Your order ${order.order_number} has been accepted and is being prepared. Track: ${buildTrackLink(order.tracking_token)}`;

  try {
    return await sendSms(order.customer_phone, message);
  } catch (error) {
    console.error('[Customer SMS] Failed to notify accept:', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = {
  notifyOrderAccepted,
  sendSms,
  isSmsConfigured,
};
