const moment = require('moment');

class RedisLock {
    constructor(client = missingParam(), options = {}) {
        if (client.status !== 'connecting') {
            throw new Error('Abnormal Connection!')
        }
        this.client = client;
        let {lockLeaveTime, lockTimeOut, expiryMode, setModel} = options;
        this.lockLeaveTime = lockLeaveTime || 2;
        this.lockTimeOut = lockTimeOut || 5;
        this.expiryMode = expiryMode || 'EX';
        this.setModel = setModel || 'NX';
    }
    async lock(source, owner, expire){
        const start = Date.now();
        const _this = this;
        return (
            async function innerLock() {
                try {
                    const result = await _this.client.set(source, owner, _this.expiryMode, expire || _this.lockLeaveTime, _this.setModel);
                    if(result === 'OK'){
                        console.log(`${source} ${owner} 上锁成功~ ${moment.utc()}`);
                        return true;
                    }
                    if(Math.floor(Date.now() - start) / 1000 > _this.lockLeaveTime){
                        console.log(`${source} ${owner} 上锁重试超时，结束！${moment.utc()} ${result}`);
                        return false;
                    }

                    console.log(`${source} ${owner} 等待重试。。。 ${moment.utc()} ${result}`);
                    await sleep(3000);
                    console.log(`${source} ${owner} 开始重试。。。 ${moment.utc()} ${result}`);
                    return innerLock();
                }catch (err) {
                    console.log({err});
                    throw new Error(err);
                }
            }
        )()
    }

    async unLock(source, owner){
        const _this = this;
        const script = "if redis.call('get', KEYS[1]) == ARGV[1] then" +
                        "  return redis.call('del', KEYS[1])" +
                        "  else " +
                        "  return 0" +
                        "  end";
        try {
            const result = await _this.client.eval(script, 1, source, owner);
            if(result === 1){
                console.log(`${source} ${owner} 解锁成功~ ${moment.utc()}`);
                return true;
            }
            console.log(`${source} ${owner} 解锁失败！ ${moment.utc()}`);
            return false;
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





