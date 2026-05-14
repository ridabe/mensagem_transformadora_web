type GenerateSermonParams = {
  title: string;
  mainVerse: string;
  secondaryVerses?: string[];
  notes?: string | null;
};

type GeminiCandidate = {
  content?: { parts?: Array<{ text?: string }> };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string; status?: string };
};

function buildPrompt(params: GenerateSermonParams): string {
  const { title, mainVerse, secondaryVerses, notes } = params;

  const versesLine = secondaryVerses?.length
    ? `\nVersículos secundários: ${secondaryVerses.join("; ")}`
    : "";

  const notesLine = notes?.trim()
    ? `\nNotas e rascunho do pregador:\n${notes.trim()}`
    : "";

  return `Você é um assistente especializado em pregação cristã evangélica brasileira.
Com base nas informações abaixo, escreva uma mensagem/sermão completo em português do Brasil.

Título: ${title}
Versículo principal: ${mainVerse}${versesLine}${notesLine}

Estruture a mensagem com:
1. Título — inicie o texto diretamente com o título da pregação
2. Introdução — apresente o tema e contextualize os versículos de forma envolvente
3. Desenvolvimento — 2 a 3 pontos principais, fundamentados nos versículos fornecidos
4. Aplicação prática — como o cristão pode viver essa verdade no dia a dia
5. Conclusão — chamado à reflexão, ação ou oração

Regras importantes:
- NÃO inclua saudações, cumprimentos ou introduções como "Queridos irmãos", "Bom dia", "Olá" ou similares
- Comece o texto diretamente com o título da pregação
- Use linguagem clara, edificante e acessível para uma congregação evangélica
- Baseie todo o conteúdo nos versículos fornecidos
- Responda apenas com o texto da mensagem, sem títulos de seção numerados nem comentários adicionais`;
}

export async function generateSermon(params: GenerateSermonParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: buildPrompt(params) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const msg = data.error?.message ?? `Erro ${response.status} na API do Gemini.`;
    if (response.status === 429 || msg.toLowerCase().includes("quota")) {
      throw new Error(
        "Limite de gerações de IA atingido. Aguarde alguns minutos e tente novamente.",
      );
    }
    if (msg.toLowerCase().includes("no longer available")) {
      throw new Error("Modelo de IA indisponível. Entre em contato com o suporte.");
    }
    throw new Error(msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("A API do Gemini não retornou conteúdo.");

  return text;
}
