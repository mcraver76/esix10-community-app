# "Reach out for help" button: options paper (DRAFT v2)

**Status:** draft by Lúthien, 2026-11-26. v2 follows Michael's 9:15 note. Next: Tauriel (security) + Melian (safety) add their input → Vairë takes it to the attorney → Michael decides. **No build until then** (Michael 11-26 9:12).

**Michael's idea:** "a panic button… if someone is worried, a way to reach out to someone who can pass things along."

**Michael 9:15:** no one-tap 911 option. "If they can be in the app and put a thing out to 911, they could probably call 911 themselves." The options focus on reaching a **person** who can pass things along. 911 appears only as the standard line: **"In an emergency, call 911."**

**Our rule:** we never promise monitoring we can't staff 24/7. Nothing in the app may suggest "someone from ESix10 is watching and will respond."

## What already exists in the app (built 11-26, test copy only)
- **Quick Exit:** a red EXIT button plus Escape-twice inside private groups. It jumps to a harmless page, and Back doesn't return.
- **Hidden private groups**, private photos, and notifications with no message text in them.

## The options: reaching a person
**Hotline numbers checked on thehotline.org, 11-26 ~9:20:** call 1-800-799-SAFE (7233); text "START" to 88788; live chat on thehotline.org; video phone 855-812-1001 for Deaf and hard-of-hearing callers. The site says "Free. Confidential. 24/7." It also warns that live chat can have "longer wait times".

| # | Option | What happens | Who answers | Main risks |
|---|---|---|---|---|
| 1 | **National DV Hotline** (call / text / chat) | Buttons: "Call", "Text START to 88788", "Chat" | Trained advocates, 24/7 (chat may have a wait) | The call or text shows in the phone's history, where an abuser can see it. Show a safety note ("delete from your history if it's safe to do so"). |
| 2 | **Silent alert to a trusted contact** the person picks in advance | Press-and-hold sends the contact a text/email: "[Name] asked you to check on them." Location is optional and OFF by default | A friend or family member the person chose, only if they see it | **Nobody may answer.** An abuser who controls the phone could see the setup or the alert. A wrong number sends it to the wrong person. Needs SMS (cost, and delivery isn't guaranteed). Must say clearly: "This is not an emergency service." |
| 3 | **Connect to a trained advocate at a partner org** (a warm handoff) | A button opens the partner's intake (call/chat) | The partner org's staff, during THEIR hours | Hours vary; it needs a signed partnership; we must not imply they're ours. Strong long-term option (Nienna's partner list). |
| ✗ | ~~ESix10 staff alert~~ | ~~Notifies our moderators/admin~~ | Volunteers, not 24/7 | **Breaks our rule** (it suggests monitoring we can't staff) and invites liability. Not offered. |

## Cross-cutting risks
- **An abuser seeing it.** A help button on the main screen tells anyone holding the phone what the person is worried about. Show it only inside private/hidden groups and the Safety page, and call it something neutral like **"Get help"** or **"Reach out"**.
- **False alarms (option 2):** press-and-hold plus a short "sending in 3… cancel" countdown.
- **No answer:** every screen keeps the standard line **"In an emergency, call 911."**
- **Liability and wording:** "We connect you with people who can help; we don't provide emergency response or monitoring." Terms and privacy need a line; this is for the attorney (Vairë).
- **Data:** keep no record of who used it beyond what's needed to send option 2, and don't log location.

## Security (Tauriel, 11-26 09:30)
*Written against v1; option letters are mapped to the v2 numbers above.*

**Quick Exit gaps.** The main danger is the abuser holding the phone afterwards.
1. **Earlier pages stay in the browser.** Quick Exit removes only the current page from the browser's history. The web version's safety page should suggest using a private/incognito window, and private-room addresses and page titles stay generic. *Checked 11-26: the app has a single address ("/") and the title "ESix10 Community", so no group names show.*
2. **The app stays signed in**, so reopening it lands back in the group. Rec: after Quick Exit, **private rooms are LOCKED until a PIN or Face ID** (a "private rooms lock" setting), rather than a full sign-out. It's safer than staying open and less hassle than signing in again. **Michael's call;** sign-out is fine as the simple version.
3. **The phone's app switcher** shows a picture of the last screen. Hide or blur private rooms when the app goes to the background (a privacy screen). Elanor/Eärwen check it on a real phone once the real phone app exists.

**Option 1, the Hotline sheet.**
- Use plain call/text links, with no tracking redirect through our servers.
- Log nothing about the tap.
- Give it a neutral label that doesn't say "domestic violence" ("Get help" / "Ayuda").

**Option 2, silent alert to a trusted contact: the highest risk.**
- (a) The setup screen itself reveals intent, so it sits behind the private-rooms lock.
- (b) If the abuser IS the "trusted contact", or can change it, the alert goes to them. Changing the trusted contact needs re-authentication (PIN/Face ID or password), and the PERSON gets an email notice that it changed. Never notify the old or new contact about the change. *(Tauriel's corrected wording, 11-26.)*
- (c) Texts go through a provider (Telnyx/Twilio) that keeps logs. The message is generic ("Please check on [first name]"), with no location unless the person turns it on for that one send.
- (d) Store only the contact and an on/off flag: no history of presses, and the shortest log retention at the provider.
- (e) The sending function gets the same caller check and daily cap as our other paid functions (P0-3).
- (f) It must never look like ESix10 responds.

**Option 3, partner advocate.** Data goes to a third party, so it needs a written data agreement (Vairë) and the person's clear consent each time.

**Our own staff:** agree, not offered.

**Data overall:** no analytics on any safety screen, and safety screens are left out of error logs that capture page content.

## Recommendation (for Michael, after the attorney)
1. **First: a "Get help" sheet with option 1 (the Hotline)**, reached from private/hidden groups and the Profile/Safety page. It has call/text/chat, a history-safety note and the 911 line. It costs nothing and nobody on our side has to be staffed.
2. **Next: option 2 (trusted contact)**, opt-in, set up in advance, clearly labeled "not an emergency service", location off by default. Tauriel reviews it before any build. It's the closest match to "someone who can pass things along."
3. **Long-term: option 3 (a partner advocate)** through a signed partnership (Nienna).

## Safety input (Melian, Head of Safety & Training, 2026-11-26)
I'm not a DV advocate. Before launch, have the wording below read by a trained advocate (the Hotline, or Nienna's partner org).
**How I checked:** I read the web search results for The Hotline and NNEDV's Safety Net project (techsafety.org) on 11-26. I didn't call the Hotline. I didn't confirm Spanish service on thehotline.org itself; I only saw it in secondary directories. **Spanish hours are unverified**, so check before we print "24/7 en español".
*Lúthien check, 11-26 ~9:30, on the official sites:*
- espanol.thehotline.org says the service runs "las 24 horas del día, los 7 días de la semana, de manera confidencial", but neither the English nor the Spanish site says Spanish-speaking advocates are available 24/7, or that chat is available in Spanish.
- **So: do NOT print "24/7 en español."** Say "Línea gratuita y confidencial, 24/7" and link to espanol.thehotline.org.
- Confirming Spanish-language advocate hours needs a call to the Hotline; that's Melian's or Vairë's step before launch.

### 1. "Get help" sheet: suggested wording
Keep it calm, short and in the second person. No alarm words ("panic", "abuse", "danger") in the button or the sheet title, because someone else may be looking at the screen.

| Spot | English | Español (tú) |
|---|---|---|
| Button | **Get help** | **Pedir ayuda** |
| Sheet title | You're not alone. | **No estás sin apoyo.** (gender-neutral; "No estás sola" assumes a woman) |
| Line 1 (always first) | In an emergency, call 911. | En una emergencia, llama al 911. |
| Line 2 | Talk with a trained advocate. It's free and private, any time, day or night. | Habla con una persona capacitada. Es gratis y confidencial, a cualquier hora. |
| Button | Call 1-800-799-7233 | Llamar al 1-800-799-7233 |
| Button | Text START to 88788 | Enviar START al 88788 *(checked 11-26: the Spanish site espanol.thehotline.org also says "Texto “START” al 88788", so the keyword is the same)* |
| Button | Chat online | Chatear en línea |
| Line (option 2, if built) | Let someone you trust know. This sends a message to the person you picked. It is not an emergency service. | Avísale a alguien de confianza. Esto envía un mensaje a la persona que elegiste. No es un servicio de emergencia. |
| Footer | You can leave this page any time with EXIT. | Puedes salir de esta página en cualquier momento con SALIR. |

Notes: use "advocate", never "counselor" or "therapist" (the Hotline uses "advocate"). Don't say "we", as in "we'll help you": ESix10 isn't the one helping.

### 2. Safety note (shown under the Hotline buttons, collapsed as "Phone safety tips")
**English:**
> **Is your phone private?**
> Calls and texts show up in your phone's history, and on the phone bill. If someone else can see your phone, it may be safer to:
> - delete the call or text from your history, if that's safe to do. Deleting it can also look suspicious, so you know best.
> - use a phone they don't have access to: a friend's, a work phone, or a library computer for chat.
> - clear your browser history after using chat.
> If you think your phone is being tracked, an advocate can help you plan.

**Español:**
> **¿Tu teléfono es privado?**
> Las llamadas y mensajes quedan en el historial del teléfono y en la factura. Si otra persona puede ver tu teléfono, puede ser más seguro:
> - borrar la llamada o el mensaje del historial, si es seguro hacerlo. Borrarlo también puede llamar la atención; tú sabes qué es mejor.
> - usar un teléfono al que esa persona no tenga acceso: el de una amistad, uno del trabajo, o una computadora de la biblioteca para el chat.
> - borrar el historial del navegador después del chat.
> Si crees que tu teléfono está siendo rastreado, una persona capacitada puede ayudarte a hacer un plan.

Why: The Hotline's own internet-safety page says to clear browser history, including its own site, and suggests safer computers (a library, a shelter). Safety Net says call logs and **billing records** can show who you contacted, and it suggests a phone the abuser doesn't share. It also says history can't always be fully cleared. So the note says "may be safer", and it never promises "this keeps you hidden".

### 3. Is a trusted-contact alert (option 2) good practice for DV?
**Short answer: it can help, but it's the riskiest of the three. Build it only as an opt-in with strict safeguards, and after an advocate has reviewed it.** Personal-safety "alert a friend" apps exist, and Safety Net reviews them in its App Safety Center. The same reviews warn that survivors may be using an app while someone is monitoring their device. That's why option 2 is the riskiest.
- **Risks specific to DV:**
  - The abuser may check the phone and find the setup or the alert. Discovery can raise the danger.
  - The "trusted" contact may be in touch with the abuser (shared family or friends).
  - A friend who gets the alert may confront the abuser or rush over, which can make things worse.
  - A false sense of safety: if nobody sees it, nobody comes.
- **If it's built, I'd require:**
  1. Setup lives only inside the hidden/private area, with a neutral name ("Check-in contact"), not "Emergency contact".
  2. No trace in our app: nothing in the user's sent list and no confirmation pop-up that stays on screen. Show only a brief "Sent" that disappears.
  3. When the contact is picked, they get a short explainer about what the alert means and what to do: "Check on them in a safe way. Don't confront anyone. If you think they're in danger, call 911." That's the most important safeguard.
  4. Location stays OFF by default. If it's turned on, it's one-time only and never continuous tracking.
  5. The text "not an emergency service" appears at setup and on the button.
  6. The person can remove the contact anytime, and removing it leaves no trace.
- **What advocates usually recommend instead of, or alongside, it:** a code word agreed in advance with a trusted person, as part of a safety plan. Option 2 is really a digital version of that, so the help text can point to it: "An advocate can help you make a safety plan."

Sources: [The Hotline, Internet Safety](https://www.thehotline.org/plan-for-safety/internet-safety/) · [Safety Net, cell phone tips](https://www.techsafety.org/12tipscellphones) · [Safety Net, for technologists](https://www.techsafety.org/for-technologists) · [Safety Net, App Safety Center](https://techsafety.org/blog/2015/8/5/new-app-safety-center-helps-victims-and-their-advocates-navigate-smartphone-apps) · Spanish service (secondary, unverified): [Esperanza United](https://esperanzaunited.org/en/knowledge-base/our-community-says-no-mas/help/)

**Optional add-on to Quick Exit (Michael's call):** "also sign me out when I use Quick Exit." That's safer if someone grabs the phone, but the person has to sign back in.
