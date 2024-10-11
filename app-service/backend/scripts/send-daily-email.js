const axios = require('axios');
const cron = require('node-cron');
const sendEmail = require('../util').sendEmail;


const sendDailyEmail = async (to) => {
    try {

        const response = await axios.get('https://xyrm-sqqj-hx6t.n7c.xano.io/api:jajN3pdi/get_stages');
        const stagesData = response.data;

        const stageCounts = {};
        for (let i = 1; i <= 14; i++) {
            stageCounts[i] = 0;
        }

        stagesData.forEach(item => {
            const stage = item.Stage;
            if (stage && stageCounts.hasOwnProperty(stage)) {
                stageCounts[stage]++;
            }
        });

        let messageBody = "Daily Stage Report:\n\n";
        for (let i = 1; i <= 14; i++) {
            messageBody += `Stage ${i}: ${stageCounts[i]} users\n`;
        }

        await sendEmail(to, "Daily Stage Report", messageBody);
    } catch (error) {
        console.error('Error sending daily email:', error);
    }
};

cron.schedule('0 9 * * *', () => {
    sendDailyEmail('ben@automateboring.net');
    console.log("Daily email scheduled at 8 AM");
});
