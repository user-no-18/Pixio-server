import express from 'express'

const app = express()
const PORT = 4000

app.get('/', (req, res) => {
  res.json({ message: "Test works!" })
})

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`)
})