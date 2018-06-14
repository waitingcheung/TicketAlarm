const phantom = require('phantom');
const cheerio = require('cheerio');
const NotificationCenter = require('node-notifier').NotificationCenter;

const url = 'https://uacinemas.com.hk/eng/movies';
const prefix = 'https://uacinemas.com.hk/eng/';
const keyword = 'Ant-Man';
const notifier = new NotificationCenter();

checkTickets();
setInterval(checkTickets, 300000);

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
                    if (title.includes(keyword)) {
                        console.log(getTimeNow() + ' ' + title);
                        const movieURL = prefix + movie.attribs.href;
                        checkMovieTickets(movieURL)
                    }
                }
            }
        }

        await instance.exit();
    })();
}

function checkMovieTickets(url) {
    (async function () {
        const instance = await phantom.create();
        const page = await instance.createPage();

        console.log(getTimeNow() + ' Requesting ' + url);

        const status = await page.open(url);
        const content = await page.property('content');

        const $ = cheerio.load(content);
        if ($('div').hasClass('ticketing_box') && $('.ticketing_box').html().includes('BEA IMAX @ UA iSQUARE')) {
            console.log(getTimeNow() + ' Tickets available.');
            notifier.notify(
                {
                    'message': 'Tickets Available',
                    'open': url,
                    'wait': true
                },
                function (error, response, metadata) {
                    console.log(response, metadata);
                }
            );
        } else {
            console.log(getTimeNow() + ' Tickets not available.');
        }

        await instance.exit();
    })();
}

function getTimeNow() {
    const now = new Date();
    return ('0' + now.getHours()).slice(-2) + ":" +
        ('0' + now.getMinutes()).slice(-2) + ":" +
        ('0' + now.getSeconds()).slice(-2);
}
