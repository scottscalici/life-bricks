export default async function handler(req, res) {
    // Grab the secret URL from your environment variables
    const coziUrl = process.env.VITE_COZI_URL;
  
    if (!coziUrl) {
      return res.status(500).json({ error: "Missing Cozi URL in Environment Variables" });
    }
  
    try {
      // Have the Vercel server fetch the file
      const response = await fetch(coziUrl);
      const text = await response.text();
  
      // Attach permissive headers so your frontend is allowed to read it
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/calendar');
      
      // Send the raw calendar data down to your app
      res.status(200).send(text);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Cozi feed" });
    }
  }