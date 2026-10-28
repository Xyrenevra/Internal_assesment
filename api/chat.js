
export default async function handler(req, res) {
  // Allow POST requests only.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed. Please use POST."
    });
  }

  try {
    // Validate the incoming message.
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    // Read the secret API key from Vercel environment variables.
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("GROQ_API_KEY is not configured.");

      return res.status(500).json({
        error: "Server configuration error: GROQ_API_KEY is missing."
      });
    }

    // Send the message to Groq using the updated model.
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are the AI assistant for Pratik Singh's CSE portfolio. Answer questions helpfully and clearly about the portfolio. Do not invent personal details, education, skills, or projects that have not been provided."
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

    // Read the provider response safely.
    const rawResponse = await response.text();
    let data;

    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(
        "Groq returned invalid JSON. HTTP status:",
        response.status
      );

      return res.status(502).json({
        error: "The AI provider returned an invalid response."
      });
    }

    // Handle API errors.
    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        data.error || data
      );

      return res.status(502).json({
        error:
          data.error?.message ||
          "The AI service could not process your request."
      });
    }

    // Extract the generated answer.
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      console.error("Groq returned no usable message.");

      return res.status(502).json({
        error: "The AI provider returned an empty response."
      });
    }

    // Return the answer to script.js.
    return res.status(200).json({
      reply: reply.trim()
    });
  } catch (error) {
    console.error("Chat backend error:", error);

    return res.status(500).json({
      error: "An internal chatbot error occurred. Please try again."
    });
  }
}


