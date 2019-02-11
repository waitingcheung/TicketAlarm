const phantom = require('phantom');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const express = require('express');
const moment = require('moment-timezone');

const app = express();
app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

const url = 'https://uacinemas.com.hk/eng/movies';
const prefix = 'https://uacinemas.com.hk/eng/';

if (process.env.KEYWORD === undefined) {
    require('now-env');
}

const config = {
    keyword: process.env.KEYWORD,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    receivers: process.env.RECEIVERS
};


const min = 120000;
const max = 600000;

checkTickets();
(function randSetInterval() {
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(function() {
        checkTickets();
        randSetInterval();
    }, rand);
}());

function checkTickets() {
    (async function () {
        const instance = await phantom.create();
        const page = await instance.createPage();

        console.log(getTimeNow() + ' Requesting ' + url);

        const status = await page.open(url);
        const content = await page.property('content');

        const $ = cheerio.load(content);
        const movies = $(".center_info > h3 > a:contains('IMAX')");

        for (let k in movies) {
            if (movies.hasOwnProperty(k)) {
                const movie = movies[k];
                if (movie.children && movie.children[0]) {
                    const title = movie.children[0].data;
                    if (title.includes(config.keyword)) {
                        console.log(getTimeNow() + ' ' + title);
                        const movieURL = prefix + movie.attribs.href;
                        checkMovieTickets(title, movieURL)
                    }
                }
            }
        }

        await instance.exit();
    })();
}

function checkMovieTickets(title, url) {
    (async function () {
        const instance = await phantom.create();
        const page = await instance.createPage();

        console.log(getTimeNow() + ' Requesting ' + url);

        const status = await page.open(url);
        const content = await page.property('content');

        const $ = cheerio.load(content);
        if ($('div').hasClass('ticketing_box') && $('.ticketing_box').html().includes('BEA IMAX @ UA iSQUARE')) {
            console.log(getTimeNow() + ' Tickets available.');
            sendMail(title, url);
        } else {
            console.log(getTimeNow() + ' Tickets not available.');
        }

        await instance.exit();
    })();
}

function sendMail(title, url) {
    nodemailer.createTestAccount((err, account) => {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: config.user, // generated ethereal user
                pass: config.pass // generated ethereal password
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"Ticketing Bot" <' + config.user + '@gmail.com>', // sender address
            to: config.receivers, // list of receivers
            subject: title + ' Tickets Available', // Subject line
            text: url, // plain text body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
        });
    })
}

function getTimeNow() {
    return moment().tz("Asia/Hong_Kong").format('HH:mm:ss');
}
