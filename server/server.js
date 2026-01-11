import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import connectDB from './config/db.js'
import userRouter from './routes/userRouters.js'
import imageRouter from './routes/imageRouts.js'
import otpRouter from './routes/otpRoutes.js'
import dashboardRouter from './routes/dashboardRoutes.js'

const PORT = process.env.PORT || 4000
const app = express()

// Production CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://image-generator-ai-client-6gp4-mmqh2m8ci.vercel.app',
  'https://image-generator-ai-client-mtws.vercel.app'
]

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('Blocked origin:', origin)
      callback(null, true)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

await connectDB()

// COMMENTED OUT TO TEST
app.use('/api/user', userRouter)
app.use('/api/image', imageRouter)
app.use("/api/otp", otpRouter);
app.use('/api/dashboard', dashboardRouter);


app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: "API Working fine ",
    timestamp: new Date().toISOString()
  })
})

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  })
})

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