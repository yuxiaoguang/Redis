const moment = require('moment');
const Redis = require('ioredis');

class RedisLock {
    constructor(options = {}) {
        this.client = new Redis(6379, '127.0.0.1');
        if (this.client.status !== 'connecting') {
            throw new Error('Abnormal Connection!')
        }else {
            console.log('Redis connection successfully');
        }
        let {lockLeaveTime, lockTimeOut, expiryMode, setModel} = options;
        this.lockLeaveTime = lockLeaveTime || 2;
        this.lockTimeOut = lockTimeOut || 5;
        this.expiryMode = expiryMode || 'EX';
        this.setModel = setModel || 'NX';
    }
    async set(source, owner, expire){
        const start = Date.now();
        const result = {source, owner, time: moment.utc().format('YYYY-MM-DD hh:mm:ss')};
        try {
            const lockResult = await this.client.set(source, owner, this.expiryMode, expire || this.lockLeaveTime, this.setModel);
            if(lockResult === 'OK'){
                return Object.assign(result, {status: lockResult === 'OK' ? true : false, type: 'LOCK_SUCCESS'});
            }
            if(Math.floor(Date.now() - start) / 1000 > this.lockLeaveTime){
                return Object.assign(result, {status: lockResult === 'OK' ? true : false, type: 'LOCK_EXPIRE'});
            }
            return Object.assign(result, {status: lockResult === 'OK' ? true : false, type: 'LOCK_FAIL'});
        }catch (err) {
            throw new Error(err)
        }
    }

    async remove(source, owner){
        const result = {source, owner, time: moment.utc().format('YYYY-MM-DD hh:mm:ss')};
        const start = Date.now();
        const script = "if redis.call('get', KEYS[1]) == ARGV[1] then" +
                        "  return redis.call('del', KEYS[1])" +
                        "  else " +
                        "  return 0" +
                        "  end";
        try {
            const unLockResult = await this.client.eval(script, 1, source, owner);
            if(unLockResult === 1){
                return Object.assign(result, {status: unLockResult === 1 ? true : false, type: 'UNLOCK_SUCCESS'});
            }
            return Object.assign(result, {status: unLockResult === 1 ? true : false, type: 'UNLOCK_FAIL'});
        }catch (err) {
            throw new Error(err)
        }

    }
}

module.exports = RedisLock;

function missingParam() {
    throw new Error('Missing Required Parameters!');
}

function sleep(timer, options) {
    return new Promise((resolve => {
        setTimeout(function () {
            resolve();
        }, timer || 1000)
    }))
}





