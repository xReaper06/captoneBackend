require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('./config/dbConnection.js');
const authRoute = require('./routes/authRoute.js');
const app = express();

// Use bodyParser.urlencoded before bodyParser.json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors());

const corsOptions = {
    origin: 'http://192.168.0.108:8080', // Replace with your client app's URL
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));

app.use(express.static('public'));
app.use('/api', authRoute);
app.use('/api/images', express.static('public/images'));

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    res.status(err.statusCode).json({
        message: err.message,
    });
});

app.listen(process.env.AUTH_PORT, () => console.log(`Server is running on Port ${process.env.AUTH_PORT}`));
