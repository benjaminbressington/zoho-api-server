require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
const saveProgress = async (progress_data) =>
    {
        try
        {    
            const progressData = {
                formData: progress_data.formData,
                currentPage: progress_data.currentPage,
                token: progress_data.token,
                email: progress_data.email,
            };
    
            const emailExistsResponse = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/email_exists_user_progress?email=${progressData.email}`);
            const emailExists = emailExistsResponse.data;
    
            if (emailExists)
            {
                await axios.patch(
                    'https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/user_progress',
                    progressData
                );
            } else
            {
                await axios.post(
                    'https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/user_progress',
                    progressData
                );
            }
    
        } catch (error)
        {
            console.error('Error saving progress:', error);
        }
    };
    
    
    const loadProgress = async (email) =>
    {
        try
        {
            const response = await axios.get(`https://xyrm-sqqj-hx6t.n7c.xano.io/api:wFpE3Mgi/get_user_progress?email=${email}`);
            if (response.status === 200)
            {
                return response.data;
            } else
            {
                console.error('Progress not found');
                return null;
            }
        } catch (error)
        {
            console.error('Error loading progress:', error);
        }
    };

    const sendEmail = async (to, subject, text) => {
        const mailOptions = {
          from: process.env.FROM_EMAIL,
          to,
          subject,
          text,
        };
      
        try {
          const result = await transporter.sendMail(mailOptions);
          console.log('Email sent:', result);
          return result;
        } catch (error) {
          console.error('Error sending email:', error);
        }
    };
      

module.exports = { saveProgress, loadProgress, sendEmail };