const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = 3000;

const fs = require('fs').promises;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('..')); // Serve files from the root directory

app.post('/register', async (req, res) => {
    const registrationData = req.body;

    try {
        let registrations = [];
        try {
            const data = await fs.readFile('registrations.json', 'utf8');
            registrations = JSON.parse(data);
        } catch (error) {
            // If the file doesn't exist, we'll create it.
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        registrations.push(registrationData);

        await fs.writeFile('registrations.json', JSON.stringify(registrations, null, 2));

        res.status(200).send('Registration successful');
    } catch (error) {
        console.error('Error saving registration data:', error);
        res.status(500).send('Error saving registration data');
    }
});

app.get('/registrations', async (req, res) => {
    try {
        const data = await fs.readFile('registrations.json', 'utf8');
        const registrations = JSON.parse(data);
        res.json(registrations);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading registration data:', error);
            res.status(500).send('Error reading registration data');
        }
    }
});

app.get('/success', async (req, res) => {
    const { paymentKey, orderId, amount } = req.query;
    const secretKey = 'test_sk_P24xLea5zVA5xK9pA8B1zrevGX0N'; // TODO: 실제 시크릿 키로 교체해주세요.

    try {
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentKey,
                orderId,
                amount,
            }),
        });

        const payment = await response.json();

        if (payment.status === 'DONE') {
            // TODO: 데이터베이스에 결제 정보 저장
            console.log('Payment successful:', payment);
            res.redirect(`/success.html?orderId=${orderId}`);
        } else {
            res.redirect(`/fail.html?message=${payment.message}`);
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.redirect(`/fail.html?message=${error.message}`);
    }
});

app.get('/fail', (req, res) => {
    const { message, code } = req.query;
    console.log('Payment failed:', message, code);
    res.redirect(`/fail.html?message=${message}`);
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
