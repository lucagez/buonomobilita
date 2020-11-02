const axios = require('axios');
const env = require('dotenv');
const winston = require('winston');
const sound = require('sound-play');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { setupServer } = require('msw/node');
const { rest } = require('msw');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ websites: {} }).write();

env.config();

const { URL, INTERVAL, NODE_ENV } = process.env;
const key = `websites.${URL.replace(/\./g, '-')}`;

if (NODE_ENV === 'test') {
  setTimeout(() => {
    const server = setupServer(
      rest.get(URL, (req, res, ctx) => {
        return res(
          ctx.text('OTHER TEXT'),
        );
      }),
    );
  
    server.listen();
  }, 5000);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  for (;;) {
    try {
      logger.info(`CHECK ${URL}`);

      const { data, status } = await axios.get(URL);

      const prev = db.has(key) && db.get(key).value();

      if (prev && prev !== data && status === 200) {
        sound.play('./bello.mp3');
      }

      db.set(key, data).write();

      await sleep(
        Math.floor(Number(INTERVAL) * 60 * 1000 * (Math.random() + 0.1)),
      );
    } catch (error) {
      logger.error('WTF', error);
      sound.play('./bello.mp3');
    }
  }
})();
