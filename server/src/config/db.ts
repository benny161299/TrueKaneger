import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('Error: MONGO_URI is not defined in the environment variables.');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
};
