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

        if (!req.body.amount) {
            const error = 'Field amount is required!';
            console.log('Error: ', error);
            return res.status(400).json({ message: error });
        }

        const postData = { data: [{ 'Amount': req.body.amount || '' }] };
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

app.post('/api/update_record/:id', async (req, res, next) => {
    try {
        console.log(req.body);
        const id = req.params.id;
        const requiredFields = [
            'stage', 'clientName', 'city', 'effectiveDate', 'email',
            'firstName', 'lastName', 'phone', 'state', 'streetAddress', 'zipCode'
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
                'Stage': req.body.stage || '',
                'Deal_Name': req.body.clientName || '',
                'City': req.body.city || '',
                'Claim_Dependent': req.body.claimDependent || '',
                'Effective_Date': req.body.effectiveDate?.toString() || '',
                'Email': req.body.email || '',
                'First_Name': req.body.firstName || '',
                'Last_Name': req.body.lastName || '',
                'Phone': req.body.phone?.toString() || '',
                'Mobile': req.body.phone?.toString() || '',
                'State': req.body.state || '',
                'Street_Address': req.body.streetAddress || '',
                'Zip_Code': req.body.zipCode || '',
                'Lead_Source': req.body.referralSource || "1111",
                'ReferralURL': req.body.referralURL || '',
                'Tax_Filing_Status': req.body.filingStatus || "Single",
                'S1_Q1_Selfemployed': req.body.s1Q1?.toString() || '',
                'S1_Q2_Filed1040_tax': req.body.s1Q2?.toString() || '',
                'S1_Q3_Affected': req.body.s1Q3?.toString() || '',
                'S3_Q1': req.body.s3Q1?.toString() || '',
                'S3_Q2': req.body.s3Q2?.toString() || '',
                'S4_Q1': req.body.s4Q1?.toString() || '',
                'S4_Q2': req.body.s4Q2?.toString() || '',
                'S4_Q3': req.body.s4Q3?.toString() || '',
                'S5_Q1': req.body.s5Q1?.toString() || '',
                "S3_Q1_D1": req.body.S3_Q1_D1 || '',
                "S3_Q1_D2": req.body.S3_Q1_D2 || '',
                "S3_Q1_D3": req.body.S3_Q1_D3 || '',
                "S3_Q1_D4": req.body.S3_Q1_D4 || '',
                "S3_Q1_D5": req.body.S3_Q1_D5 || '',
                "S3_Q1_D6": req.body.S3_Q1_D6 || '',
                "S3_Q1_D7": req.body.S3_Q1_D7 || '',
                "S3_Q1_D8": req.body.S3_Q1_D8 || '',
                "S3_Q1_D9": req.body.S3_Q1_D9 || '',
                "S3_Q1_D10": req.body.S3_Q1_D10 || '',
                "S3_Q2_D1": req.body.S3_Q2_D1 || '',
                "S3_Q2_D2": req.body.S3_Q2_D2 || '',
                "S3_Q2_D3": req.body.S3_Q2_D3 || '',
                "S3_Q2_D4": req.body.S3_Q2_D4 || '',
                "S3_Q2_D5": req.body.S3_Q2_D5 || '',
                "S3_Q2_D6": req.body.S3_Q2_D6 || '',
                "S3_Q2_D7": req.body.S3_Q2_D7 || '',
                "S3_Q2_D8": req.body.S3_Q2_D8 || '',
                "S3_Q2_D9": req.body.S3_Q2_D9 || '',
                "S3_Q2_D10": req.body.S3_Q2_D10 || '',
                "S4_Q2_D1": req.body.S4_Q2_D1 || '',
                "S4_Q2_D2": req.body.S4_Q2_D2 || '',
                "S4_Q2_D3": req.body.S4_Q2_D3 || '',
                "S4_Q2_D4": req.body.S4_Q2_D4 || '',
                "S4_Q2_D5": req.body.S4_Q2_D5 || '',
                "S4_Q2_D6": req.body.S4_Q2_D6 || '',
                "S4_Q2_D7": req.body.S4_Q2_D7 || '',
                "S4_Q2_D8": req.body.S4_Q2_D8 || '',
                "S4_Q2_D9": req.body.S4_Q2_D9 || '',
                "S4_Q2_D10": req.body.S4_Q2_D10 || '',
                "S4_Q3_D1": req.body.S4_Q3_D1 || '',
                "S4_Q3_D2": req.body.S4_Q3_D2 || '',
                "S4_Q3_D3": req.body.S4_Q3_D3 || '',
                "S4_Q3_D4": req.body.S4_Q3_D4 || '',
                "S4_Q3_D5": req.body.S4_Q3_D5 || '',
                "S4_Q3_D6": req.body.S4_Q3_D6 || '',
                "S4_Q3_D7": req.body.S4_Q3_D7 || '',
                "S4_Q3_D8": req.body.S4_Q3_D8 || '',
                "S4_Q3_D9": req.body.S4_Q3_D9 || '',
                "S4_Q3_D10": req.body.S4_Q3_D10 || ''
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
