const ical = require('node-ical');
const twilio = require('twilio');
const schedule = require('node-schedule');

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const port = 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const phoneNumber = process.env.PHONE_NUMBER;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const url = process.env.ICAL_URL; 

console.log('Starting up...');

app.use(express.static('public')); // 'public' is the directory that contains your .ics file

const DAYS = 1
const LOG = true
// fetch events from ics file for the next 7 days
const fetchEvents = () => {
    // use the sync function parseFile() to parse this ics file
    const events = ical.sync.parseFile(url);

    const VEVENTS = Object.values(events).filter(event => event.type === 'VEVENT');

    const now = new Date();
    const nextWeek = new Date(now.getTime() + DAYS * 24 * 60 * 60 * 1000);

    const eventsInNextWeek = VEVENTS.filter(event => {
        const eventStartDate = new Date(event.start);
        return eventStartDate > now && eventStartDate < nextWeek;
    });


    if(LOG) {
        // loop through events and log them
        for (const event of Object.values(events)) {
            if (event.type !== 'VEVENT') {
                // ignore anything that is not a VEVENT (like VTODO, VJOURNAL, etc.)
                continue;
            }
            console.log(
                'Summary: ' + event.summary +
                '\nDescription: ' + event.description +
                '\nStart Date: ' + event.start.toISOString() +
                '\nEnd Date: ' + event.end.toISOString() +
                '\nRepeats: ' + event.rrule +
                '\n'
            );
        };
    }

    return eventsInNextWeek;
};

// when event is in the future, schedule a text message
const scheduleText = (event) => {
    console.log('Scheduling text...');
    console.log(event);
    const eventStartDate = new Date(event.start);
    const now = new Date();
    if (eventStartDate > now) {
        let job = schedule.scheduleJob(eventStartDate, function() {
            client.messages.create({
            body: `Event: ${event.summary}\nDescription: ${event.description || ''}`,
            from: twilioPhoneNumber,
            to: phoneNumber,
            }).then(message => console.log(message.sid)).done()
            .catch(err => {
                console.log(err);
            })
        });

        console.log(job)
    }
};

const cancelScheduledText = (txtId) => {
    client.messages(txtId)
      .update({status: 'canceled'})
      .then(message => console.log(message.to));
};

const scheduleTwilioStyle = (event) => {
    console.log('Scheduling text...');
    const eventStartDate = new Date(event.start);
    client.messages.create({
        body: `Event: ${event.summary}\nDescription: ${event.description || ''}`,
        from: twilioPhoneNumber,
        to: phoneNumber,
        sendAt: eventStartDate,
        scheduleType: 'fixed',
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
        }).then(message => console.log(message.sid))
        .catch(err => {
            console.log(err);
        })
};

for (const event of fetchEvents()) {
    scheduleTwilioStyle(event);
}



