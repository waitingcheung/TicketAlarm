const phantom = require('phantom');
const NotificationCenter = require('node-notifier').NotificationCenter;

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node index.js [URL]');
    return;
}

const url = args[0];
const notifier = new NotificationCenter();

const script =
    ['function() {',
        'var div = document.getElementById(\'ticketing\');',
        'if (div !== null) return div.innerHTML;',
        'else return div;',
        '}'].join('');

checkTickets();
setInterval(checkTickets, 300000);

function checkTickets() {
    (async function () {
        const instance = await phantom.create();
        const page = await instance.createPage();
        await page.on('onResourceRequested', function (requestData) {
            console.info('Requesting', requestData.url);
        });

        const status = await page.open(url);
        const content = await page.property('content');

        await page.evaluateJavaScript(script).then(function (html) {
            if (html.includes('BEA IMAX @ UA iSQUARE')) {
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
            }
        });

        await instance.exit();
    })();
}