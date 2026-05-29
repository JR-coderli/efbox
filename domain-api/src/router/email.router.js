const KoaRouter = require('@koa/router');
const { verifyAuth } = require('../middleware/login.middleware');
const { handleCheckUrl, handleSendEmail } = require('../middleware/email.middleware');


const emailRouter = new KoaRouter({ prefix: '/email' })


emailRouter.post('/check-url', handleCheckUrl);
emailRouter.post('/send-email', handleSendEmail);

module.exports = emailRouter