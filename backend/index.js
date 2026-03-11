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
    // This endpoint is no longer responsible for saving data.
    // The data is saved after successful payment in the /success endpoint.
    res.status(200).send('OK');
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

app.post('/success', async (req, res) => {
    console.log('--- /success endpoint hit ---');
    console.log('Request body:', req.body);

    const { paymentKey, orderId, amount, agree, course, name, dob, gender, phone, email, emergency_contact, tshirt_size } = req.body;
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
        console.log('Toss Payments confirmation response:', payment);

        if (payment.status === 'DONE') {
            const registrationData = {
                type: 'individual',
                course,
                name,
                dob,
                gender,
                phone,
                email,
                emergency_contact,
                tshirt_size,
                orderId,
                paymentStatus: 'DONE'
            };

            let registrations = [];
            try {
                const data = await fs.readFile('registrations.json', 'utf8');
                registrations = JSON.parse(data);
                console.log('Successfully read registrations.json');
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Error reading registrations.json:', error);
                    throw error;
                }
                console.log('registrations.json not found, creating new file.');
            }

            registrations.push(registrationData);
            
            try {
                await fs.writeFile('registrations.json', JSON.stringify(registrations, null, 2));
                console.log('Successfully wrote to registrations.json');
            } catch (writeError) {
                console.error('Error writing to registrations.json:', writeError);
                throw writeError;
            }

            console.log('Payment successful');
            res.status(200).send('OK');
        } else {
            console.log('Payment not DONE');
            res.status(400).send('Payment not complete');
        }
    } catch (error) {
        console.error('--- Error in /success endpoint ---');
        console.error(error);
        res.status(500).send('Error');
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
