
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("GROQ_API_KEY is not configured.");

      return res.status(500).json({
        error: "Missing GROQ_API_KEY environment variable in Vercel."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are the AI assistant for Pratik Singh's CSE portfolio. Answer questions helpfully. Do not invent personal details, skills, education, or projects."
            },
            {
              role: "user",
              content: message.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      }
    );

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Groq returned non-JSON:", response.status);

      return res.status(502).json({
        error: "The AI provider returned an invalid response."
      });
    }

    if (!response.ok) {
      console.error("Groq API error:", response.status, data);

      return res.status(502).json({
        error:
          data.error?.message ||
          `Groq request failed with status ${response.status}.`
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "The AI provider returned an empty response."
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });
  } catch (error) {
    console.error("Chat backend error:", error);

    return res.status(500).json({
      error: "Chat server error. Check Vercel function logs."
    });
  }
}

