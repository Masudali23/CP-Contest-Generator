import dotenv from 'dotenv'
import 'dotenv/config';
import axios from 'axios'
import app from './app.js';
import connectDB from './config/index.js';
import connectRedis, { redisClient } from './config/redis.js';


dotenv.config({
    path: "./.env",
});

const port = process.env.PORT;


const startServer = async () => {
    await connectDB();
    await connectRedis();
    
    app.listen(port, () => {
        console.log(`Server is listening on port: ${port}`);
    });
};

startServer();