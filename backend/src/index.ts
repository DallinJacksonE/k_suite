import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON bodies automatically
app.use(express.json());

// Simple Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// A sample POST endpoint to handle incoming data
app.post('/api/data', (req: Request, res: Response) => {
  const { name, message } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Missing required field: name' });
    return;
  }

  res.status(201).json({
    success: true,
    received: { name, message },
    reply: `Hello ${name}! Your message was processed successfully.`
  });
});

// Global 404 Catch-all handler (Express 5 safe)
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running smoothly at http://localhost:${PORT}`);
});
