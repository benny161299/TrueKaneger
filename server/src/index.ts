import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Load environment variables
dotenv.config();

// Connect to Database
await connectDB();

console.log('Database initialization check completed.');
