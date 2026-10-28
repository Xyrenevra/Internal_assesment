export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message"
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are the AI assistant on Pratik Singh's CSE portfolio. Answer questions helpfully and accurately."
            },
            {
              role: "user",
              content: message.trim()
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(502).json({
        error: "The AI service could not process your request."
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content
        || "No response was generated."
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Internal server error."
    });
  }
}
