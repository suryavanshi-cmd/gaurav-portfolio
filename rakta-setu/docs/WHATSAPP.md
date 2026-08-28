# WhatsApp setup

रक्त-सेतू ships two WhatsApp drivers plus a development one. Pick with a single
env var:

```ini
WHATSAPP_DRIVER=console   # prints to the terminal — start here
WHATSAPP_DRIVER=cloud     # Meta WhatsApp Cloud API — recommended for production
WHATSAPP_DRIVER=twilio    # Twilio — fastest to get a sandbox running today
```

---

## The 24-hour window (read this first)

WhatsApp does not let a business send whatever it likes. There are two modes:

| | When | What you may send |
|---|---|---|
| **Business-initiated** | Patient has not messaged you in 24h | **Only an approved template** |
| **Session** | Patient messaged you within 24h | Any free-form text |

A patient who just had blood drawn has not messaged your lab. **So the report
message must be a pre-approved template.** This is the single most common
reason a first integration fails.

The `cloud` driver sends a template; the `twilio` and `console` drivers send
plain text. Inbound replies (handled in `src/routes/webhook.js`) are inside the
session window, so those go out as plain text on every driver.

---

## Option A — Meta WhatsApp Cloud API (recommended)

### 1. Create the app

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App** → **Business**.
2. Add the **WhatsApp** product.
3. From **WhatsApp → API Setup**, copy:
   - **Phone number ID** → `WA_CLOUD_PHONE_NUMBER_ID`
   - **Temporary access token** → `WA_CLOUD_ACCESS_TOKEN`

> The temporary token expires in 24 hours. For production create a
> **System User** under Business Settings and issue a permanent token with the
> `whatsapp_business_messaging` permission.

### 2. Create the Marathi template

**WhatsApp Manager → Message Templates → Create Template**

- **Name:** `rakta_ahwal_taiyar` (must match `WA_CLOUD_TEMPLATE_NAME`)
- **Category:** `UTILITY` — *not* Marketing. A report notification is a utility
  message; picking Marketing gets it rejected and costs more.
- **Language:** Marathi (`mr`)

**Body** — three variables, in this exact order:

```
नमस्कार {{1}},

तुमचा रक्त तपासणी अहवाल तयार आहे.

{{3}}

खालील बटणावर टॅप करून तुमचा संपूर्ण अहवाल मराठीत पहा. तुम्ही तिथे मराठीत बोलून प्रश्नही विचारू शकता.

— {{2}}
```

| Variable | Value the app sends |
|---|---|
| `{{1}}` | Patient name |
| `{{2}}` | `LAB_NAME` |
| `{{3}}` | One-line Marathi summary of the report |

**Footer:**

```
हा सल्ला सर्वसाधारण माहितीसाठी आहे. डॉक्टरांचा सल्ला घ्या.
```

**Button** → type **Visit Website** → **Dynamic**:

```
https://your-domain.com/r/{{1}}
```

The app fills that `{{1}}` with the report token.

> Meta requires sample values for every variable before it will review. Approval
> usually takes minutes to a few hours. If it is rejected, the reason is almost
> always the category — set it to Utility.

### 3. Configure

```ini
WHATSAPP_DRIVER=cloud
WA_CLOUD_PHONE_NUMBER_ID=123456789012345
WA_CLOUD_ACCESS_TOKEN=EAA...
WA_CLOUD_TEMPLATE_NAME=rakta_ahwal_taiyar
WA_CLOUD_TEMPLATE_LANG=mr
WA_WEBHOOK_VERIFY_TOKEN=any-random-string-you-invent
```

### 4. Webhook (optional but recommended)

Lets the app answer patients who reply to the report message.

**WhatsApp → Configuration → Webhook**

- **Callback URL:** `https://your-domain.com/webhook/whatsapp`
- **Verify token:** the same string you put in `WA_WEBHOOK_VERIFY_TOKEN`
- **Subscribe to:** `messages`

---

## Option B — Twilio

Fastest way to see a real message on a real phone today.

1. Sign up at [twilio.com](https://www.twilio.com/whatsapp).
2. **Messaging → Try it out → Send a WhatsApp message** to activate the sandbox.
3. From your phone, send the join code (e.g. `join lucky-panda`) to the sandbox number.

```ini
WHATSAPP_DRIVER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> The sandbox only messages numbers that have joined it, and the join expires
> every 72 hours. It is for testing. For production you must register a real
> WhatsApp sender and get templates approved — the same rules as Option A.

---

## Test it

```bash
node scripts/send-test.js 9822012345
```

Always test on **your own number** first.

---

## Troubleshooting

| Error | Cause |
|---|---|
| `(#132001) Template name does not exist` | Name or language mismatch. The name is case-sensitive and the language must be exactly `mr`. |
| `(#131047) Re-engagement message` | You tried free-form text outside the 24h window. Use a template. |
| `(#190) Access token has expired` | The temporary token expired. Create a System User token. |
| `(#131030) Recipient not in allowed list` | Development apps can only message numbers added under **API Setup → recipients**. |
| `(#100) Invalid parameter` | Variable count mismatch — the template has a different number of `{{n}}` than the code sends. |
| Twilio `63016` | Free-form outside the session window. Same fix as `131047`. |
| Message sends but no link button | The template was created without the dynamic URL button. Edit and resubmit it. |

---

## Cost

Meta charges per *conversation* (a 24-hour window), not per message. Utility
conversations in India are a fraction of a rupee at the time of writing, and
service conversations started by the patient are free. Twilio adds its own
per-message fee on top. Check current pricing before rolling out at volume.
