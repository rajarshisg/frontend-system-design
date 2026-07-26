import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: '*', // Replace with your frontend's origin
}));
app.use(express.json());

let data = 'Initial data';
const onHoldClients = [];
app.get('/data', (req, res) => {
    const clientData = req.query.data;
    if (data != clientData) {
        res.json({ data });
    } else {
        onHoldClients.push(res);
    }
})

app.put('/data', (req, res) => {
    data = req.body.data;
    res.json({ message: 'Data updated' });
    
    // Notify all on-hold clients about the data update
    onHoldClients.forEach(client => client.json({ data }));
    onHoldClients.length = 0; // Clear the array
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});