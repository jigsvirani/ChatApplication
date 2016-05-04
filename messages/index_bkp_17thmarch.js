/*
 * @package     Simple chat application and Web Service.   
 * @author      Jignesh Virani <jignesh@creolestudios.com>
 * @author      Another Author <another@example.com>
 * @copyright   2016 Creole Studios
 * @description This is chat application with mysql database connection.
 *              This file contains other dependencies like apn, socket.io, and other required libraries.
 * @warning     Before do any changes in this file inform author***.
 * @Dev Tools   Expressjs, NodeJs,Socket.io, MySql. 
 * @version    Release: 0.0.1 
 */

//http://54.65.152.9/

var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
io.set('heartbeat timeout', 8555);
io.set('heartbeat interval', 8555);
var fs = require('fs');
var bodyParser = require('body-parser')
app.use(bodyParser.json());
var mysql = require('mysql');
var router = express.Router();
var sockets = new Array();
var clients = new Array();
var chat_message = new Array();
var webSockets = {}; // userID: webSocket
var userlist = [];
var username = {};
var allClients = [];
var users = [];
var jsonData = {};

var apn = require('apn');
var gcm = require('node-gcm');

//For print a flag.
var print_flag = true;

//var AVATAR_URL = 'http://192.168.0.209/likenotenew-web/uploads/user/thumb/';
var AVATAR_URL = 'http://test.likenote.me/uploads/user/thumb/';
var BLOG_IMAGE_URL = 'http://test.likenote.me/uploads/blogs/thumb/'

var options = {
    "cert": "ck.pem",
    "key": "key.pem",
    "passphrase": '123456',
    "gateway": "gateway.sandbox.push.apple.com",
    "port": 2195,
    "enhanced": true,
    "cacheLength": 5
};

//var message1 = new gcm1.Message();
//
//message1.addData('key1', 'msg1');
//
//// Set up the sender with you API key
//var sender = new gcm1.Sender('AIzaSyDHmjbOb6VUq6r5e_1mozVNzOPuNxl4-5s');
//var regIds = ['dIuJq6dZjJM:APA91bF3bm_MFKbw970q96mDaLQ4VwxvsnJIPTk13ROvaoOgQVW1P0uKgw1GZ351URSd-dXW_FGMAp9Oz-7opWtFAi2bqZDAhYk0zwbXdL7KZp6b4NNZwaP2iZkaCLHbqggMsiAuIT9h'];
// console.log(regIds);
//sender.send(message1, { registrationIds: regIds }, function (err, result) {
//    if(err) console.error(err);
//    else    console.log(result);
//});


//Temparary push notification.
//var apnConnection1 = new apn.Connection(options);
//var note1 = new apn.Notification();
//var myDevice1 = new apn.Device("b88f38afa524e3f12e262e2fb256fc13937e361303fd4d0529d72816178787b9");
//note1.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
//
//// note.badge = 3;
//note1.sound = "ping.aiff";
//note1.alert = 'This is test push notification.';
//note1.payload = {'messageFrom': 'CreoleStudios', 'thread_id': '8weec5o2yb9', 'type_noti': 'message'};
//apnConnection1.pushNotification(note1, myDevice1);

//End Temparary push notification.

//Function for push notification.
function send_message(note, apnConnection, myDevice, push_mesage, push_thread_id, push_msg_type, user_id, message_title) {
    
    //conver message to string from unicode
    var TempMessage = message_title;
    var Regex = /\\u([\d\w]{4})/gi;
    TempMessage = TempMessage.replace(Regex, function (match, grp) {
    return String.fromCharCode(parseInt(grp, 16)); } );
    TempMessage = unescape(TempMessage);

    var apnConnection = new apn.Connection(options),
        note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    // note.badge = 3;
    note.sound = "ping.aiff";
    //note.alert = TempMessage;
    note.alert = TempMessage;
    note.thread_id = push_thread_id;
    note.msg_type = push_msg_type;
    note.payload = {
        'thread_id': push_thread_id,
        'notification_type': push_msg_type,
        'user_id': user_id,
        'message_title': push_mesage
    };
    return apnConnection.pushNotification(note, myDevice);
}

function send_message_android(push_device_token, push_mesage, push_thread_id, push_msg_type, user_id) {

    try {
        var message = new gcm.Message();
        message.addData({
            'sound': 'ping.aiff',
            'alert': push_mesage,
            'thread_id': push_thread_id,
            'notification_type': push_msg_type,
            'user_id': user_id,
            
        });
        // Set up the sender with you API key
        var sender = new gcm.Sender('AIzaSyDHmjbOb6VUq6r5e_1mozVNzOPuNxl4-5s');
        //var regIds = ['dnKLcd-LgL4:APA91bGzMYxYeYgK2mSwZftY6PCeDx3Q4lirXjKHDpU-WzpJfsrCzC4davr67wEHE5wkN6MkJPKGVv2wUHxyJGlGp2wEY_nSQDCHrroilP0_c94PNwJvu1h9pZzEUsLIEsljhMp80OXh'];
        var regIds = [push_device_token];

        sender.send(message, {
            registrationIds: regIds
        }, function (err, result) {
            if (err)
                throw err;
            else
                console.log('working');
        });
    } catch (err) {
        console.log(err);
    }
}



//End push notification.
app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

//For mysql connection.
var connection = mysql.createConnection({

    host: '192.168.0.209',
    user: 'root',
    password: '',
    database: 'like_note_new'

//                     host: 'localhost',
//                    user: 'root',
//                    password: 'likenote123',
//                    database: 'likenote'

});

connection.connect(function (err) {
    if (!err) {
        console.log("Database is connected ... \n\n");
    } else {
        console.log("Error connecting database ... \n\n");
    }
});

Number.prototype.padLeft = function (base, chr) {
        var len = (String(base || 10).length - String(this).length) + 1;
        return len > 0 ? new Array(len).join(chr || '0') + this : this;
    }
    //For message apeeal.
io.on('connection', function (socket) {

    try {
        if (socket.handshake.query.user_id != '' && typeof (socket.handshake.query.user_id) != 'undefined') {
            userlist[socket.handshake.query.user_id] = socket;
            allClients.push(socket);
            console.log('user id--->' + socket.handshake.query.user_id);
        }
    } catch (err) {
        console.log(err);
    }

    //To add new user to chat room.
    socket.on('addUser', function (name) {

        allClients.push(socket);
        socket.user = name;
        users.push(name);
        userlist[name] = socket;
        print_data('connected user-->' + name);

    });

    // Hook for an update and match part from php side.
    app.post('/activitymatchupdate', function (req, res) {
        var content = req.body;
        funmatchactivity(content.user_id, content.to_user)
        console.log('message received from php: ' + content.to_user);
        res.end('ok');
    });

    // Hook for an update and match part from php side.
    app.post('/activitylikeupdate', function (req, res) {
        var content = req.body;
        funlikeactivity(content.user_id)
        console.log('message received from php: ' + content.user_id);
        res.end('ok');
    });
    
    
     // Hook for an update and match part from php side.
//    app.post('/activitydislike', function (req, res) {
//        var content = req.body;
//        fundislikeactivity(content.user_id)
//        console.log('message received from php: ' + content.user_id);
//        res.end('ok');
//    });
    
    // function for update user(Match activity part) 
    function funmatchactivity(user_id, to_user) {

        try {
            
            var matchcountarray = [];
            var matchcount = {};
            // Notification of count.
            var notificationcount = connection.query('SELECT COUNT(match_activity_id) as badge FROM match_activities WHERE to_user_id = ' + to_user + ' and read_status = 0', function (err, rows, fields) {

                if (!err) {
                     matchcount.matchactivity = rows[0].badge;
                }
                //For badge count.
                if (userlist.hasOwnProperty(to_user)) {
                    matchcountarray.push({
                                    'unread_count': matchcount
                                });
                    userlist[to_user].emit('onMatchbadge', JSON.stringify(matchcountarray));
                }
            });
        } catch (err) {
            console.log('Error in functionmatchactivity:' + err);
        }
    }


    // Function for update user(Like activty part)
    function funlikeactivity(user_id) {

        try {
            //
            var activitycountarray = [];
            var activitycount = {};

            // Notification of count.
            var notificationcount = connection.query('SELECT user_id FROM like_activities WHERE user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) AND like_user_id = ' + user_id + ' AND read_status = 0 GROUP BY(user_id)', function (err, rows, fields) {
                if (!err) {
                    if (rows.length > 0) {
                        //activitycount.likeactivity = 1;
                        activitycount.likeactivity = 1;
                        for (i = 0; i < rows.length; i++) {
                            //For badge count.
                            if (userlist.hasOwnProperty(rows[i].user_id)) {
                                activitycountarray.push({
                                    'unread_count': activitycount
                                });
                                userlist[rows[i].user_id].emit('onactivitybadge', JSON.stringify(activitycountarray));
                            }
                        }
                    }
                } else {
                    console.log('Error like activity:' + err);
                }
            });
        } catch (err) {
            console.log(err);
        }
    }

    ////////////////////////////////////////////// askLikeActivity //////////////////////////////////////////////////////////
    
    socket.on('askLikeActivity', function (user_id, offset) {
       
        var likeactivity = [];
        var likecount = [];
        var likedata = [];
        var matchcount = {};

        try {

            var friendlist = connection.query('SELECT la.user_id,la.like_activity_id, uu.name, CONCAT("' + AVATAR_URL + '","",uu.profile_image) as profile_image , la.user_id,la.created_date, la.blog_id, la.like_user_id, la.activity_text, pp.title, pp.description, ppc.post_id, cc.title as category_name, GROUP_CONCAT(distinct cc.id) as categories_id FROM like_activities la LEFT JOIN posts pp ON pp.id = la.blog_id LEFT JOIN posts_categories ppc ON pp.id = ppc.post_id LEFT JOIN categories cc ON cc.id = ppc.category_id LEFT JOIN `user` uu ON uu.id = la.like_user_id WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) GROUP BY (la.like_activity_id) ORDER BY (la.like_activity_id) DESC LIMIT 10 OFFSET ' + offset + '', function (err, rows, fields) {
               // connection.query('SELECT FOUND_ROWS () as badge', function (err, rows) { // get the total number of rows 
                    likeactivityfuc(likeactivity);
               // });

                // like activity.
                function likeactivityfuc(likeactivity) {

                    if (!err) {
                        if (rows.length > 0) {
                            for (i = 0; i < rows.length; i++) {

                                likedata.push({
                                    user_id: rows[i].user_id,
                                    blog_id: rows[i].blog_id,
                                    user_name: rows[i].name,
                                    profile_image: rows[i].profile_image,
                                    like_user_id: rows[i].like_user_id,
                                    activity_text: rows[i].activity_text,
                                    blog_title: rows[i].title,
                                    blog_desc: rows[i].description,
                                    category_name: rows[i].category_name,
                                    category_id:  rows[i].categories_id,
                                    date_time: time_formate(rows[i].created_date)
                                });
                                try {
                                    connection.query('UPDATE like_activities SET read_status = ? WHERE like_activity_id = ? ', ['1', rows[i].like_activity_id]);

                                } catch (err) {
                                    console.log('like activity update query: ' + err);
                                }
                            }

                        } else {
                            likeactivity = [];
                        }
                        likecountdata(user_id)
                    } else {
                        console.log('Error in match list query:' + err);
                    }
                }
            });

            //Like count data.
            function likecountdata(user_id) {

                try {
                    // Notification of count.
                    var notificationcount = connection.query('SELECT count(la.user_id) as count_like FROM like_activities la WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) and read_status = 0', function (err, rows, fields) {
                        if (!err) {
                            if (rows.length > 0) {
                                matchcount.likeactivity = rows[0].count_like;
                                matchcountdata(matchcount, user_id);
                            }
                        }
                    });
                } catch (err) {
                    console.log('Error in functionmatchactivity:' + err);
                }
            }


            // match count data.
            function matchcountdata(matchcount, user_id) {

                try {
                    // Notification of count.
                    var notificationcount = connection.query('SELECT COUNT(match_activity_id) as badge FROM match_activities WHERE to_user_id = ' + user_id + ' and read_status = 0', function (err, rows, fields) {
                        if (!err) {
                            if (rows.length > 0) {
                                matchcount.matchactivity = rows[0].badge;
                            }

                        }
                        if (userlist.hasOwnProperty(user_id)) {

                            likeactivity.push({
                                'unread_count': matchcount
                            });
                            likeactivity.push({
                                'data': likedata
                            });
                            
                            userlist[user_id].emit('returnLikeActivity', JSON.stringify(likeactivity));
                        }
                    });
                } catch (err) {
                    console.log('Error in functionmatchactivity:' + err);
                }
            }
        } catch (err) {
            console.log('Error in match list:' + err);
        }
    });

    ////////////////////////////////////////////// End askLikeActivity //////////////////////////////////////////////////////////
    
    
    
    
    ////////////////////////////////////////////// askMatchActivity //////////////////////////////////////////////////////////
    

    socket.on('askMatchActivity', function (user_id, offset) {

        var matchactivity = [];
        var matchcountarray = {};
        var matchdata = [];
        var updateIdsArray = [];
        
        try {
            //
            var matchquery = connection.query('SELECT ma.match_activity_id, ma.from_user_id, ma.to_user_id, ma.activity_text, ma.created_date, ma.`status`, u.`name`, CONCAT("' + AVATAR_URL + '","",u.profile_image) as profile_image FROM match_activities ma LEFT JOIN `user` u ON from_user_id = u.id WHERE ma.to_user_id = '+ user_id +' AND ma.`status` = 2 UNION SELECT ma2.match_activity_id, ma2.from_user_id, ma2.to_user_id, ma2.activity_text, ma2.created_date, ma2.`status`, u.`name`, CONCAT("' + AVATAR_URL + '","",u.profile_image) as profile_image FROM match_activities ma2 LEFT JOIN `user` u ON from_user_id = u.id WHERE to_user_id = '+ user_id +' AND ma2.`status` = 1 ORDER BY created_date DESC LIMIT 10 OFFSET ' + offset + '', function (err, rows, fields) {

                if (!err) {
                    if (rows.length > 0) {
                        for (i = 0; i < rows.length; i++) {

                            matchdata.push({
                                match_activity_id: rows[i].match_activity_id,
                                from_id: rows[i].from_user_id,
                                to_id: rows[i].to_user_id,
                                text: rows[i].activity_text,
                                status: rows[i].status,
                                profile_image: rows[i].profile_image,
                                name: rows[i].name,
                                date_time: time_formate(rows[i].created_date)
                            });

                            //To update Match activity read status as 1(read)
                            try {
                                var change_status = connection.query('UPDATE match_activities  SET read_status = ? WHERE  match_activity_id = ?', ['1', rows[i].match_activity_id]);
                            } catch (err) {
                                console.log('Error in  update query:' + err);
                            }
                        }
                    } else {
                        matchactivity = [];
                    }
                    matchdatacountfuc(user_id, matchcountarray)
                } else {
                    console.log('Error in match query' + err);
                }
            });
        } catch (err) {
            console.log('Error in match activity:' + err);
        }

        function matchdatacountfuc(user_id, matchcountarray) {

            //First get count of record.
            try {
                // Notification of count.
                var notificationcount = connection.query('SELECT COUNT(match_activity_id) as badge FROM match_activities WHERE to_user_id = ' + user_id + ' and read_status = 0', function (err, rows, fields) {

                    if (!err) {

                        matchcountarray.matchactivity = rows[0].badge;
                        likecountdata(user_id, matchcountarray)

                    }
                });
            } catch (err) {
                console.log('Error in Badge count:' + err);
            }
        }


        function likecountdata(user_id, matchcountarray) {

            try {
                // Notification of count.
                var notificationcount = connection.query('SELECT count(la.user_id) as  count_like FROM like_activities la WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) and read_status = 0', function (err, rows, fields) {
                    if (!err) {
                        if (rows.length > 0) {
                            matchcountarray.likeactivity = rows[0].count_like;
                        }
                    }
                    if (userlist.hasOwnProperty(user_id)) {
                        matchactivity.push({
                            'unread_count': matchcountarray
                        });
                        matchactivity.push({
                            'data': matchdata
                        });

                        userlist[user_id].emit('returnMatchActivity', JSON.stringify(matchactivity));
                    }
                });
            } catch (err) {
                console.log('Error in functionmatchactivity:' + err);
            }
        }
    });
    
    ////////////////////////////////////////////// End askMatchActivity //////////////////////////////////////////////////////////
    
    //////////////////////////////////////////////// ask for pull to refresh logic in like activkity /////////////////////////
    
    socket.on('askPullLikeActivity', function (user_id, offset, pull_date) {
       
        var likeactivity = [];
        var likecount = [];
        var likedata = [];
        var matchcount = {};

        try {

            var friendlist = connection.query('SELECT la.user_id,la.like_activity_id, uu.name, CONCAT("' + AVATAR_URL + '","",uu.profile_image) as profile_image , la.user_id,la.created_date, la.blog_id, la.like_user_id, la.activity_text, pp.title, pp.description, ppc.post_id, cc.title as category_name FROM like_activities la LEFT JOIN posts pp ON pp.id = la.blog_id LEFT JOIN posts_categories ppc ON pp.id = ppc.post_id LEFT JOIN categories cc ON cc.id = ppc.category_id LEFT JOIN `user` uu ON uu.id = la.like_user_id WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) AND  la.created_date >= DATE_FORMAT(\'' + pull_date + '\',\'%Y-%m-%d %H:%i:%s\') GROUP BY (la.blog_id) ORDER BY (la.like_activity_id) DESC LIMIT 10 OFFSET ' + offset + '', function (err, rows, fields) {
               // connection.query('SELECT FOUND_ROWS () as badge', function (err, rows) { // get the total number of rows 
                    likeactivityfuc(likeactivity);
               // });

                // like activity.
                function likeactivityfuc(likeactivity) {

                    if (!err) {
                        if (rows.length > 0) {
                            for (i = 0; i < rows.length; i++) {

                                likedata.push({
                                    user_id: rows[i].user_id,
                                    blog_id: rows[i].blog_id,
                                    user_name: rows[i].name,
                                    profile_image: rows[i].profile_image,
                                    like_user_id: rows[i].like_user_id,
                                    activity_text: rows[i].activity_text,
                                    blog_title: rows[i].title,
                                    blog_desc: rows[i].description,
                                    category_name: rows[i].category_name,
                                    date_time: time_formate(rows[i].created_date)
                                });
                                try {
                                    connection.query('UPDATE like_activities SET read_status = ? WHERE like_activity_id = ? ', ['1', rows[i].like_activity_id]);

                                } catch (err) {
                                    console.log('like activity update query: ' + err);
                                }
                            }

                        } else {
                            likeactivity = [];
                        }
                        likecountdata(user_id)
                    } else {
                        console.log('Error in match list query:' + err);
                    }
                }
            });

            //Like count data.
            function likecountdata(user_id) {

                try {
                    // Notification of count.
                    var notificationcount = connection.query('SELECT count(la.user_id) as  count_like FROM like_activities la WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) and read_status = 0', function (err, rows, fields) {
                        if (!err) {
                            if (rows.length > 0) {
                                matchcount.likeactivity = rows[0].count_like;
                                matchcountdata(matchcount, user_id);
                            }
                        }
                    });
                } catch (err) {
                    console.log('Error in functionmatchactivity:' + err);
                }
            }


            // match count data.
            function matchcountdata(matchcount, user_id) {

                try {
                    // Notification of count.
                    var notificationcount = connection.query('SELECT COUNT(match_activity_id) as badge FROM match_activities WHERE to_user_id = ' + user_id + ' and read_status = 0', function (err, rows, fields) {
                        if (!err) {
                            if (rows.length > 0) {
                                matchcount.matchactivity = rows[0].badge;
                            }
                        }
                        if (userlist.hasOwnProperty(user_id)) {

                            likeactivity.push({
                                'unread_count': matchcount
                            });
                            likeactivity.push({
                                'data': likedata
                            });
                            
                            userlist[user_id].emit('returnLikeActivity', JSON.stringify(likeactivity));
                        }
                    });
                } catch (err) {
                    console.log('Error in functionmatchactivity:' + err);
                }
            }
        } catch (err) {
            console.log('Error in match list:' + err);
        }
    });
    
    //////////////////////////////////////////////// end pull to refresh for like activity //////////////////////////////
    
    
    ///////////////////////////////////////// ask pull match activity ///////////////////////////////////////////////////
    
    socket.on('askPullMatchActivity', function (user_id, offset, pull_date) {
         
        var matchactivity = [];
        var matchcountarray = {};
        var matchdata = [];
        var updateIdsArray = [];
        
        try {
            //
            var matchquery = connection.query('SELECT ma.match_activity_id, ma.from_user_id, ma.to_user_id, ma.activity_text, ma.created_date, ma.`status`, u.`name`, CONCAT("' + AVATAR_URL + '","",u.profile_image) as profile_image FROM match_activities ma LEFT JOIN `user` u ON from_user_id = u.id WHERE ma.to_user_id = '+ user_id +' AND ma.`status` = 2 AND ma.created_date >= DATE_FORMAT(\'' + pull_date + '\',\'%Y-%m-%d %H:%i:%s\') UNION SELECT ma2.match_activity_id, ma2.from_user_id, ma2.to_user_id, ma2.activity_text, ma2.created_date, ma2.`status`, u.`name`, CONCAT("' + AVATAR_URL + '","",u.profile_image) as profile_image FROM match_activities ma2 LEFT JOIN `user` u ON from_user_id = u.id WHERE to_user_id = '+ user_id +' AND ma2.`status` = 1 AND ma2.created_date > DATE_FORMAT(\'' + pull_date + '\',\'%Y-%m-%d %H:%i:%s\') ORDER BY created_date DESC LIMIT 10 OFFSET ' + offset + '', function (err, rows, fields) {

                if (!err) {
                    if (rows.length > 0) {
                        for (i = 0; i < rows.length; i++) {

                            matchdata.push({
                                match_activity_id: rows[i].match_activity_id,
                                from_id: rows[i].from_user_id,
                                to_id: rows[i].to_user_id,
                                text: rows[i].activity_text,
                                status: rows[i].status,
                                profile_image: rows[i].profile_image,
                                name: rows[i].name,
                                date_time: time_formate(rows[i].created_date)
                            });

                            //To update Match activity read status as 1(read)
                            try {
                                var change_status = connection.query('UPDATE match_activities  SET read_status = ? WHERE  match_activity_id = ?', ['1', rows[i].match_activity_id]);
                            } catch (err) {
                                console.log('Error in  update query:' + err);
                            }
                        }
                    } else {
                        matchactivity = [];
                    }
                    matchdatacountfuc(user_id, matchcountarray)
                } else {
                    console.log('Error in match query' + err);
                }
            });
        } catch (err) {
            console.log('Error in match activity:' + err);
        }

        function matchdatacountfuc(user_id, matchcountarray) {

            //First get count of record.
            try {
                // Notification of count.
                var notificationcount = connection.query('SELECT COUNT(match_activity_id) as badge FROM match_activities WHERE to_user_id = ' + user_id + ' and read_status = 0', function (err, rows, fields) {

                    if (!err) {

                        matchcountarray.matchactivity = rows[0].badge;
                        likecountdata(user_id, matchcountarray)

                    }
                });
            } catch (err) {
                console.log('Error in Badge count:' + err);
            }
        }


        function likecountdata(user_id, matchcountarray) {

            try {
                // Notification of count.
                var notificationcount = connection.query('SELECT count(la.user_id) as  count_like FROM like_activities la WHERE la.user_id = ' + user_id + ' AND la.like_user_id IN ( SELECT to_user_id FROM match_activities WHERE from_user_id = ' + user_id + ' AND `status` = 2 ) and read_status = 0', function (err, rows, fields) {
                    if (!err) {
                        if (rows.length > 0) {
                            matchcountarray.likeactivity = rows[0].count_like;
                        }
                    }
                    if (userlist.hasOwnProperty(user_id)) {
                        matchactivity.push({
                            'unread_count': matchcountarray
                        });
                        matchactivity.push({
                            'data': matchdata
                        });

                        userlist[user_id].emit('returnMatchActivity', JSON.stringify(matchactivity));
                    }
                });
            } catch (err) {
                console.log('Error in functionmatchactivity:' + err);
            }
        }
    });
    
    ///////////////////////////////////////// end pull match activity //////////////////////////////////////////////////
    
    
    /////////////////////////////////////////////// askUserList //////////////////////////////////////////////////////////
    
    socket.on('askUserList', function (user_id) {

        try {

            if (user_id !== "") {
                var change_status = connection.query('UPDATE messages m  SET m.read_flag = ? WHERE  m.to_user =?  AND m.read_flag != 2 AND m.read_flag = 0', ['1', user_id]);
                var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT( "' + AVATAR_URL + '", "", u.profile_image ) AS profile_pic, u.`name` AS user_name, u1.id AS userId1, CONCAT( "' + AVATAR_URL + '", "", u1.profile_image ) AS profile_pic1, u1.`name` AS user_name1, ul.created_date AS liked_date, ul.thread_id, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND ( m.to_user = ' + user_id + ' AND m.thread_id = ul.thread_id ) ) AS unread_msg, IFNULL( ( SELECT msg FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY m.id DESC LIMIT 1 ), "" ) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL( ( SELECT b.title FROM posts b WHERE b.id = last_msg ), 0 ) AS blogDesc, IFNULL( ( SELECT msg_type FROM messages m WHERE m.thread_id = ul.thread_id ORDER BY m.id DESC LIMIT 1 ), 0 ) AS msg_type FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ' ) AND ul.`status` = 2 ORDER BY (liked_date) DESC', function (err, rows, fields) {
                //var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT("' + AVATAR_URL + '","",u.profile_image) AS profile_pic, u.`name` AS user_name, u1.id AS userId1,CONCAT("' + AVATAR_URL + '","",u1.profile_image) AS profile_pic1, u1.`name` AS user_name1, ul.created_date as liked_date, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND( m.to_user = ' + user_id + ' AND m.from_user = to_like_id ) ) AS unread_msg, IFNULL(( SELECT msg FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY m.id DESC LIMIT 1 ),0) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL(( SELECT b.title FROM posts b WHERE b.id = last_msg ),0) AS blogDesc, IFNULL(( SELECT msg_type FROM messages m WHERE ( m.to_user = ul.to_user_id OR m.from_user = ul.to_user_id ) ORDER BY m.id DESC LIMIT 1 ), 0) AS msg_type,ul.thread_id FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ') AND ul.`status` = 2 ORDER BY (liked_date) DESC', function (err, rows, fields) {
                    if (!err) {
                        clients = [];
                        if (rows.length > 0) {

                            for (i = 0; i < rows.length; i++) {

                                var blog_desc = '';
                                var from_user_send = '0';

                                if (!rows[i].from_user)
                                    from_user_send = 0;
                                else
                                    from_user_send = rows[i].from_user;

                                if (rows[i].to_like_id != user_id) {
                                   // add_delivered_status(rows[i].userId, name);
                                    clients.push({
                                        user_id: rows[i].userId,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name,
                                        thread_id: rows[i].thread_id
                                    });
                                } else {
                                  //  add_delivered_status(rows[i].userId1, name);
                                    clients.push({
                                        user_id: rows[i].userId1,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic1,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name1,
                                        thread_id: rows[i].thread_id
                                    });
                                }
                            }
                            after_count(clients);
                        } else {
                            after_count(clients);
                        }
                    } else {
                        console.log(err);
                    }
                });
            }

        } catch (err) {
            console.log('Error in  ask userlist channel:' + err);
        }
        
        function after_count(clients) {
            var jsonStr = JSON.stringify(clients);
            if (userlist.hasOwnProperty(user_id)) {
                if (jsonStr)
                    userlist[user_id].emit('returnUserList', jsonStr);
                else
                    userlist[user_id].emit('returnUserList', {
                        'user_data': ''
                    });
            }
        }
    });
    
    
    ////////////////////////////////////////////// End askUserList //////////////////////////////////////////////////////////
    
     /////////////////////////////////////////////// askUserListNew //////////////////////////////////////////////////////////
    
    socket.on('askUserListNew', function (user_id) {

        try {

            if (user_id !== "") {
                var change_status = connection.query('UPDATE messages m  SET m.read_flag = ? WHERE  m.to_user =?  AND m.read_flag != 2 AND m.read_flag = 0', ['1', user_id]);
                var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT( "' + AVATAR_URL + '", "", u.profile_image ) AS profile_pic, u.`name` AS user_name, u1.id AS userId1, CONCAT( "' + AVATAR_URL + '", "", u1.profile_image ) AS profile_pic1, u1.`name` AS user_name1, ul.created_date AS liked_date, ul.thread_id, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND ( m.to_user = ' + user_id + ' AND m.thread_id = ul.thread_id ) ) AS unread_msg, IFNULL( ( SELECT msg FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY m.id DESC LIMIT 1 ), "" ) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL( ( SELECT b.title FROM posts b WHERE b.id = last_msg ), 0 ) AS blogDesc, IFNULL( ( SELECT msg_type FROM messages m WHERE m.thread_id = ul.thread_id ORDER BY m.id DESC LIMIT 1 ), 0 ) AS msg_type FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ' ) AND ul.`status` = 2 ORDER BY (liked_date) DESC', function (err, rows, fields) {
                //var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT("' + AVATAR_URL + '","",u.profile_image) AS profile_pic, u.`name` AS user_name, u1.id AS userId1,CONCAT("' + AVATAR_URL + '","",u1.profile_image) AS profile_pic1, u1.`name` AS user_name1, ul.created_date as liked_date, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND( m.to_user = ' + user_id + ' AND m.from_user = to_like_id ) ) AS unread_msg, IFNULL(( SELECT msg FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY m.id DESC LIMIT 1 ),0) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL(( SELECT b.title FROM posts b WHERE b.id = last_msg ),0) AS blogDesc, IFNULL(( SELECT msg_type FROM messages m WHERE ( m.to_user = ul.to_user_id OR m.from_user = ul.to_user_id ) ORDER BY m.id DESC LIMIT 1 ), 0) AS msg_type,ul.thread_id FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ') AND ul.`status` = 2 ORDER BY (liked_date) DESC', function (err, rows, fields) {
                    if (!err) {
                        clients = [];
                        if (rows.length > 0) {

                            for (i = 0; i < rows.length; i++) {

                                var blog_desc = '';
                                var from_user_send = '0';

                                if (!rows[i].from_user)
                                    from_user_send = 0;
                                else
                                    from_user_send = rows[i].from_user;

                                if (rows[i].to_like_id != user_id) {
                                   // add_delivered_status(rows[i].userId, name);
                                    clients.push({
                                        user_id: rows[i].userId,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name,
                                        thread_id: rows[i].thread_id
                                    });
                                } else {
                                  //  add_delivered_status(rows[i].userId1, name);
                                    clients.push({
                                        user_id: rows[i].userId1,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic1,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name1,
                                        thread_id: rows[i].thread_id
                                    });
                                }
                            }
                            after_count(clients);
                        } else {
                            after_count(clients);
                        }
                    } else {
                        console.log(err);
                    }
                });
            }

        } catch (err) {
            console.log('Error in  ask userlist channel:' + err);
        }
        
        function after_count(clients) {
            var jsonStr = JSON.stringify(clients);
            if (userlist.hasOwnProperty(user_id)) {
                if (jsonStr)
                    userlist[user_id].emit('returnUserListNew', jsonStr);
                else
                    userlist[user_id].emit('returnUserListNew', {
                        'user_data': ''
                    });
            }
        }
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    
    
    
    ////////////////////////////////////////////// start askUserLatestList //////////////////////////////////////////////////
    
    
    socket.on('askUserLatestList', function (user_id,  pull_date) {

        try {

            if (user_id !== "") {
                var change_status = connection.query('UPDATE messages m  SET m.read_flag = ? WHERE  m.to_user =?  AND m.read_flag != 2 AND m.read_flag = 0', ['1', user_id]);
                var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT( "' + AVATAR_URL + '", "", u.profile_image ) AS profile_pic, u.`name` AS user_name, u1.id AS userId1, CONCAT( "' + AVATAR_URL + '", "", u1.profile_image ) AS profile_pic1, u1.`name` AS user_name1, ul.created_date AS liked_date, ul.thread_id, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND ( m.to_user = ' + user_id + ' AND m.thread_id = ul.thread_id ) ) AS unread_msg, IFNULL( ( SELECT msg FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY m.id DESC LIMIT 1 ), "" ) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( m.thread_id = ul.thread_id ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL( ( SELECT b.title FROM posts b WHERE b.id = last_msg ), 0 ) AS blogDesc, IFNULL( ( SELECT msg_type FROM messages m WHERE m.thread_id = ul.thread_id ORDER BY m.id DESC LIMIT 1 ), 0 ) AS msg_type FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ' ) AND ul.`status` = 2 AND ul.created_date >= DATE_FORMAT(\'' + pull_date + '\',\'%Y-%m-%d %H:%i:%s\') ORDER BY (liked_date) DESC', function (err, rows, fields) {
                //var temp = connection.query('SELECT ul.from_user_id AS from_like_id, ul.to_user_id AS to_like_id, u.id AS userId, CONCAT("' + AVATAR_URL + '","",u.profile_image) AS profile_pic, u.`name` AS user_name, u1.id AS userId1,CONCAT("' + AVATAR_URL + '","",u1.profile_image) AS profile_pic1, u1.`name` AS user_name1, ul.created_date as liked_date, ( SELECT COUNT(m.msg) FROM messages m WHERE read_flag != 2 AND( m.to_user = ' + user_id + ' AND m.from_user = to_like_id ) ) AS unread_msg, IFNULL(( SELECT msg FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY m.id DESC LIMIT 1 ),0) AS last_msg, ( SELECT m.created_date FROM messages m WHERE ( (m.to_user = ' + user_id + ' AND m.from_user = u.id ) OR (m.from_user = ' + user_id + ' AND m.to_user = u.id) ) ORDER BY (m.id) DESC LIMIT 1 ) AS last_msg_time, IFNULL(( SELECT b.title FROM posts b WHERE b.id = last_msg ),0) AS blogDesc, IFNULL(( SELECT msg_type FROM messages m WHERE ( m.to_user = ul.to_user_id OR m.from_user = ul.to_user_id ) ORDER BY m.id DESC LIMIT 1 ), 0) AS msg_type,ul.thread_id FROM match_activities ul LEFT JOIN `user` u ON u.id = ul.to_user_id LEFT JOIN `user` u1 ON u1.id = ul.from_user_id WHERE ( ul.to_user_id = ' + user_id + ') AND ul.`status` = 2 ORDER BY (liked_date) DESC', function (err, rows, fields) {
                    if (!err) {
                        clients = [];
                        if (rows.length > 0) {

                            for (i = 0; i < rows.length; i++) {

                                var blog_desc = '';
                                var from_user_send = '0';

                                if (!rows[i].from_user)
                                    from_user_send = 0;
                                else
                                    from_user_send = rows[i].from_user;

                                if (rows[i].to_like_id != user_id) {
                                   // add_delivered_status(rows[i].userId, name);
                                    clients.push({
                                        user_id: rows[i].userId,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name,
                                        thread_id: rows[i].thread_id
                                    });
                                } else {
                                  //  add_delivered_status(rows[i].userId1, name);
                                    clients.push({
                                        user_id: rows[i].userId1,
                                        unread_msg: rows[i].unread_msg,
                                        from_user: from_user_send,
                                        profile_image: rows[i].profile_pic1,
                                        last_msg: rows[i].last_msg,
                                        msg_type: rows[i].msg_type,
                                        blog_desc: rows[i].blogDesc,
                                        last_msg_time: return_date_function(rows[i].last_msg_time, rows[i].liked_date),
                                        user_name: rows[i].user_name1,
                                        thread_id: rows[i].thread_id
                                    });
                                }
                            }
                            after_count(clients);
                        } else {
                            after_count(clients);
                        }
                    } else {
                        console.log(err);
                    }
                });
            }

        } catch (err) {
            console.log('Error in  ask userlist channel:' + err);
        }
        
        function after_count(clients) {
            var jsonStr = JSON.stringify(clients);
            if (userlist.hasOwnProperty(user_id)) {
                if (jsonStr)
                    userlist[user_id].emit('returnUserList', jsonStr);
                else
                    userlist[user_id].emit('returnUserList', {
                        'user_data': ''
                    });
            }
        }
    });
    
    
    
    ////////////////////////////////////////////// end askUserLatestList ////////////////////////////////////////////////////
    String.prototype.toUnicode = function(){
    var result = "";
    for(var i = 0; i < this.length; i++){
        var partial = this[i].charCodeAt(0).toString(16);
        while(partial.length !== 4) partial = "0" + partial;
        result += "\\u" + partial;
    }
    return result;
};
    
    //////////////////////////////////////////  start Chat Message //////////////////////////////////////////////////////////
    
    //Send message to user.
    socket.on('onMessageSend', function (msg, to, from, msg_type, thread_id, stringconst) {
        var demon = '';
        if(msg_type == '0'){ 
           demon = msg.toUnicode();
        } if(msg_type == '1'){
           demon = msg;
        }
        
        try {

                //WHEN THREAD ID IS ALREADY GENERATED.
                if (userlist.hasOwnProperty(to)) {

                    //when user is online
//                    var date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    var date_time = convert_to_jst();
                    console.log(date_time);
                    var post = {
                        to_user: to,
                        from_user: from,
                        msg: demon,
                        read_flag: '0',
                        msg_type: msg_type,
                        thread_id: thread_id,
                        created_date: date_time
                    };
                    var query = connection.query('INSERT INTO messages SET?', post, function (error, result) {
                        if (error) {
                            console.log(error.message);
                        } else {
                            user_chat(result.insertId, to, from, stringconst);
                        }
                    });
                } else {
                    //when user is offline.
//                    var date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        var date_time = convert_to_jst();
                    console.log(date_time);
                    var post = {
                        to_user: to,
                        from_user: from,
                        msg: demon,
                        read_flag: '0',
                        msg_type: msg_type,
                        thread_id: thread_id,
                        created_date: date_time
                    };
                    var query = connection.query('INSERT INTO messages SET?', post, function (error, result) {
                        if (error) {
                            console.log(error.message);
                        } else {
                            user_chat(result.insertId, to, from, stringconst);
                        }
                    });
                }
           // }
        } catch (err) {
            console.log(err);
        }

        //Function for user response.
        function user_chat(msgid, to, from, stringconst, note, apnConnection) {
            
            try {
                //This is query response.
                var queryForResponse = connection.query('SELECT u.id as userid, ut.device_type, ut.notification_token, pc.color_code AS category_colorcode, pc.title AS category_name, u.`name` as user_name, CONCAT( "' + AVATAR_URL + '", "", u.profile_image ) AS profile_pic, m.thread_id, m.msg_type, m.read_flag AS message_flag, m.created_date, m.msg AS message_text, m.id AS message_id, IF (pc.id != \'\',pc.id,\'0\') AS category_id, IF ( b.title != \'\', b.title, \'0\' ) AS blog_title, IF (b.description != \'\',b.description,\'\') AS blog_desc, IF ( b.post_image != \'\', CONCAT( \'http://test.likenote.me/uploads/blogs/thumb/\', b.post_image ), \'0\' ) as post_image, IF (b.id != \'\', b.id, \'0\') AS blog_id FROM `user` u LEFT JOIN messages m ON u.id = m.from_user LEFT JOIN `user` m2 ON m2.id = m.to_user LEFT JOIN user_tokens ut ON m2.id = ut.user_id LEFT JOIN posts b ON b.id = m.msg LEFT JOIN posts_categories pcc ON pcc.post_id = b.id LEFT JOIN categories pc ON pc.id = pcc.post_id WHERE m.id =  \'' + msgid + '\' ', function (err, rows, fields) {
                   
                    var singlemsg = new Array();
                    var push_mesage = '';
                    var push_device_type = '';
                    var push_device_token = '';
                    var push_thread_id = '';
                    var push_user_id = '';
                    var push_device_token_android = '';
                    var push_msg_type = 'message';
                    var flag_message = '';
                    var  message_title = '';
                    
                    if (!err) {
                        if (rows.length > 0) {
                            for (i = 0; i < rows.length; i++) {

                                if (rows[i].msg_type == '0') {
                                    push_mesage = rows[i].user_name + 'さんから新しいメッセージが届きました。';
                                    message_title = rows[i].message_text;
                                }
                                if (rows[i].msg_type == '1') {
                                    push_mesage = rows[i].user_name + 'さんから新しいメッセージが届きました。';
                                    message_title = rows[i].blog_title;
                                }
                                    push_device_type = rows[i].device_type;
                                    push_device_token = rows[i].notification_token;
                                    push_device_token_android = rows[i].notification_token;
                                    push_thread_id = rows[i].thread_id;
                                    push_user_id = rows[i].userid;
                                   

                                singlemsg.push({
                                    user_id: rows[i].userid,
                                    category_colorcode: rows[i].category_colorcode,
                                    category_name: rows[i].category_name,
                                    blog_id: rows[i].blog_id,
                                    category_id: rows[i].category_id,
                                    blog_title: rows[i].blog_title,
                                    blog_desc: rows[i].blog_desc,
                                    blog_image: rows[i].post_image,
                                    profile_pic: rows[i].profile_pic,
                                    msg_text: rows[i].message_text,
                                    msg_id: rows[i].message_id,
                                    msg_flag: rows[i].message_flag,
                                    msg_type: rows[i].msg_type,
                                    user_name: rows[i].user_name,
                                    thread_id: rows[i].thread_id,
                                    //msg_time: time_formateLessMinutes(rows[i].created_date),
                                    msg_time: rows[i].created_date,
                                    string_const: stringconst
                                    
                                });
                                var from_temp = rows[0].userid;
                            }
                        }
                        if (userlist.hasOwnProperty(from_temp)) {
                            userlist[from_temp].emit('chat ack', JSON.stringify(singlemsg));
                        }
                        if (userlist.hasOwnProperty(to)) {
                            
                            userlist[to].emit('onMessageReceive', JSON.stringify(singlemsg));
                        
                        } else {
                            try {
                                
                                
                                var push_notification = connection.query('SELECT message_notification from `user` WHERE id = '+ to +'', function (err, rows, fields) {
                                 
                                    var pushflag = rows[0].message_notification;
                                    
                                     if (push_device_type == '1' && push_device_token !='' && pushflag == '1') {
                                   
                                        var myDevice = new apn.Device(push_device_token);
                                        send_message(note, apnConnection, myDevice, push_mesage, push_thread_id, push_msg_type, push_user_id, message_title);
                                    // if message send to push notification then status is deliver.
                                    var unread_messages = connection.query('UPDATE messages SET read_flag = ? WHERE id = ?', ['1', msgid]);
                                    }
                                    if (push_device_type == '2' && push_device_token_android != '') {
                                       // print_data(push_device_token_android);
                                      //  send_message_android(push_device_token_android, push_mesage, push_thread_id, push_msg_type, push_user_id);
                                    }
                                
                                });
                               
                            } catch (err) {
                                console.log(err);
                            }
                        }
                    } else {
                        console.log('Error!! While performing query.');
                    }
                });
            } catch (err) {
                console.log(err);
            }
        }
    });
    
    //////////////////////////////////////// End Chat Messages //////////////////////////////////////////////////////////////
    
    //////////////////////////////// Start user history /////////////////////////////////////////////////////////////////////
    
     //Ask new user history.
     //temporary.
    socket.on('askHistory', function (thread_id, from_user, to_name, offset) {
        
        try {
            //If user ask for his chat history that means that user message is read status.
            var unread_messages = connection.query('UPDATE messages SET read_flag = ? WHERE to_user = ? AND thread_id =?', ['2', from_user, thread_id]);
           
            var queryForResponse = connection.query('SELECT m.id, IF (b.id != \'\', b.id, \'0\') AS blog_id, IF (pc.color_code != \'\',pc.color_code,\'0\') AS category_colorcode, pc.title AS category_name, IF (pc.id != \'\',pc.id,\'0\') AS category_id, IF ( b.title != \'\', b.title, \'0\' ) AS blog_title, IF ( b.description != \'\', b.description, \'\' ) AS blog_desc, IF(b.post_image !=\'\',CONCAT(\'http://test.likenote.me/uploads/blogs/thumb/\',b.post_image),\'0\') as post_image, u.id AS user_id, u1.id AS user_id1, u.profile_image AS profile_pic, concat("http://test.likenote.me/uploads/user/thumb/","", u1.profile_image) AS profile_pic1, m.msg AS message_text, m.read_flag AS message_flag, m.id AS message_id, m.msg_type, m.to_user, m.from_user, u.`name` AS userName, u1.`name` AS userName1, m.created_date, m.thread_id FROM messages m LEFT JOIN `user` u ON u.id = m.to_user LEFT JOIN `user` u1 ON u1.id = m.from_user LEFT JOIN posts b ON b.id = m.msg LEFT JOIN posts_categories pcc ON pcc.post_id = b.id LEFT JOIN categories pc ON pc.id = pcc.post_id WHERE m.thread_id =  \'' + thread_id + '\' ORDER BY m.id DESC LIMIT 50 OFFSET ' + offset + '', function (err, rows, fields) {

                var return_history = new Array();
                var for_sender_user = new Array();
                if (!err) {
                    if (rows.length > 0) {
                        for (i = 0; i < rows.length; i++) {
                            
                            return_history.push({
                                user_id: rows[i].user_id1,
                                blog_id: rows[i].blog_id,
                                category_colorcode: rows[i].category_colorcode,
                                category_name: rows[i].category_name,
                                category_id: rows[i].category_id,
                                blog_title: rows[i].blog_title,
                                blog_desc: rows[i].blog_desc,
                                blog_image: rows[i].post_image,
                                profile_pic: rows[i].profile_pic1,
                                msg_text: rows[i].message_text,
                                msg_id: rows[i].message_id,
                                msg_flag: rows[i].message_flag,
                                msg_type: rows[i].msg_type,
                                user_name: rows[i].userName1,
                                thread_id: rows[i].thread_id,
                                //msg_time: time_formateLessMinutes(rows[i].created_date)
                                msg_time: rows[i].created_date
                            });
                            for_sender_user.push({
                                msg_flag: rows[i].message_flag,
                                msg_id: rows[i].message_id
                            });
                        }
                        if (userlist.hasOwnProperty(from_user)) {
                           
                            userlist[from_user].emit('returnHistory', JSON.stringify(return_history));
                            //for at time update when user get update.
                            if (userlist.hasOwnProperty(to_name)) {
                                userlist[to_name].emit('return_history_update', from_user);
                            }
                        }
                    } else {
                        if (userlist.hasOwnProperty(from_user)) {
                           userlist[from_user].emit('No messages');
                            var unread_messages = connection.query('UPDATE messages SET read_flag = ? WHERE to_user = ?', ['1', from_user]);
                        }
                    }
                } else {
                    userlist[from_user].emit('something went wrong');
                    console.log('this is history:' + err);
                }
            });
        } catch (err) {
            console.log('this is history error:'+ err);
        }
    });
    
    ///////////////////////////////// End user history //////////////////////////////////////////////////////////////////////
    
    //////////////////////////////////////// start blog user like(pull to refresh) //////////////////////////////////////////////////////////
    
        //For single user blog like.
        socket.on('ask_user_pullblog_like', function (from_user, blogpulloffset) {
         
            try {
                
               var queryForResponse = connection.query('SELECT c.id as category_id, c.color_code, c.title AS category_name, b.company_name, bl.created_date, b.created_date as blog_date, b.id as post_id, b.title, b.description, CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts b LEFT JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id INNER JOIN posts_like bl ON b.id = bl.post_id WHERE bl.user_id = ' + from_user + ' AND bl.`status` = \'1\' AND bl.created_date > \'' + blogpulloffset + '\' GROUP BY(b.id) ORDER BY bl.created_date DESC', function (err, rows, fields) {
               // var queryForResponse = connection.query('SELECT c.categoryId,c.categoryColorCode as category_colorcode, c.categoryName as category_name,b.companyName as company_name,b.date_published, b.blogId, b.blogTitle, b.blogDesc, CONCAT(\'http://52.69.246.194//uploads/blogs/thumb/\',b.image)as image FROM blog b INNER JOIN category c ON c.categoryId = b.categoryId INNER JOIN blog_likes bl ON b.blogId = bl.blogId WHERE bl.userId = \'' + from_user + '\' ', function (err, rows, fields) {

                    var return_blog = new Array();
                   
                    if (!err) {
                        
                        if (rows.length > 0) {
                            for (i = 0; i < rows.length; i++) {
                                return_blog.push({
                                    category_id: rows[i].category_id,
                                    blog_id: rows[i].post_id,
                                    category_colorcode: rows[i].color_code,
                                    category_name: rows[i].category_name,
                                    date_published: time_formate(rows[i].created_date),
                                    blog_created_date:  time_formate(rows[i].blog_date),
                                    company_name: rows[i].company_name,
                                    blog_title: rows[i].title,
                                    blog_desc: rows[i].description,
                                    blog_image: rows[i].image
                                });
                                
                            }
                            if (userlist.hasOwnProperty(from_user)) {
                                userlist[from_user].emit('return_user_pullblog_like', JSON.stringify(return_blog));
                            }
                        }else{
                            if (userlist.hasOwnProperty(from_user)) {
                                userlist[from_user].emit('return_user_pullblog_like', JSON.stringify(return_blog));
                            }
                        }
                    } else {
                       console.log('this is pull blog like error:' + err);
                    }
                });
            } catch (err) {
                console.log('this is ask pull blog like error:' + err);
            }
        });
    
    /////////////////////////////////////// end blog user like (pull to refresh) ////////////////////////////////////////////////////////////
    
    //////////////////////////////////////// start blog user like //////////////////////////////////////////////////////////
    
        //For single user blog like.
        socket.on('ask_user_blog_like', function (from_user, offset_pull) {
            
            try {
                
               var queryForResponse = connection.query('SELECT c.id as category_id, c.color_code, c.title AS category_name, b.company_name, bl.created_date, b.created_date as blog_date, b.id as post_id, b.title, b.description, CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts b LEFT JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id INNER JOIN posts_like bl ON b.id = bl.post_id WHERE bl.user_id = ' + from_user + ' AND bl.`status` = \'1\' GROUP BY bl.post_id ORDER BY bl.created_date DESC LIMIT 10 OFFSET '+ offset_pull +'', function (err, rows, fields) {
              //  var queryForResponse = connection.query('SELECT c.categoryId,c.categoryColorCode as category_colorcode, c.categoryName as category_name,b.companyName as company_name,b.date_published, b.blogId, b.blogTitle, b.blogDesc, CONCAT(\'http://52.69.246.194//uploads/blogs/thumb/\',b.image)as image FROM blog b INNER JOIN category c ON c.categoryId = b.categoryId INNER JOIN blog_likes bl ON b.blogId = bl.blogId WHERE bl.userId = \'' + from_user + '\' ', function (err, rows, fields) {

                    var return_blog = new Array();
                   
                    if (!err) {
                        
                        if (rows.length > 0) {
                            for (i = 0; i < rows.length; i++) {
                                return_blog.push({
                                    category_id: rows[i].category_id,
                                    blog_id: rows[i].post_id,
                                    category_colorcode: rows[i].color_code,
                                    category_name: rows[i].category_name,
                                    date_published: time_formate(rows[i].created_date),
                                    blog_created_date:  time_formate(rows[i].blog_date),
                                    company_name: rows[i].company_name,
                                    blog_title: rows[i].title,
                                    blog_desc: rows[i].description,
                                    blog_image: rows[i].image
                                });
                                 
                            }
                            if (userlist.hasOwnProperty(from_user)) {
                                userlist[from_user].emit('return_user_blog_like', JSON.stringify(return_blog));
                            }
                        }else{
                            if (userlist.hasOwnProperty(from_user)) {
                                userlist[from_user].emit('return_user_blog_like', JSON.stringify(return_blog));
                            }
                        }
                    } else {
                       console.log('this is blog like error:' + err);
                    }
                });
                //console.log(queryForResponse.sql);
            } catch (err) {
                console.log('this is ask blog like error:' + err);
            }
        });
    
    /////////////////////////////////////// end blog user like ////////////////////////////////////////////////////////////
    
    
    /////////////////////////////////////// start blog user pull blog ////////////////////////////////////////////////////////////
    
    //For both user blog like.
    socket.on('ask_bothuser_pullblog_like', function (from_user, to_user, pull_date) {
      
       //console.log('ask_bothuser_pullblog_like'+ pull_date);
        try {
           
            //ask both user like.
            // var queryForResponse = connection.query('SELECT c.id AS category_id, c.color_code, c.title AS category_name, b.company_name, bl.created_date, b.id AS post_id, b.title, b.description, CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts b LEFT JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id INNER JOIN posts_like bl ON b.id = bl.post_id WHERE bl.user_id = ' + from_user + ' AND bl.post_id IN ( SELECT post_id FROM posts_like WHERE user_id = ' + to_user + ' AND `status` = \'1\') AND bl.`status` = \'1\' AND bl.created_date > \'' + pull_date + '\' GROUP BY(b.id) ORDER BY bl.created_date DESC', function (err, rows, fields) {
           // var queryForResponse = connection.query('SELECT c.id AS category_id, c.color_code, c.title AS category_name, b.company_name, bl.created_date, b.created_date as blog_date, b.id AS post_id, b.title, b.description, CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts b LEFT JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id INNER JOIN posts_like bl ON b.id = bl.post_id WHERE bl.user_id = ' + from_user + ' AND bl.post_id IN ( SELECT post_id FROM posts_like WHERE user_id = ' + to_user + ' AND `status` = \'1\') AND bl.`status` = \'1\' AND bl.created_date > \'' + pull_date + '\'  ORDER BY bl.created_date DESC', function (err, rows, fields) {
             var queryForResponse = connection.query( 'SELECT c.id AS category_id, c.color_code, c.title AS category_name, b.company_name, pl2.id, pl2.created_date as datetopublish, pl2.post_id, pl2.user_id, b.company_name, b.created_date AS blog_date, b.id AS post_id, b.title, b.description,CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts_like pl1 JOIN posts_like pl2 ON pl2.post_id = pl1.post_id INNER JOIN posts b on pl2.post_id = b.id INNER JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id AND pl2.user_id = ' + to_user + ' AND pl2.status = 1 WHERE pl1.user_id = ' + from_user + ' AND pl1. STATUS = \'1\' AND pl2.created_date > \'' + pull_date + '\' GROUP BY b.id  ORDER BY date(pl2.created_date) DESC', function (err, rows, fields) {    
          //  var queryForResponse = connection.query('SELECT b.blogId, c.categoryColorCode AS category_colorcode, c.categoryName AS category_name, b.companyName AS company_name, b.date_published, c.categoryId, b.blogTitle, b.blogDesc, bl.userId, CONCAT(\'http://52.69.246.194/uploads/blog/thumb/\', b.image ) AS image FROM blog b INNER JOIN category c ON c.categoryId = b.categoryId INNER JOIN blog_likes bl ON b.blogId = bl.blogId WHERE bl.userId = ' + from_user + ' AND bl.blogId in ( SELECT blogId FROM blog_likes WHERE userId = ' + to_user + ')', function (err, rows, fields) {
                 //console.log(queryForResponse);
                var return_blog = new Array();
                if (!err) {
                    if (rows.length > 0) {
                        for (i = 0; i < rows.length; i++) {
                            
                            return_blog.push({
                                category_id: rows[i].category_id,
                                blog_id: rows[i].post_id,
                                category_colorcode: rows[i].color_code,
                                category_name: rows[i].category_name,
                                date_published: time_formate(rows[i].datetopublish),
                                blog_created_date: time_formate(rows[i].blog_date),
                                company_name: rows[i].company_name,
                                blog_title: rows[i].title,
                                blog_desc: rows[i].description,
                                blog_image: rows[i].image
                            });
                             
                        }
                        
                        if (userlist.hasOwnProperty(from_user)) {
                            userlist[from_user].emit('return_bothuser_pullblog_like', JSON.stringify(return_blog));
                        }
                    }else{
                       
                        if (userlist.hasOwnProperty(from_user)) {
                            userlist[from_user].emit('return_bothuser_pullblog_like', JSON.stringify(return_blog));
                        }
                    }
                } else {
                    console.log('this is error 1: '+err);
                }
            });
            //console.log(queryForResponse.sql);
        } catch (err) {
            console.log('this is error 2: '+err);
        }
    });
    
    
    
    ////////////////////////////////////// start both user like /////////////////////////////////////////////////////////
    
    //For both user blog like.
    socket.on('ask_bothuser_blog_like', function (from_user, to_user, offset_pull) {
        
        try {
            
            //ask both user like.
            // var queryForResponse = connection.query('SELECT c.id AS category_id, c.color_code, c.title AS category_name, b.company_name, bl.created_date,b.created_date as blog_date, b.id AS post_id, b.title, b.description, CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts b LEFT JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id INNER JOIN posts_like bl ON b.id = bl.post_id WHERE bl.user_id = ' + from_user + ' AND bl.post_id IN ( SELECT post_id FROM posts_like WHERE user_id = ' + to_user + ' AND status = \'1\') AND bl.`status` = \'1\' GROUP BY(b.id) ORDER BY bl.created_date DESC LIMIT  10 OFFSET '+ offset_pull +'', function (err, rows, fields) {
            var queryForResponse = connection.query( 'SELECT c.id AS category_id, c.color_code, c.title AS category_name, b.company_name, pl2.id, pl2.created_date as datetopublish, pl2.post_id, pl2.user_id, b.company_name, b.created_date AS blog_date, b.id AS post_id, b.title, b.description,CONCAT( \''+ BLOG_IMAGE_URL +'\', b.post_image ) as image FROM posts_like pl1 JOIN posts_like pl2 ON pl2.post_id = pl1.post_id INNER JOIN posts b on pl2.post_id = b.id INNER JOIN posts_categories pc ON pc.post_id = b.id INNER JOIN categories c ON c.id = pc.category_id AND pl2.user_id = ' + to_user + ' AND pl2.status = 1 WHERE pl1.user_id = ' + from_user + ' AND pl1. STATUS = \'1\'  GROUP BY pl2.post_id  ORDER BY pl2.created_date DESC LIMIT  10 OFFSET '+ offset_pull +'', function (err, rows, fields) { 
            //  var queryForResponse = connection.query('SELECT b.blogId, c.categoryColorCode AS category_colorcode, c.categoryName AS category_name, b.companyName AS company_name, b.date_published, c.categoryId, b.blogTitle, b.blogDesc, bl.userId, CONCAT(\'http://52.69.246.194/uploads/blog/thumb/\', b.image ) AS image FROM blog b INNER JOIN category c ON c.categoryId = b.categoryId INNER JOIN blog_likes bl ON b.blogId = bl.blogId WHERE bl.userId = ' + from_user + ' AND bl.blogId in ( SELECT blogId FROM blog_likes WHERE userId = ' + to_user + ')', function (err, rows, fields) {
                //console.log("ask_bothuser_blog_like query" + queryForResponse);
                var return_blog = new Array();
                if (!err) {
                    if (rows.length > 0) {
                        for (i = 0; i < rows.length; i++) {
                            
                            return_blog.push({
                                category_id: rows[i].category_id,
                                blog_id: rows[i].post_id,
                                category_colorcode: rows[i].color_code,
                                category_name: rows[i].category_name,
                                //date_published: time_formate(rows[i].created_date),
                                date_published: time_formate(rows[i].datetopublish),
                                blog_created_date:  time_formate(rows[i].blog_date),
                                company_name: rows[i].company_name,
                                blog_title: rows[i].title,
                                blog_desc: rows[i].description,
                                blog_image: rows[i].image
                            });
                        }
                        if (userlist.hasOwnProperty(from_user)) {
                            userlist[from_user].emit('return_bothuser_blog_like', JSON.stringify(return_blog));
                        }
                    }else{
                        if (userlist.hasOwnProperty(from_user)) {
                            userlist[from_user].emit('return_bothuser_blog_like', JSON.stringify(return_blog));
                        }
                    }
                } else {
                    console.log(err);
                }
            });
            //console.log("ask_bothuser_blog_like query" + queryForResponse.sql);
        } catch (err) {
            console.log(err);
        }
    });
    
    ///////////////////////////////////// end both user like ///////////////////////////////////////////////////////////
    
    ////////////////////////////////////////////// start update status ////////////////////////////////////////////
    
    try {
        
        socket.on('aaa', function (msg_id, from_user, status) {
           
            var unread_messages = connection.query('UPDATE messages m  SET m.read_flag = ? WHERE  m.id = ?', [status, msg_id]);
            if (userlist.hasOwnProperty(from_user)) {
                var singlemsg1 = new Array();
                
                singlemsg1.push({
                    'msg_id': msg_id,
                    'msg_flag': status
                   // 'to_user': to_user
                });
                userlist[from_user].emit('bbb', JSON.stringify(singlemsg1));
            }
        });
    } catch (err) {
        console.log(err);
    }
    
    ///////////////////////////////////////////// end update status //////////////////////////////////////////////
    
    // To disconnect user.
    try {
        
        socket.on('user_disconnect', function (user) {

            if (user != '' && typeof (user) != 'undefined') {
                if (!userlist.hasOwnProperty(user)) {
                    userlist[user] = socket;
                    allClients.push(socket);
                }
            }
        });
        
    } catch (err) {
        console.log(err);
    }

    //disconnected user name.
    try {
        
        socket.on('disconnect', function () {
            
            console.log('Disconnected user:' + socket.id);
            var socketId = socket.id;
            var i = allClients.indexOf(socket);
            delete allClients[i];
            for (var k in userlist) {
                if (socketId == userlist[k].id) {
                    delete userlist[k];
                    break;
                }
            }
        });
        
    } catch (err) {
        console.log(err);
    }
    //End connection.
});

//For reconnection purpose.
io.on('reconnect', function (socket) {
    
    console.log('reconnecting...' + socket);
    
});



////////////////////////////////////// UTILITY FUNCTION START HERE /////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//For time formate.
function time_formate(time) {

    // var date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var d = new Date(time);
    var curr_date = ("0" + (d.getDate())).slice(-2).toString();
    var curr_month = ("0" + (d.getMonth() + 1)).slice(-2).toString();
    var curr_year = d.getFullYear();
    var curr_hours = ("0" + (d.getHours())).slice(-2).toString();
    var curr_minutes = ("0" + (d.getMinutes())).slice(-2).toString();
    var curr_sec = ("0" + (d.getSeconds())).slice(-2).toString();
    return curr_year + "-" + curr_month + "-" + curr_date + " " + curr_hours + ":" + curr_minutes + ":" + curr_sec;
    
}

//For time formate.
function time_formateLessMinutes(time) {

    // var date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var d = new Date(time);
    var curr_date = ("0" + (d.getDate())).slice(-2).toString();
    var curr_month = ("0" + (d.getMonth() + 1)).slice(-2).toString();
    var curr_year = d.getFullYear();
    var curr_hours = ("0" + (d.getHours())).slice(-2).toString();
    var curr_minutes = ("0" + (d.getMinutes() - 3)).slice(-2).toString();
    var curr_sec = ("0" + (d.getSeconds())).slice(-2).toString();
    return curr_year + "-" + curr_month + "-" + curr_date + " " + curr_hours + ":" + curr_minutes + ":" + curr_sec;
    
}

//For check if null or not.
function check_if_null(data) {

    if (!data)
        return '0';
    else
        return data;
}

//This function print data.
function print_data(data) {
    if (print_flag == true) {
        console.log(data);
        console.log('--------------');
    }
}

// Function for date function.
function return_date_function(msg_date, like_date) {

    var like_date1;
    if (!msg_date) {
        like_date1 = time_formate(like_date);
    } else {
        like_date1 = time_formate(msg_date);
    }
    return like_date1;
}

// Function to convert UTC time into Tokyo local time
function convert_to_jst()
{
    var date_time_u = new Date().toISOString();
    var startTime = new Date(date_time_u);
         
    var date_time =   new Date( startTime.getTime() + (startTime.getTimezoneOffset()+540)*60*1000 );
    date_time_final = date_time.getFullYear()+'-'+("0" +date_time.getDate()).slice(-2)+'-'+("0" + (date_time.getMonth() + 1)).slice(-2)+' '+date_time.getHours()+':'+date_time.getMinutes()+':'+date_time.getSeconds();
    console.log(date_time_final);
    console.log(date_time_u);
    return date_time_final;
}

//For Http server check.
http.listen(8555, function (msg) {
    console.log('listening on 52.192.194.146*:8555');
});


////////////////////////////////////// UTILITY FUNCTION END HERE /////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////