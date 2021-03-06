const express = require('express')
const router = express.Router()

const db = require('../models/index')
const Op = db.Sequelize.Op
const moment = require('moment-timezone')
const ical = require('ical-generator')
const htmlToText = require('html-to-text')

async function fetchEvents (startDate) {
  return db.Event
    .findAll({
      where: {
        active: true,
        start_time: {
          [Op.gte]: startDate.toDate()
        }
      },
      order: [
        ['start_time', 'ASC']
      ]
    })
}

/* List all events */
router.get('/', async function (req, res, next) {
  try {
    const startDate = moment().hour(0).minute(0)
    const events = await fetchEvents(startDate)

    const eventListing = events.map(event => {
      return {
        id: event.platform_identifier,
        name: event.name,
        description: htmlToText.fromString(event.description),
        location: event.location,
        url: event.url,
        group_id: event.group_id,
        group_name: event.group_name,
        group_url: event.group_url,
        formatted_time: moment(event.start_time).tz('Asia/Singapore').format('DD MMM YYYY, ddd, h:mm a'),
        unix_start_time: moment(event.start_time).unix(),
        start_time: moment(event.start_time).tz('Asia/Singapore').format(),
        end_time: moment(event.end_time).tz('Asia/Singapore').format(),
        platform: event.platform,
        rsvp_count: event.rsvp_count
      }
    })

    res.json({
      meta: {
        generated_at: moment().toISOString(),
        location: 'Singapore',
        api_version: 'v1',
        total_events: events.length
      },
      events: eventListing
    })
  } catch (err) {
    res.status(500).send(err.message)
  }
})

router.get('/cal', async function (req, res, next) {
  try {
    const startDate = moment().hour(0).minute(0)
    const events = await fetchEvents(startDate)

    const eventListing = events.map(event => {
      return {
        uid: `${event.platform}_${event.platform_identifier}`,
        summary: event.name,
        description: htmlToText.fromString(event.description) + `\n\nRSVP Here: ${event.url}\nRSVP Count: ${event.rsvp_count}`,
        location: event.location,
        url: event.url,
        organizer: { name: event.group_name, email: 'events@engineers.sg' },
        timestamp: event.start_time,
        start: moment(event.start_time).tz('Asia/Singapore'),
        end: moment(event.end_time).tz('Asia/Singapore')
      }
    })

    const cal = ical({
      domain: 'engineers.sg',
      prodId: { company: 'Engineers.SG', product: 'events-calendar', language: 'EN' },
      name: 'Engineers.SG',
      timezone: 'Asia/Singapore',
      description: 'Free tech events in Singapore',
      version: '2.0',
      'X-WR-CALNAME': 'Engineers.SG'
    })
    cal.events(eventListing)

    res.set('Content-Type', 'text/calendar; charset=utf-8').send(cal.toString())
  } catch (err) {
    res.status(500).send(err.message)
  }
})

module.exports = router
