//import './db'
import server from './server.js';

(async () => {

  try {
    await new server().init();
  } catch (err) {
    console.log(err);
  } finally {
    console.log('server has been started');
  }
})();
