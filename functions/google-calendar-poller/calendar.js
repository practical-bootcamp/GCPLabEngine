const ical = require('node-ical');
const moment = require('moment-timezone');

function getComingEvents(icalUrl) {
    return new Promise((resolve, reject) => {
      ical.fromURL(icalUrl, {}, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const events = Object.values(data).filter(event => event.type === 'VEVENT');
          const end = new Date();
          end.setDate(end.getMinutes + 15);
          const comingEvents = events.filter(event => new Date(event.start) > new Date());
  
          const ev = comingEvents.map(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            return { start, end, summary: event.summary, description: event.description, location: event.location, recurrence: false };
          });
          resolve(ev);
        }
      });
    });
  }
  function diff_minutes(dt2, dt1) {
    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.round(diff);
  }
  
  function getComingRecurrences(icalUrl) {
    return new Promise((resolve, reject) => {
      ical.fromURL(icalUrl, {}, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const comingEvents = [];
          for (let k in data) {
            if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
            const event = data[k];
            if (event.type !== 'VEVENT' || !event.rrule) continue;
  
            const end = new Date();
            const start = new Date();
            end.setHours(end.getHours() + 12);
            end.setSeconds(0, 0);
            start.setHours(start.getHours() - 12);
            start.setSeconds(0, 0);
  
            const dates = event.rrule.between(start, end, true);
            if (dates.length === 0) continue;
  
            dates.forEach(date => {
              if (event.rrule.origOptions.tzid) {
                // tzid present (calculate offset from recurrence start)
                const dateTimezone = moment.tz.zone('UTC')
                const localTimezone = moment.tz.guess()
                const tz = event.rrule.origOptions.tzid === localTimezone ? event.rrule.origOptions.tzid : localTimezone
                const timezone = moment.tz.zone(tz)
                const offset = timezone.utcOffset(date) - dateTimezone.utcOffset(date)
                newDate = moment(date).add(offset, 'minutes').toDate()
              } else {
                // tzid not present (calculate offset from original start)
                newDate = new Date(date.setHours(date.getHours() - ((event.start.getTimezoneOffset() - date.getTimezoneOffset()) / 60)))
              }
              // const start = moment(newDate)
              const now = new Date()
              const todayEventStart = event.start;
              todayEventStart.setDate(now.getDate());
              todayEventStart.setMonth(now.getMonth());
              todayEventStart.setFullYear(now.getFullYear());       
  
              const todayEventEnd = event.end;
              todayEventEnd.setDate(now.getDate());
              todayEventEnd.setMonth(now.getMonth());
              todayEventEnd.setFullYear(now.getFullYear());  
  
              console.log('Recurrence start:', start)
              const diff = diff_minutes(todayEventStart, now);
              if (diff > 0 && diff < 15) {
                comingEvents.push({
                  start: new Date(todayEventStart),
                  end: new Date(todayEventEnd),
                  summary: event.summary,
                  description: event.description,
                  location: event.location,
                  recurrence: true
                });
              }
            });             
          }
          resolve(comingEvents);
        }
      });
    });
  }

  async function getNewEvents(icalUrl) {
    const comingRecurrences = await getComingRecurrences(icalUrl);
    const ComingEvents = await getComingEvents(icalUrl);
    return [...ComingEvents, ...comingRecurrences];
  }
  module.exports = { getNewEvents };