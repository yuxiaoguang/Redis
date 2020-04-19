const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Redis = require('ioredis');
const redis = new Redis(6379, '127.0.0.1');
const uuid = require('uuid');
const RedisLock = require('../RedisLock');
const redisLock =  new RedisLock(redis);

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  // console.log('Invoke : ', req.url);
  next();
});


router.post('/', (req, res) => {
    const owner = uuid.v1();
    const {source} = req.body;
    const lockResult = redisLock.lock(source, owner, 20);

    lockResult.then((result) => {
        sleep(10000).then(() => {
            const unlockResult = redisLock.unLock(source, owner);
        });
        res.send({result});
    });
});

router.get('/push', (req, res) => {
    res.push('Test', {result: 'Hello World!'});
    const stream = res.push('/public/main.js', {
        status: 200,
        method: 'GET',
        request: {
            accept: '*/*'
        },
        response: {
            'content-type': 'application/javascript'
        }
    });
    stream.on('error', function () {

    });
    stream.end('alert("hello from push stream");');
    res.end('<script src="/public/main.js"></script>');
});

function sleep(timer, options) {
    return new Promise((resolve => {
        setTimeout(function () {
            resolve();
        }, timer || 1000)
    }))
}


module.exports = router;
