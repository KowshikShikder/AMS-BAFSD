// Pluggable SMS sender.
//
// If SMS_API_URL / SMS_API_KEY are not configured, messages are simply
// logged (and can optionally be persisted) instead of sent — so the rest of
// the app (status-change notifications) works out of the box in dev/demo
// mode. Wire up your real SMS gateway (e.g. a local BD provider) by filling
// in the .env values and adjusting the fetch payload below to match its API.

export async function sendSMS(phone, message) {
  if (!phone) {
    return { ok: false, skipped: true, reason: "No phone number on file" };
  }

  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;

  if (!apiUrl || !apiKey) {
    // Demo mode: just log it. Replace this branch's console.log with your
    // provider call once credentials are available.
    console.log(`[SMS:DEMO] -> ${phone}: ${message}`);
    return { ok: true, mode: "logged" };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        text: message,
        sender_id: senderId,
      }),
    });
    const ok = res.ok;
    return { ok, mode: "sent", status: res.status };
  } catch (err) {
    console.error("SMS send failed:", err.message);
    return { ok: false, mode: "error", error: err.message };
  }
}

export function statusChangeMessage(app) {
  return `Dear applicant, your application (${app.appSl}) status is now "${app.status.replace(
    "_",
    " "
  )}". Track anytime at our tracking page using your serial number.`;
}
