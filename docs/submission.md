# Hack2skill submission fields

Paste-ready answers (each under 1024 characters).

## Describe the changes/updates made in the deployed version

Festa is a new Gemini-powered planner for weddings, birthdays, meetups, festivals and community events. A short brief (type, date, guests, budget, city, vibe) becomes a tailored master plan. The plan includes an 8-category budget with spend tracking, over-budget alerts and one-click rebalancing. It also includes a week-by-week checklist with priority alerts, a day-of run of show, and a vendor checklist with questions to ask. A guest tracker covers RSVPs, dietary needs and group-aware seating. A creative studio writes decor concepts, playlists, icebreakers, activities, invitations and vendor emails. Plans can be refined in plain language. Built with React, Express and the Gemini API, using structured JSON output and two plan halves generated in parallel. It falls back to a model chain and offline templates when needed, and has a strict CSP, rate limiting, shared validation, prompt-injection containment, WCAG-minded UI, and 95 tests.

## Mention the Gen AI services utilized in the submission, and where did you utilize it?

Google Gemini API via Google AI Studio, using the @google/genai SDK server-side (models gemini-3.8-flash, gemini-3.5-flash-lite and gemini-3.6-flash, with automatic fallback and cooldown).
1) Event blueprint: two parallel structured-JSON calls produce the overview (summary, theme palette, budget split with rationale, savings tips, risks) and the schedule (milestones, run of show, vendor checklist). Both use responseJsonSchema.
2) Plan refinement: a free-text change request regenerates the plan.
3) Creative studio: decor concepts, playlists, icebreakers, guest activities (from aggregate RSVP and dietary data only), invitation wording in 4 tones, and vendor enquiry emails.
Prompts compute facts in code (days left, budget per guest) and isolate user text as escaped JSON data to resist prompt injection. All output is sanitised server-side.

## Demo video outline (2–3 min)

1. 0:00 Hero: pick "Wedding", click "Fill in an example wedding", then "Create my plan" (show the progress messages).
2. 0:25 Overview: theme palette, budget at a glance, risks; point out the "Plan written by Google Gemini" label.
3. 0:45 Budget: log spend on Venue past its line to show the alert and tab badge, then rebalance to a new total.
4. 1:05 Timeline: high-priority badges, tick a task, filter, run of show.
5. 1:20 Vendors: mark one as booked, then "Draft enquiry email", which jumps to Ideas and generates the email.
6. 1:40 Guests: add 3 guests with dietary needs; show the caterer summary and seating; "Write the invitation" in a playful tone.
7. 2:00 Refine: "Make it eco-friendly and cut 15% from decor" and watch the plan update.
8. 2:20 Engineering: tests passing, keyboard-only tab navigation, the template fallback when no key is set, `render.yaml`.
