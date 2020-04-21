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
    async get(source){
        return await this.client.get(source);
    }
    async set(source, owner, expire){
        const start = Date.now();
        const result = {source, owner, time: moment.utc().format('YYYY-MM-DD HH:mm:ss')};
        let _this = this;
        return (async function innerLock() {
            try {
                const lockResult = await _this.client.set(source, owner, _this.expiryMode, expire || _this.lockLeaveTime, _this.setModel);
                if(lockResult === 'OK'){
                    console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 上锁成功~`);
                    return Object.assign(result, {status: lockResult === 'OK' ? true : false, type: 'LOCK_SUCCESS'});
                }
                if(Math.floor(Date.now() - start) / 1000 > _this.lockTimeOut){
                    console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 上锁重试超时结束!`);
                    return Object.assign(result, {status: lockResult === 'OK' ? true : false, type: 'LOCK_EXPIRE'});
                }

                // 循环等待重试
                console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 等待（3秒）重试`);
                await sleep(3000);
                console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 开始重试`);

                return innerLock();
            }catch (err) {
                throw new Error(err)
            }
        })()
    }

    async remove(source, owner){
        const result = {source, owner, time: moment.utc().format('YYYY-MM-DD HH:mm:ss')};
        const start = Date.now();
        const script = "if redis.call('get', KEYS[1]) == ARGV[1] then" +
                        "  return redis.call('del', KEYS[1])" +
                        "  else " +
                        "  return 0" +
                        "  end";
        try {
            const unLockResult = await this.client.eval(script, 1, source, owner);
            if(unLockResult === 1){
                console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 释放锁成功~`);
                return Object.assign(result, {status: unLockResult === 1 ? true : false, type: 'UNLOCK_SUCCESS'});
            }
            console.log(`${source} ${owner} ${moment.utc().format('YYYY-MM-DD HH:mm:ss')} 释放锁失败！`);
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





