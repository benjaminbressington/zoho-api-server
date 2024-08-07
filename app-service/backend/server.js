require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');

const app = express();
const port = process.env.SERVER_PORT;

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GRANT_TYPE = process.env.GRANT_TYPE;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ],
});

if (process.env.NODE_ENV !== 'production')
{
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

app.use(bodyParser.json());
app.use(cors());

app.get('/api/ping', (req, res) =>
{
    res.json({ 'message': 'pong' });
});

const getToken = async () =>
{
    const tokenData = {
        refresh_token: REFRESH_TOKEN,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: GRANT_TYPE
    };

    try
    {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', new URLSearchParams(tokenData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error)
    {
        logger.error('Error getting access token:', error);
        throw new Error('Unable to get access token');
    }
};

app.post('/api/insert_deal', async (req, res, next) => {
    try {
        console.log(req.body);

        const body = req.body;
        const requiredKeys = ['clientName', 'email', 'firstName', 'lastName', 'phone', 'estimated_value'];

        for (const key of requiredKeys) {
            if (!body[key]) {
                const error = `Field ${key} is required!`;
                console.log('Error: ', error);
                return res.status(400).json({ message: error });
            }
        }

        const postData = {
            data: [{
                'Deal_Name': body.clientName || '',
                'Stage': 'Prequal-Started',
                'Email': body.email || '',
                'First_Name': body.firstName || '',
                'Last_Name': body.lastName || '',
                'Phone': body.phone?.toString() || '',
                'Mobile': body.phone?.toString() || '',
                'Lead_Source': body.referralSource || "1111",
                'ReferralURL': body.referralURL || "",
                'S1_Q1_Selfemployed': body.s1Q1?.toString() || '',
                'S1_Q2_Filed1040_tax': body.s1Q2?.toString() || '',
                'S1_Q3_Affected': body.s1Q3?.toString() || '',
                'Estimated_Value': body.estimated_value?.toString() || '',
                'Pick_List_1': 'Ankur List',
                'Resume_URL': body.resume_url || 'https://app.automatedtaxcredits.com/estimator'
            }],
            trigger: ['approval', 'workflow', 'blueprint']
        };

        const dealsUrl = "https://www.zohoapis.com/crm/v2/Deals";
        const accessToken = await getToken();

        const response = await axios.post(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(response.data.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_stage/:id', async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!req.body.stage) {
            const error = 'Field stage is required!';
            console.log('Error: ', error);
            return res.status(400).json({ message: error });
        }

        const postData = { data: [{ 'Stage': req.body.stage || '' }] };
        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;

        const accessToken = await getToken();
        const response = await axios.put(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_amount/:id', async (req, res, next) => {
    try {
        const id = req.params.id;

        const body = req.body;
        console.log(body);

        const postData = { data: [{ 'Amount': req.body.amount || 0, 'IRS_Balance': req.body.irs_bal || 0, 'Calculated_PDF': req.body.pdf_21 || 0, 'Calculation_Date': req.body.calculation_date}] };
        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;

        const accessToken = await getToken();
        const response = await axios.put(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.get('/api/get_record/:id', async (req, res, next) => {
    try {
        console.log(req.body);
        const id = req.params.id;

        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;
        const accessToken = await getToken();
        const response = await axios.get(dealsUrl, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});




app.post('/api/update_existing/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        console.log(req.body);

        const requiredFields = [
            'clientName', 'email', 'firstName', 'lastName', 'phone',
            'refereallURL'
        ];

        for (const key of requiredFields) {
            if (!req.body[key]) {
                const error = `Field ${key} is required!`;
                console.log('Error: ', error);
                return res.status(400).json({ message: error });
            }
        }

        const postData = {
            data: [{
                'Deal_Name': req.body.clientName || '',
                'Email': req.body.email || '',
                'First_Name': req.body.firstName || '',
                'Last_Name': req.body.lastName || '',
                'Phone': req.body.phone?.toString() || '',
                'Mobile': req.body.phone?.toString() || '',
                'Lead_Source': req.body.referralSource || "1111",
                'ReferralURL': req.body.referralURL || '',
                'S1_Q1_Selfemployed': req.body.s1Q1?.toString() || '',
                'S1_Q2_Filed1040_tax': req.body.s1Q2?.toString() || '',
                'S1_Q3_Affected': req.body.s1Q3?.toString() || '',
            }]
        };

        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;
        const accessToken = await getToken();
        const response = await axios.put(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});



app.use((err, req, res, next) =>
{
    logger.error('An error occurred:', err);
    res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
});

app.listen(port, () =>
{
    logger.info(`Server running on port ${port}`);
});
