const Redis = require("ioredis");
const client1 = new Redis(6379, "127.0.0.1");
const Redlock = require('redlock');
const redlock = new Redlock([client1], {
    retryDelay: 200, // time in ms
    retryCount: 5,
});

async function test(key, ttl, client) {
    try {
        const lock = await redlock.lock(key, ttl);

        console.log(client, lock.value);
        // do something ...

        // return lock.unlock();
    } catch(err) {
        console.error(client, err);
    }
}

test('name1', 10000, 'Client1');
test('name1', 10000, 'Client2');
