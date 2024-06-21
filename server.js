const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');


const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GRANT_TYPE = process.env.GRANT_TYPE

const app = express();
const port = process.env.SERVER_PORT;

app.use(bodyParser.json());
app.use(cors());

app.post('/api/insert_deal', async (req, res) => {

    const postData = {
        data: [{
            'Deal_Name': req.body.clientName,
            'City': req.body.city,
            'Claim_Dependent': req.body.claimDependent,
            'Effective_Date': req.body.effectiveDate,
            'Email': req.body.email,
            'First_Name': req.body.firstName,
            'Last_Name': req.body.lastName,
            'Phone': req.body.phone,
            'State': req.body.state,
            'Street_Address': req.body.streetAddress,
            'Zip_Code': req.body.zipCode,
            'ReferralSource': req.body.referralSource,
            'ReferralURL': req.body.refereallURL,
            'S1_Q1_Selfemployed': req.body.s1Q1,
            'S1_Q2_Field1040_tax': req.body.s1Q2,
            'S1_Q3_Affected': req.body.s1Q3,
            'S3_Q1': req.body.s3Q1,
            'S3_Q2': req.body.s3Q2,
            'S4_Q1': req.body.s4Q1,
            'S4_Q2': req.body.s4Q2,
            'S4_Q3': req.body.s4Q3,
            'S5_Q1': req.body.s5Q1
        }],
        trigger: ['approval', 'workflow', 'blueprint']
    }

    const dealsUrl = "https://www.zohoapis.com/crm/v2/Deals";
    
    const tokenData = {
        refresh_token: REFRESH_TOKEN,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: GRANT_TYPE
    };

    try {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', new URLSearchParams(tokenData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const accessToken = response.data.access_token;
        
        try {
            const response = await axios.post(dealsUrl, postData, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return response;
        } catch (error) {
            console.error('Error:', error);
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
