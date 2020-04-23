const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const uuid = require('uuid');
const moment = require('moment');
const RedisLock = require('../RedisLock');
const redisLock =  new RedisLock();
const LoggerCollection = require('../LoggerCollection');
const logger = new LoggerCollection(__dirname);

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  // console.log('Invoke : ', req.url);
  next();
});

router.post('/setLock', (req, res) => {
    const owner = uuid.v1();
    const {source} = req.body;
    const lockResult = redisLock.set(source, owner, 20);
    lockResult.then((result) => {
        res.send({result});
        (async function(){
            if(result.status) {
                logger.info(`############ ${source} 加锁详情 Start #############`);
                logger.info(result);
                logger.info(`############ ${source} 加锁详情 End #############`);
                logger.info(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 10秒后释放该锁 `);
                await sleep(10000);
                const unlockResult = redisLock.remove(source, owner);
                unlockResult.then(result => {
                    logger.info(`############ ${source} 释放锁详情 Start #############`);
                    logger.info(result);
                    logger.info(`############ ${source} 释放锁详情 End #############`);
                })
            }

        })()
    });
});

router.post('/removeLock', (req, res) => {
    const {source, owner} = req.body;
    const unlockResult = redisLock.remove(source, owner);
    unlockResult.then(result => res.send({result}));
});


router.get('/getLock', (req, res) => {
    const {source} = req.body;
    const lockResult = redisLock.get(source);
    lockResult.then(result => res.send({result}));
})

function sleep(timer, options) {
    return new Promise((resolve => {
        setTimeout(function () {
            resolve();
        }, timer || 1000)
    }))
}


module.exports = router;
