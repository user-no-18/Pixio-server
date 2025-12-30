import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import connectDB from './config/db.js'
import userRouter from './routes/userRouters.js'
import imageRouter from './routes/imageRouts.js'

const PORT = process.env.PORT || 4000
const app = express()

// Production CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://image-generator-ai-client-6gp4-mmqh2m8ci.vercel.app',
  'https://image-generator-ai-client-mtws.vercel.app'
]

// Add FRONTEND_URL from environment if exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true)
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true)
    } else {
      console.log('Blocked origin:', origin)
      // For development: allow anyway
      callback(null, true)
      // For production: uncomment below and comment above
      // callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
}))

// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Connect to database
await connectDB()

// Routes
app.use('/api/user', userRouter)
app.use('/api/image', imageRouter)

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: "API Working fine",
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Allowed origins:`, allowedOrigins)
})