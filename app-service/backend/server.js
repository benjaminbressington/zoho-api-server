require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const { loadProgress, saveProgress, sendEmail } = require('./util');
const _ = require('lodash');
const { SignalWire } = require('@signalwire/realtime-api');
const { phone } = require("phone");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.SERVER_PORT;

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GRANT_TYPE = process.env.GRANT_TYPE;
const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID;
const SIGNALWIRE_TOKEN = process.env.SIGNALWIRE_TOKEN;
const SIGNALWIRE_PHONE_NUMBER = process.env.SIGNALWIRE_PHONE_NUMBER;
const EMAIL = process.env.EMAIL;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
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

app.post('/api/insert_deal', async (req, res, next) =>
{
    try
    {
        console.log(req.body);

        const body = req.body;
        const requiredKeys = ['clientName', 'email', 'firstName', 'lastName', 'phone', 'estimated_value'];

        for (const key of requiredKeys)
        {
            if (!body[key])
            {
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
                'S1_Q4_Owe_IRS_Money': body.s1Q4?.toString() || '',
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_record/:id', async (req, res, next) =>
{
    try
    {
        console.log(req.body);
        const id = req.params.id;
        const requiredFields = [
            'stage', 'clientName', 'city', 'effectiveDate', 'email',
            'firstName', 'lastName', 'phone', 'state', 'streetAddress', 'zipCode'
        ];

        for (const key of requiredFields)
        {
            if (!req.body[key])
            {
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
                'Spouse_First_Name': req.body.Spouse_First_Name || '',
                'Spouse_Last_Name': req.body.Spouse_Last_Name || '',
                'Spouse_SSN': req.body.Spouse_SSN || '',
                'Primary_DOB': req.body.primaryDOB?.toString() || '',
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_stage/:id', async (req, res, next) =>
{
    try
    {
        const id = req.params.id;

        if (!req.body.stage)
        {
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/request_auth_code', async (req, res) =>
{
    try
    {
        const min = 123456;
        const max = 987654;
        const code = Math.floor(Math.random() * (max - min + 1) + min);
        const phone_number = req.body.phone.toString();
        const phoneInfo = phone(phone_number);
        if (!phoneInfo.isValid)
        {
            return res.status(400).json({ message: 'Invalid phone number' });
        }

        const getPhoneResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/phone_verification?phone_number=${phone_number}`);
        if (getPhoneResponse.status === 200 && getPhoneResponse.data && getPhoneResponse.data.phone_number === phone_number)
        {
            const Updateresponse = await axios.patch('https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/phone_verification', {
                code: code,
                phone_number: phone_number

            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`Code updated for phone number ${phone_number}`);
        }
        else
        {
            await axios.post('https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/phone_verification', {
                phone_number: phone_number,
                code: code
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`Phone number ${phone_number} added with code`);
        }
        const number = phoneInfo.phoneNumber;
        const message = `Your verification code is ${code}`;
        const client = await SignalWire({
            project: SIGNALWIRE_PROJECT_ID,
            token: SIGNALWIRE_TOKEN,
        });
        const messageClient = client.messaging;

        const sendResult = await messageClient.send({
            from: SIGNALWIRE_PHONE_NUMBER,
            to: number,
            body: message,
        });


        res.status(200).json({ message: "Your code was sent successfully" });

    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(500).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/verify_auth_code', async (req, res) =>
{
    try
    {
        const { phone_number, code } = req.body;
        const codeInt = parseInt(code);
        const getPhoneResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/phone_verification?phone_number=${phone_number}`);
        if (getPhoneResponse.status === 200 && getPhoneResponse.data)
        {
            const storedPhoneNumber = getPhoneResponse.data.phone_number;
            const storedCode = parseInt(getPhoneResponse.data.code);
            if (storedPhoneNumber === phone_number && storedCode === codeInt)
            {
                res.status(200).json({ message: "Code verified successfully" });
            }
            else
            {
                return res.status(403).json({ message: "Invalid or expired code" });
            }
        }
        else
        {
            return res.status(404).json({ message: "Phone number not found" });
        }
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(500).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/email_auth', async (req, res) =>
{
    try
    {
        const email = req.body.email;

        let token;
        let isVerified = 0;

        const sendmail = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: EMAIL,
                pass: EMAIL_PASSWORD
            }
        });

        let emailResponse;
        try
        {
            emailResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/get_email?email=${email}`);
        } catch (error)
        {
            if (error.response.status === 404)
            {
                token = jwt.sign({ email: email }, JWT_SECRET, { expiresIn: '30m' });
                const postResponse = await axios.post(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/email_verification`, {
                    email: email,
                    token: token,
                    isVerified: isVerified
                });

                if (postResponse.status === 200)
                {
                    console.log('New email verification entry created.');
                }
                const emailDataNew = {
                    from: EMAIL,
                    to: email,
                    subject: 'Welcome! Please Verify Your Email',
                    html: `<h1>Email Verification</h1>
                           <p>Thank you for registering. Please use the following link to verify your email:</p>
                           <p><a target="_blank" href="${CLIENT_URL}/verification?token=${token}">Verify Email</a></p>
                           <p><strong>The link will expire in 30 minutes.</strong></p>`
                };

                await sendmail.sendMail(emailDataNew);
                return res.status(200).json({ message: 'Verification email sent.' });
            } else
            {
                return res.status(500).json({ message: 'Error occurred while checking email.', error: error.message || error });
            }
        }
        if (emailResponse.data && emailResponse.data.token)
        {
            try
            {
                jwt.verify(emailResponse.data.token, JWT_SECRET);
                return res.status(200).json({ message: 'Email is already sent, please verify it.' });
            } catch (err)
            {

                try
                {
                    token = jwt.sign({ email: email }, JWT_SECRET, { expiresIn: '30m' });
                    const patchResponse = await axios.patch(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/email_verification`, {
                        email: email,
                        token: token,
                        isVerified: isVerified
                    });

                    if (patchResponse.status === 200)
                    {
                        console.log('Email verification token updated.');
                    }
                    const emailDataExpired = {
                        from: EMAIL,
                        to: email,
                        subject: 'Your Verification Token Expired - New Token',
                        html: `<h1>Email Verification</h1>
                               <p>Your previous verification link has expired. Please use the following link to verify your email:</p>
                               <p><a target="_blank" href="http://localhost:3000/verification?token=${token}">Verify Email</a></p>
                               <p><strong>The new link will expire in 30 minutes.</strong></p>`
                    };

                    await sendmail.sendMail(emailDataExpired);
                    return res.status(200).json({ message: 'New verification email sent.' });
                } catch (error)
                {
                    return res.status(500).json({ message: 'Invalid token or some other error.' });
                }
            }
        }
    } catch (error)
    {
        console.error('Error:', error.message || error);
        return res.status(500).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.get('/api/verify_email/:token', async (req, res) =>
{
    try
    {
        const token = req.params.token;
        jwt.verify(token, JWT_SECRET, async (err, decoded) =>
        {
            if (err)
            {
                return res.status(400).json({ message: 'Invalid or expired token.' });
            }
            const { email } = decoded;

            try
            {
                const emailResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/get_email?email=${email}`);

                if (emailResponse.data && emailResponse.data.isVerified === '1')
                {
                    return res.status(200).json({ message: 'Email is already verified.' });
                } else
                {
                    const patchResponse = await axios.patch(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/email_verification`, {
                        email: email,
                        isVerified: 1
                    });

                    if (patchResponse.status === 200)
                    {
                        return res.status(200).json({ message: 'Email verified successfully.' });
                    } else
                    {
                        return res.status(500).json({ message: 'Failed to update verification status.' });
                    }
                }
            } catch (err)
            {
                if (err.response && err.response.status === 404)
                {
                    return res.status(400).json({ message: 'Email not found.' });
                }
                return res.status(500).json({ message: 'An error occurred while verifying the email.', error: err.message });
            }
        });
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(500).json({ message: 'An internal error occurred.', error: error.message });
    }
});
app.post('/api/email_verified_status', async (req, res) =>
{
    try
    {
        const email = req.body.email;
        const emailResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/get_email?email=${email}`);
        if (emailResponse.data && emailResponse.data.isVerified === '1')
        {
            return res.status(200).json({ message: 'Email is verified.' });
        } else
        {
            return res.status(200).json({ message: 'Email is not verified.' });
        }
    } catch (error)
    {

        if (error.response && error.response.status === 404)
        {
            return res.status(200).json({ message: 'Email not found.' });
        }

        console.error('Error:', error.message || error);
        return res.status(500).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_ssn/:id', async (req, res, next) =>
{
    try
    {
        const id = req.params.id;

        if (!req.body.ssn)
        {
            const error = 'Field ssn is required!';
            console.log('Error: ', error);
            return res.status(400).json({ message: error });
        }

        const postData = { data: [{ 'SSN': req.body.ssn || '' }] };
        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;

        const accessToken = await getToken();
        const response = await axios.put(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_amount/:id', async (req, res, next) =>
{
    try
    {
        const id = req.params.id;

        const body = req.body;
        console.log(body);

        const postData = { data: [{ 'Amount': req.body.amount || 0, 'IRS_Balance': req.body.irs_bal || '0', 'Calculated_PDF': req.body.pdf_21 || '', 'Calculation_Date': req.body.calculation_date }] };
        const dealsUrl = `https://www.zohoapis.com/crm/v2/Deals/${id}`;

        const accessToken = await getToken();
        const response = await axios.put(dealsUrl, postData, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.get('/api/get_record/:id', async (req, res, next) =>
{
    try
    {
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});




app.post('/api/update_existing/:id', async (req, res, next) =>
{
    try
    {
        const id = req.params.id;
        console.log(req.body);

        const requiredFields = [
            'clientName', 'email', 'firstName', 'lastName', 'phone',
            'refereallURL'
        ];

        for (const key of requiredFields)
        {
            if (!req.body[key])
            {
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
                'S1_Q4_Owe_IRS_Money': req.body.s1Q4?.toString() || '',
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/submitted_webhook', async (req, res) =>
{
    const event = req.body;

    if (event.code === 7002)
    {
        console.log('Received webhook event: ', event);
        const email = event.vendorData;

        const progress_data = await loadProgress(email);
        console.log("before");
        console.log(progress_data);
        if (progress_data)
        {
            const currentPage = Number(progress_data.currentPage) + 1;
            console.log(currentPage);
            progress_data.currentPage = String(currentPage);
            console.log("after");
            console.log(progress_data);
            await saveProgress(progress_data);
        }

    }

    res.status(200).send('Webhook received');
});

app.post('/api/insert_tax_intake', async (req, res, next) =>
{
    try
    {
        console.log(req.body);

        const body = req.body;

        const requiredKeys = ['TaxType', 'PaymentPlan', 'IssueReason', 'Zipcode', 'State', 'County', 'UnfiledReturn', 'IrsOwe', 'ProtectAssets', 'ContactReason', 'FirstName', 'LastName', 'Email', 'Phone'];

        for (const key of requiredKeys)
        {
            if (!body[key])
            {
                const error = `Field ${key} is required!`;
                console.log('Error: ', error);
                return res.status(400).json({ message: error });
            }
        }

        let irsOweOne = 'No', irsOweTwo = 'No', irsOweThree = 'No', irsOweFour = 'No', irsOweFive = 'No';

        if (body.IrsOwe == '$5,000 or Less') {
            irsOweOne = 'Yes'; 
        }

        if (body.IrsOwe == '$5,001 - $10,000') {
            irsOweTwo = 'Yes'; 
        }

        if (body.IrsOwe == '$10,001 - $50,000') {
            irsOweThree = 'Yes';
        }

        if (body.IrsOwe == '$50,001 - $100,000') {
            irsOweFour = 'Yes';
        }

        if (body.IrsOwe == '$100,001 or More') {
            irsOweFive = 'Yes';
        }

        const postData = {
            data: [{
                "Layout": {
                    "id": "6172076000005310001"
                },
                'Deal_Name': body.FirstName + ' ' + body.LastName,
                'Stage': 'Intake',
                'Lead_Source': body.LeadSource || 'Home',
                'TaxType': body.TaxType,
                'PaymentPlan': body.PaymentPlan,
                'IssueReason': body.IssueReason.join(', '),
                'Zip_Code': body.Zipcode,
                'State': body.State,
                'County': body.County,
                'UnfiledReturn': body.UnfiledReturn,
                'IrsOweTaxIntake': body.IrsOwe,
                'ProtectAssets': body.ProtectAssets,
                'ContactReason': body.ContactReason.join(', '),
                'First_Name': body.FirstName,
                'Last_Name': body.LastName,
                'Email': body.Email,
                'Phone': body.Phone,
                'Mobile': body.Phone,
                'IrsOweTax1': irsOweOne,
                'IrsOweTax2': irsOweTwo,
                'IrsOweTax3': irsOweThree,
                'IrsOweTax4': irsOweFour,
                'IrsOweTax5': irsOweFive,
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/update_tax_stage/:id', async (req, res, next) =>
{
    try
    {
        const id = req.params.id;

        if (!req.body.stage)
        {
            const error = 'Field stage is required!';
            console.log('Error: ', error);
            return res.status(400).json({ message: error });
        }

        const postData = {
            data: [{
                "Layout": {
                    "id": "6172076000005310001"
                },
                'Stage': req.body.stage || ''
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
    } catch (error)
    {
        console.error('Error:', error.message || error);
        res.status(442).json({ message: 'An error occurred while processing the request.', error: error.message || error });
    }
});

app.post('/api/save_to_xano', async (req, res) =>
{
    const questionsMapping = {
        'nnleehyeo0nh0vifjff340n6': 'form1040_941',
        'rcjkozs0hbnu8ekr4hzl2qgz': 'tax_year',
        'olgyfcitw0owjrysnajiqki2': 'first_name',
        'w6zc5hjj1im20itz1iuzkhw6': 'last_name',
        'yw3flp5r5fkv7s19gjpjm7yx': 'ssn',
        'ilihpb23ve30ygkcvijrk2w6': 'joint_file',
        'umj174r9caalpf660a8mqalm': 'spouse_fname',
        'pfd3p6ijrdy9vdoobra7pb2h': 'spouse_lname',
        'ubhhlicxe4vvqy607v5u32fq': 'spouse_ssn',
        'l1l2vnrzue77sq8c1fdp4xgv': 'change_address',
        'm4camqsrnh2gxbh4zdiy3tt0': 'current_address',
        'o51xjlkitsphwvjb24yxtxud': 'apartment_number',
        'm1pko0zr79m9f8p2z9og8wcm': 'city_town_state_zip',
        'nfh7bb3awxit6dq5nlf2xbey': 'foreign_address',
        'qsl2hjwtmh7rszeifx4bxz2u': 'foreign_country_name',
        'ndi6bnkgjfhf2kgoa38n02n4': 'foreign_country_state',
        'b1lndcelq65hxojhdqs58uiw': 'foreign_postal_code',
        'c0fvxnzsxco87sfo5tblecum': 'new_address_last_tax_return',
        'lfwjm9l8huuvwteyhgcfp23k': 'home_phone_no',
        'a1rh2ubr6f5q9yeaez1qm2dn': 'home_best_time_to_reach',
        'y2vpxs4xnyn97hjmrktz7jn7': 'work_phone_no',
        'erfb7eh0yr1cvcyehwrx550h': 'work_best_time_to_reach',
        'sl5td7kw5wlavkzwkvje2vk4': 'total_number_owe_irs',
        'um8yusaqrlvjp43ncllaayti': 'amount_of_payment_request',
        'q9ewkb4r27rotu9jasqvbxat': 'dollar_amount_of_payment_request',
        'rug58xfpalxvuhto3vsdjfon': 'date_for_payment_each_month',
        'vo9niss9lq6fclib6kb0f7pv': 'direct_debit_payment_every_month',
        'imt1svzpxubdue5m9l8ii7wr': 'checking_account_routing_number',
        'sqhfntswgp9ttns41168avdy': 'checking_account_number',
        'io27hnl1stklxgxj3iyqzlvl': 'low_income_taxpayer',
        'ljvrh1g2f27ojav1ygv6bv3d': 'deduct_payments_from_payroll',
        'f4akcmfnlet8n4yzvry0p4c3': 'install_agreement',
        'iwy3kr93h5ci962bxlqvpe8w': 'primary_country_residence',
        'lqnqdz600j0jkj1x2wxcqe8d': 'marital_status',
        'cs2vrkoi3iiexpg99yed7hzy': 'share_household_expense_with_spouse',
        'rvk9oc4b5ug01ifpbahmwntm': 'spouse_earn_income',
        'vi25888rgg70vies97tn9ynn': 'how_often_spouse_paid',
        'o801oyndhg22dcbahg2apci1': 'spouse_income_per_pay_period',
        'igovxetlf2xk85clrhoyafis': 'dependents_claiming_this_year',
        'vcamnqa46u4pn348eep9jerj': 'people_65_older',
        'xzalodr5w9tlrhjxbctvkl23': 'often_paid',
        'o7jc7iwt2wyebackl1tvcpus': 'vehicles_own',
        'tk41gzu1pqww9jk9pwqj8gjm': 'car_payments_each_month',
        'w0bi6xs0lypmg56uxr7clzkq': 'health_insurance',
        'bse5lrwmg05toqckkgyliz0d': 'health_insurance_dedcuted_from_paycheck',
        'krk25zc4pm5msr18tfq6qmwg': 'monthly_health_insurance_premiums',
        'z8xg4uzkqlcl5vuro4lxtoio': 'court_ordered_payments',
        'yk87ihi1o2z3az72350m753u': 'court_ordered_payments_dedcuted_from_paycheck',
        'ryvfjvh19q8xt7cat5pvlemt': 'monthly_court_ordered_payments',
        'sbsyroe2ac7s1zxg8hxnnyvb': 'how_much_pay_for_child_dependent_each_month',
        'qct74o2jtj39q7vcbn33pe8e': 'email'
    }

    try {
        const { webhookId, event, data } = req.body;
        const responseId = data.id;
        const mappedData = {};
        const status = (event === 'responseFinished') ? 'Completed' : 'Not Completed';
        const email = data?.data['qct74o2jtj39q7vcbn33pe8e'].join('') || '';

        for (let [key, value] of Object.entries(data.data)) {
            if (questionsMapping[key]) {
                if (typeof(value) == 'object') {
                    value = value.join('');
                }
                mappedData[questionsMapping[key]] = value;
            }
        }

        const payload = {
            response_id: responseId,
            data: mappedData,
            status,
            email
        };

        const xanoUrl = (event === 'responseCreated') ?
            'https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/formbricks_intake' :
            `https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/formbricks_intake/${responseId}`;
            
        const xanoResponse = await axios({
            method: (event === 'responseCreated') ? 'POST' : 'PATCH',
            url: xanoUrl,
            data: payload
        });

        res.status(200).json({ success: true, result: xanoResponse.data });
    } catch (error) {
        res.status(422).json({ success: false, message: 'Failed to save to Xano', error: error.message });
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
