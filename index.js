const { IncomingWebhook, WebClient, RTMClient } = require('@slack/client');
var request = require('request-promise');
var env = require('node-env-file');
env(__dirname + '/.env');
console.log('Getting started with Slack Developer Kit for Node.js');

const token = process.env.SLACK_TOKEN;
var activeCategories =
    [
        { name: 'Kjøtt- og kyllingpålegg', id: 45 },
        { name: 'Spekemat og salami', id: 235 },
        { name: 'Leverpostei', id: 122 },
        { name: 'Salatpålegg', id: 47 },
        { name: 'Fiskepålegg', id: 97 },
        { name: 'Syltetøy', id: 46 },
        { name: 'Honning og søtpålegg', id: 392 },
        { name: 'Majones og tubepålegg', id: 44 },
        { name: 'Gulost', id: 43 },
        { name: 'Brunost', id: 151 },
        { name: 'Smøreost og prim', id: 145 },
        { name: 'Spesialoster', id: 148 },
        { name: "Smør og margarin", id: 53 },
        { name: "Ferske brød", id: 2 }
    ];

var activePools = [];
const rtm = new RTMClient(token);
rtm.start();
const web = new WebClient(token);

// const timeNotification = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
// const currentTime = new Date().toTimeString();

// timeNotification.send(`The current time is ${currentTime}`, (error, resp) => {
//   if (error) {
//     return console.error(error);
//   }

// web.search.messages({ query: 'current in:#lunch' })
//     .then(resp => {
//         if (resp.messages.total > 0) {
//             console.log('First match:', resp.messages.matches[0]);
//         } else {
//             console.log('No matches found');
//         }
//     })
//     .catch(console.error)
// // });

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = 'CCBU86ZJM';

web.channels.list()
    .then((res) => {
        // Take any channel for which the bot is a member
        const channel = res.channels.find(c => c.is_member);

        if (channel) {
            // We now have a channel ID to post a message in!
            // use the `sendMessage()` method to send a simple string to a channel using the channel ID
            // rtm.sendMessage('Hello, world!', channel.id)
            //     // Returns a promise that resolves when the message is sent
            //     .then((msg) => console.log(`Message sent to channel ${channel.name} with ts:${msg.ts}`))
            //     .catch(console.error);
        } else {
            console.log('This bot does not belong to any channel, invite it to at least one and try again');
        }
    });

rtm.on('reaction_removed', (message) => {
    var ts = message.item.ts;
    if (activePools.length > 0) {
        var pool = activePools.find(x => x.ts == ts);
        if (pool) {
            if (message.reaction == "one") {
                pool.results[0]--;
            } else if (message.reaction == "two") {
                pool.results[1]--;
            } else if (message.reaction == "three") {
                pool.results[2]--;
            }
        }
        console.log(activePools);
    }
});

rtm.on('reaction_added', (message) => {
    var ts = message.item.ts;
    if (activePools.length > 0) {
        var pool = activePools.find(x => x.ts == ts);
        if (pool) {
            if (message.reaction == "one") {
                pool.results[0]++;
            } else if (message.reaction == "two") {
                pool.results[1]++;
            } else if (message.reaction == "three") {
                pool.results[2]++;
            }
        }
        console.log(activePools);
    }
});

rtm.on('message', (message) => {
    // For structure of `event`, see https://api.slack.com/events/message

    // Skip messages that are from a bot or my own user ID
    if ((message.subtype && message.subtype === 'bot_message') ||
        (!message.subtype && message.user === rtm.activeUserId)) {
        return;
    }

    if (message.text == "done") {
        commands.pollDone();
    }
    else if (message.text == "getcats") {
        var toprint = '';
        for (var i = 0; i < activeCategories.length; i++) {
            var cat = activeCategories[i];
            toprint += cat.id + ' ' + cat.name + '\n';

        }
        web.chat.postMessage({ channel: conversationId, text: toprint })
            .then((res) => {
                // `res` contains information about the posted message
                console.log('Message sent: ', res.ts);
            })
            .catch(console.error);
    } else if (message.text.startsWith("needfood")) {
        var splitted = message.text.split(" ");
        var neededFood = [];
        activePools = [];
        for (var i = 1; i < splitted.length; i++) {
            neededFood.push(splitted[i]);
            kolonial.getFoodInCategory(splitted[i]).then(
                function (body) {
                    var data = JSON.parse(body);
                    var foods = data.products;
                    var selected = [];
                    for (var k = 0; k < Math.min(3, foods.length); k++) {
                        var ran = k;
                        if (foods.length > 3) {
                            while (true) {
                                ran = getRandomInt(foods.length - 1);
                                if (!selected.includes(foods[ran])) {
                                    break;
                                }
                                console.log('crash: ' + ran);
                            }
                        }
                        selected.push(foods[ran]);
                    }

                    var stringtosend = '*' + data.name + '*\n';
                    for (var j = 0; j < selected.length; j++) {
                        if (j == 0) stringtosend += ':one:';
                        if (j == 1) stringtosend += ':two:';
                        if (j == 2) stringtosend += ':three:';
                        stringtosend += getProductAsString(selected[j]) + '\n';
                    }
                    web.chat.postMessage({ channel: conversationId, text: stringtosend })
                        .then((res) => {
                            activePools.push({
                                ts: res.ts,
                                products: selected,
                                results: [0, 0, 0]
                            });
                            // `res` contains information about the posted message
                            web.reactions.add({
                                name: 'one',
                                timestamp: res.ts,
                                channel: conversationId
                            }).then((res) => {
                                return web.reactions.add({ name: 'two', timestamp: res.ts, channel: conversationId }).then(
                                    (res2) => {
                                        return web.reactions.add({ name: 'three', timestamp: res.ts, channel: conversationId })
                                    }
                                );
                            }
                            );
                        })
                        .catch(console.error);
                }
            );
        }
        web.chat.postMessage({ channel: conversationId, text: "30 minute timer started" })
            .then((res) => {
            })
            .catch(console.error);

    }
    else if (message.text == "help") {
        commands.help(message);
    }

    // Log the message
    console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
});
function startDoneTimer(delay) {
    setTimeout(() => {
        commands.pollDone();
    }, delay);
}
function getProductAsString(product) {
    return product.full_name + ' <' + product.front_url + '|' + product.gross_price + 'kr>'
}
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
var commands = {
    pollDone: function () {
        var donestr = '';
        var totalPrice = 0;
        var winners = [];
        for (var i = 0; i < activePools.length; i++) {
            var poll = activePools[i];
            var ress = poll.results;
            let maxidx = ress.indexOf(Math.max(...ress));
            donestr += getProductAsString(poll.products[maxidx]) + ' won with ' + ress[maxidx] + ' votes\n';
            totalPrice += parseFloat(poll.products[maxidx].gross_price);
            winners.push(poll.products[maxidx]);
        }
        donestr += 'total: ' + Math.round(totalPrice) + ' kr';
        web.chat.postMessage({ channel: conversationId, text: donestr })
            .then((res) => {
            })
            .catch(console.error);
        kolonial.addToChart(winners).then(
            function (res) {
                console.log(res);
            });
    },

    getCategories: function (message) {
        if (activeCategories) {
            sendFunctions.sendCategories(categories);
        } else {
            kolonial.getCategories().then(
                function (categories) {
                    sendFunctions.sendCategories(categories);
                }
            ).catch(function (error) {
                console.error(error);
            });
        }
    },
    help: function (message) {
        var helpstr =
            'getcats - show all categories\n' +
            'needfood <id1> <id2> ..\n' +
            'help';
        return rtm.sendMessage(helpstr, message.channel)
            // Returns a promise that resolves when the message is sent
            .then((msg) => console.log(`Message sent to channel ${message.channel} with ts:${msg.ts}`))
            .catch(console.error);
    }
}

var sendFunctions = {

    sendCategories(categories) {
        console.log(categories);
        var str = '';
        for (var i = 0; i < categories.length; i++) {
            str += categories[i] + '\n';
        }
        rtm.sendMessage(str, message.channel)
            // Returns a promise that resolves when the message is sent
            .then((msg) => console.log(`Message sent to channel ${message.channel} with ts:${msg.ts}`))
            .catch(console.error);
    }
}

var loginToken = '';
var kolonial = {

    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': process.env.KOLONIAL_USER_AGENT + '/1.0',
        'X-Client-Token': process.env.KOLONIAL_TOKEN
    },
    login: function () {
        console.log("login");
        var options = {
            "uri": 'https://kolonial.no/api/v1/user/login/',
            "method": "POST",
            "headers": kolonial.headers,
            body: {
                username: process.env.KOLONIAL_USERNAME,
                password: process.env.KOLONIAL_PASSWORD
            },
            json: true
        };
        return request(options).then(
            function (res) {
                // console.log(res);
                loginToken = res.sessionid;
                console.log(loginToken);
            }).catch(function (error) {
                console.log("login error:");
                console.log(error);
            });
    },

    addToChart(products) {
        var items = [];
        console.log("addToChart");
        for (var i = 0; i < products.length; i++) {
            items.push({
                "product_id": products[i].id,
                "quantity": 1
            });
        }
        var headCopy = JSON.parse(JSON.stringify(kolonial.headers));
        headCopy["Cookie"] = "sessionid=" + loginToken;
        console.log(headCopy);
        console.log(items);
        var options = {
            "uri": 'https://kolonial.no/api/v1/cart/items/',
            "method": "POST",
            "headers": headCopy,
            body: {
                "items": items,
            },
            json: true
        };
        return request(options);
    },

    getFoodInCategory: function (category) {
        var options = {
            // 42 = pålegg
            "uri": 'https://kolonial.no/api/v1/productcategories/' + category,
            "method": "GET",
            "headers": kolonial.headers
        };
        return request(options);
    },
    getCategories: function () {
        return kolonial.getCategories().then(
            function (body) {
                var data = JSON.parse(body);
                return data.children.map(x => { name = x.name, id = x.id });
            }
        ).then(function (categories) {
            kolonial.getCheeses().then(
                function (body2) {
                    var data2 = JSON.parse(body2);
                    var cheeses = data2.children
                        .map(x => { name = x.name, id = x.id })
                        .filter(x => x.name !== 'Revet Ost 421');
                    categories = categories.concat(cheeses);
                    return categories;
                }
            )
        });
    },

    getSpread: function () {
        var options = {
            // 42 = pålegg
            "uri": 'https://kolonial.no/api/v1/productcategories/42',
            "method": "GET",
            "headers": kolonial.headers
        };
        return request(options);
    },
    getCheeses: function () {
        var options = {
            // 42 = pålegg
            "uri": 'https://kolonial.no/api/v1/productcategories/142',
            "method": "GET",
            "headers": kolonial.headers
        };
        return request(options);
    }
}

kolonial.login();

// See: https://api.slack.com/methods/chat.postMessage
// web.chat.postMessage({ channel: conversationId, text: 'Hello there from WEB-API' })
//     .then((res) => {
//         // `res` contains information about the posted message
//         console.log('Message sent: ', res.ts);
//     })
//     .catch(console.error);