import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: '*', // Replace with your frontend's origin
}));
app.use(express.json());

let data = 'Initial data';
app.get('/data', (req, res) => {
    res.json({ data });
})

app.put('/data', (req, res) => {
    data = req.body.data;
    res.json({ message: 'Data updated' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});