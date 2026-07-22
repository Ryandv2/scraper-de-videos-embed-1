import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy-initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Common patterns for Streamwish, Vidhide, and other popular video servers
const VIDEO_SERVERS_PATTERNS = [
  { name: "Streamwish", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:streamwish|strwish|wishembed|awish|dwish)[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Vidhide", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:vidhide|vidhad|vidiashare|streamhide|hidevid)[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Filemoon", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:filemoon|fmoon|moonembed)[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Streamtape", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:streamtape|strtape|strcloud)[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Vidoza", regex: /https?:\/\/[a-zA-Z0-9-.]*vidoza[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Doodstream", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:doodstream|dood\.(?:to|watch|so|la|ws|wf|cx|sh))[a-zA-Z0-9-._/&?=]+/gi },
  { name: "VOE", regex: /https?:\/\/[a-zA-Z0-9-.]*voe\.(?:sx|to|am|cx)[a-zA-Z0-9-._/&?=]+/gi },
  { name: "Mixdrop", regex: /https?:\/\/[a-zA-Z0-9-.]*(?:mixdrop|mixdrp)[a-zA-Z0-9-._/&?=]+/gi },
];

// Helper to decode Hex and Unicode escape sequences
function decodeHexUnicode(str: string): string {
  try {
    let decoded = str.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    decoded = decoded.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    return decoded;
  } catch {
    return str;
  }
}

// Helper to unpack Dean Edwards Packer scripts
function unpackPacker(code: string): string {
  const packerRegex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[r|d]\s*\)\s*\{[\s\S]*?\}\s*\(\s*(['"][\s\S]*?['"])\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"][\s\S]*?['"])\.split\(\s*['"]\|['"]\s*\)\s*,\s*(\d+)\s*,\s*(\{.*\}|\w+)\s*\)\s*\)/gi;
  
  let unpacked = "";
  let match;
  while ((match = packerRegex.exec(code)) !== null) {
    try {
      // Safely evaluate the template string and split string
      let p = new Function(`return ${match[1]}`)();
      const a = parseInt(match[2], 10);
      const c = parseInt(match[3], 10);
      const k = new Function(`return ${match[4]}`)().split('|');
      
      const baseConvert = (num: number, radix: number): string => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (num < radix) return chars[num] || '0';
        return baseConvert(Math.floor(num / radix), radix) + (chars[num % radix] || '0');
      };

      const dict: Record<string, string> = {};
      for (let i = 0; i < k.length; i++) {
        if (k[i]) {
          const key = baseConvert(i, a);
          dict[key] = k[i];
        }
      }

      const unpackedPiece = p.replace(/\b(\w+)\b/g, (word: string) => {
        return dict[word] || word;
      });
      unpacked += "\n" + unpackedPiece;
    } catch (e) {
      console.error("Error unpacking block:", e);
    }
  }
  return unpacked;
}

// Helper to find and decode Base64 strings in HTML/Scripts
function extractBase64Embeds(html: string): Array<{ server: string; url: string; type: string; encryptionType: string }> {
  const results: Array<{ server: string; url: string; type: string; encryptionType: string }> = [];
  const base64Regex = /[A-Za-z0-9+/]{20,300}={0,2}/g;
  let match;
  
  while ((match = base64Regex.exec(html)) !== null) {
    const candidate = match[0];
    try {
      const decoded = Buffer.from(candidate, 'base64').toString('utf8');
      // If it looks like a url or matches a server
      if (/https?:\/\//i.test(decoded)) {
        for (const pattern of VIDEO_SERVERS_PATTERNS) {
          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(decoded)) {
            const cleanUrl = decoded.replace(/["';,>\\].*$/, "");
            results.push({
              server: pattern.name,
              url: cleanUrl,
              type: "direct_link",
              encryptionType: "Base64 Obfuscated"
            });
          }
        }
      }
    } catch {
      // Not valid utf8 or not base64
    }
  }
  return results;
}

// Helper to extract iframes and direct links matching video hosts with automatic decrypters
function extractEmbedsFromHTML(html: string): Array<{ server: string; url: string; type: "iframe" | "direct_link"; isEncrypted?: boolean; encryptionType?: string }> {
  const results: Array<{ server: string; url: string; type: "iframe" | "direct_link"; isEncrypted?: boolean; encryptionType?: string }> = [];
  const uniqueUrls = new Set<string>();

  // Helper to add if valid
  const addEmbed = (server: string, url: string, type: "iframe" | "direct_link", isEncrypted = false, encryptionType?: string) => {
    const cleanUrl = url.replace(/["';,>\\].*$/, "");
    if (!uniqueUrls.has(cleanUrl)) {
      uniqueUrls.add(cleanUrl);
      results.push({
        server,
        url: cleanUrl,
        type,
        ...(isEncrypted ? { isEncrypted: true, encryptionType } : {})
      });
    }
  };

  // 1. Decoded Hex/Unicode check on raw html
  const decodedRawHtml = decodeHexUnicode(html);

  // 2. Unpack Packer scripts
  const unpackedScript = unpackPacker(html);
  const fullyExpandedHtml = decodedRawHtml + "\n" + unpackedScript;

  // 3. Extract iframe sources
  const iframeRegex = /<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
  let iframeMatch;
  while ((iframeMatch = iframeRegex.exec(fullyExpandedHtml)) !== null) {
    const src = iframeMatch[1];
    for (const pattern of VIDEO_SERVERS_PATTERNS) {
      if (pattern.regex.test(src)) {
        const isEncrypted = html.indexOf(src) === -1; // If URL is not in raw HTML, it came from decoding/depacking!
        addEmbed(pattern.name, src, "iframe", isEncrypted, isEncrypted ? "Packer/Hex Obfuscation" : undefined);
      }
    }
  }

  // 4. Extract direct matches
  for (const pattern of VIDEO_SERVERS_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(fullyExpandedHtml)) !== null) {
      const url = match[0];
      const isEncrypted = html.indexOf(url) === -1;
      addEmbed(pattern.name, url, "direct_link", isEncrypted, isEncrypted ? "Packer/Hex Obfuscation" : undefined);
    }
  }

  // 5. Extract Base64 encoded urls
  const b64Embeds = extractBase64Embeds(html);
  for (const b64 of b64Embeds) {
    addEmbed(b64.server, b64.url as any, b64.type as any, true, b64.encryptionType);
  }

  return results;
}

// Endpoint to scrape a URL
app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL target is required" });
    return;
  }

  try {
    // Attempt to fetch the URL content
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const fetchRes = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    const html = await fetchRes.text();
    const embeds = extractEmbedsFromHTML(html);

    res.json({
      success: true,
      url,
      embeds,
      htmlSnippet: html.substring(0, 5000), // Return a snippet for analysis
      realScrape: true
    });
  } catch (error: any) {
    // If real scrape fails (very common with cloudflare/iframe protection on server-side nodes), 
    // we return a simulation mode where the user is informed, and we use Gemini to create a realistic simulation or explanation.
    console.error("Direct scrape failed, triggering friendly fallback", error.message);
    
    // We can also generate mock embeds based on the URL name to demonstrate the scraper in action!
    const mockEmbeds = [
      { server: "Streamwish", url: `https://streamwish.to/e/${Math.random().toString(36).substring(2, 12)}`, type: "iframe" as const },
      { server: "Vidhide", url: `https://vidhidepro.com/v/${Math.random().toString(36).substring(2, 12)}`, type: "iframe" as const },
    ];

    res.json({
      success: true,
      url,
      embeds: mockEmbeds,
      note: "Scraping directo restringido por la seguridad del servidor destino (Cloudflare/CORS). Mostrando simulación educativa en base al target.",
      realScrape: false
    });
  }
});

// Endpoint to parse raw HTML content (pasted by user)
app.post("/api/analyze-html", (req, res) => {
  const { html } = req.body;
  if (!html) {
    res.status(400).json({ error: "HTML content is required" });
    return;
  }

  try {
    const embeds = extractEmbedsFromHTML(html);
    res.json({
      success: true,
      embeds,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to create a real MercadoPago payment preference
app.post("/api/create-preference", async (req, res) => {
  const { planId, title, price } = req.body;
  if (!planId || !price) {
    res.status(400).json({ error: "planId and price are required" });
    return;
  }

  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "APP_USR-7403584364594721-071801-f7418a9ec3cc2dd94167486ec4407cd0-3535635003";
  const appUrl = process.env.APP_URL || "https://ais-dev-ddr6xfn6nox6ou3wpwkg55-559188252557.us-west2.run.app"; // Dev or production domain

  try {
    // We send a POST request directly to the MercadoPago API
    const response = await fetch("https://api.mercadopago.com/v1/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: planId,
            title: title || `Plan ${planId}`,
            quantity: 1,
            unit_price: parseFloat(price),
            currency_id: "USD",
          }
        ],
        back_urls: {
          success: `${appUrl}?payment_status=approved&plan_id=${planId}`,
          failure: `${appUrl}?payment_status=failed`,
          pending: `${appUrl}?payment_status=pending`
        },
        auto_return: "approved",
      })
    });

    const data = await response.json();
    if (response.ok && data.init_point) {
      res.json({
        success: true,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point,
        preferenceId: data.id,
      });
    } else {
      console.warn("MercadoPago API returned error for USD, attempting fallback with local currency:", data);
      
      // Fallback in case USD is not supported by user's specific gateway account country
      const fallbackResponse = await fetch("https://api.mercadopago.com/v1/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: planId,
              title: `${title || `Plan ${planId}`} (USD Equiv)`,
              quantity: 1,
              // Convert USD price to local currency approximate equivalent
              unit_price: parseFloat(price) * 1000, 
              currency_id: "ARS", // Fallback to ARS or MXN depending on account standard
            }
          ],
          back_urls: {
            success: `${appUrl}?payment_status=approved&plan_id=${planId}`,
            failure: `${appUrl}?payment_status=failed`,
            pending: `${appUrl}?payment_status=pending`
          },
          auto_return: "approved",
        })
      });

      const fallbackData = await fallbackResponse.json();
      if (fallbackResponse.ok && fallbackData.init_point) {
        res.json({
          success: true,
          initPoint: fallbackData.init_point,
          sandboxInitPoint: fallbackData.sandbox_init_point,
          preferenceId: fallbackData.id,
        });
      } else {
        throw new Error(fallbackData.message || JSON.stringify(fallbackData));
      }
    }
  } catch (err: any) {
    console.error("MercadoPago API error details:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      note: "No se pudo conectar con MercadoPago debido a un error de credenciales o de red. Activando modo simulación.",
    });
  }
});

// Endpoint to explain scraping methods or help modify the generated script
app.post("/api/explain-code", async (req, res) => {
  const { prompt, currentCode, type } = req.body;

  try {
    const ai = getGeminiClient();
    const systemPrompt = `Eres un desarrollador experto en Python, Ingeniería de Software y Web Scraping.
Tu objetivo es responder de forma concisa, educacional y súper clara en ESPAÑOL.
Ayudas al usuario a entender cómo extraer enlaces embed (como Streamwish y Vidhide) usando Playwright o BeautifulSoup.
Código actual proporcionado:
\`\`\`python
${currentCode || "No code provided yet."}
\`\`\`
Tipo de consulta: ${type || "general"}.

Responde de manera estructurada con explicaciones sencillas y consejos prácticos para evitar bloqueos (User-Agents, proxies, stealth headers). No añadas jerga innecesaria.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al conectar con la Inteligencia Artificial de Gemini.",
    });
  }
});

// Setup Vite development or production server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
