import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@^2.40.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1. Verifica autenticazione utente
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Manca token di autorizzazione" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utente non autorizzato" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt obbligatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Lettura profilo e dati nel perimetro RLS dell'utente
    const { data: profilo } = await supabaseUser
      .from("profili")
      .select("nome, ruolo, percentuale_provvigione")
      .eq("id", user.id)
      .single()

    const ruolo = profilo?.ruolo ?? "operatore"

    // Recuperiamo i rinnovi nel perimetro di questo utente (filtrati da RLS)
    const { data: rinnovi } = await supabaseUser
      .from("rinnovi_in_scadenza")
      .select("cliente_nome, piano, prezzo, data_fine, giorni_a_scadenza")
      .order("giorni_a_scadenza", { ascending: true })
      .limit(5)

    // Recuperiamo il conteggio clienti accessibili
    const { count: countClienti } = await supabaseUser
      .from("clienti")
      .select("*", { count: "exact", head: true })

    // Contesto per il modello AI
    const contesto = {
      utente: {
        nome: profilo?.nome ?? user.email,
        ruolo: ruolo,
        provvigione_percentuale: ruolo === "agente" ? profilo?.percentuale_provvigione : undefined,
      },
      clienti_totali_visibili: countClienti ?? 0,
      prossimi_rinnovi_in_scadenza: rinnovi ?? [],
    }

    const systemPrompt = `Sei l'assistente AI intelligente di "DEMO CRM Benessere", un CRM per centri benessere e spa.
L'utente loggato è: ${contesto.utente.nome} con ruolo: ${contesto.utente.ruolo}.
DATI ATTUALI DISPONIBILI DAL DATABASE (già filtrati con Row Level Security per questo utente):
${JSON.stringify(contesto, null, 2)}

REGOLE CRUCIALI:
1. Rispondi SEMPRE in italiano, in modo professionale, sintetico e orientato al business (aumento retention, tempestività sui rinnovi).
2. Non inventare clienti non presenti nella lista: usa solo i dati forniti. Se l'utente chiede informazioni su clienti che non compaiono, spiega con cortesia che la sicurezza RLS non include quei clienti nel suo portafoglio.
3. Se l'utente è un agente commerciale, aiutalo a massimizzare i rinnovi e i suoi compensi. Se è un operatore, focalizzati sull'accoglienza. Se è admin, offri una visione gestionale.`

    // 3. Selezione Provider AI
    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim()
    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim()
    const providerPreferred = Deno.env.get("AI_PROVIDER")?.toLowerCase() || "gemini"

    let aiResponse = ""
    let providerUsed = "demo_fallback"

    // OPZIONE A: Claude (se espressamente configurato o con provider = claude)
    if ((providerPreferred === "claude" || !geminiKey) && claudeKey) {
      providerUsed = "claude"
      const resClaude = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (!resClaude.ok) {
        const errBody = await resClaude.text()
        throw new Error(`Errore API Anthropic Claude: ${errBody}`)
      }

      const claudeJson = await resClaude.json()
      aiResponse = claudeJson.content?.[0]?.text ?? "Nessuna risposta da Claude."
    }
    // OPZIONE B: Google Gemini (Gratuito tramite Google AI Studio)
    else if (geminiKey) {
      providerUsed = "gemini"
      
      // Recuperiamo la lista dei modelli disponibili per questa chiave
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
      const listJson = await listRes.json()
      const availableModels: string[] = (listJson.models || [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes("generateContent")
        )
        .map((m: { name: string }) => m.name.replace("models/", ""))

      console.log("Modelli Gemini disponibili:", availableModels)

      // In accordo con le API correnti Google AI Studio per nuovi utenti: gemini-3.8-flash
      const targetModel =
        availableModels.find((m) => m === "gemini-3.8-flash") ||
        availableModels.find((m) => m.includes("3.8-flash")) ||
        availableModels.find((m) => m.includes("flash")) ||
        availableModels[0] ||
        "gemini-3.8-flash"
      if (!targetModel) {
        throw new Error(`Nessun modello con generateContent trovato per la chiave: ${JSON.stringify(listJson)}`)
      }

      const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiKey}`
      const resGemini = await fetch(urlGemini, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      })

      if (resGemini.ok) {
        const geminiJson = await resGemini.json()
        aiResponse = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      } else {
        const errBody = await resGemini.text()
        console.warn(`Avviso temporaneo Gemini (${targetModel}), attivato fallback su dati CRM:`, errBody)
        providerUsed = "demo_fallback"
      }
    }

    // Se il provider non ha prodotto risposta (o fallback per assenza chiavi / spike 503)
    if (!aiResponse) {
      if (providerUsed !== "gemini" && providerUsed !== "claude") {
        providerUsed = "demo_fallback"
      }
      const listaRinnovi = (rinnovi || [])
        .map((r) => `• **${r.cliente_nome}** (${r.piano}, ${r.prezzo}€) — scade tra ${r.giorni_a_scadenza} giorni`)
        .join("\n")

      aiResponse = `*(Risposta basata sui dati analitici del CRM - Fallback attivo)*\n\n` +
        `Ciao **${contesto.utente.nome}**! Nel tuo perimetro attuale (${contesto.utente.ruolo}) risultano **${contesto.clienti_totali_visibili} clienti** registrati.\n\n` +
        `I contratti prioritari in scadenza nel range di 30 giorni sono:\n${listaRinnovi || "Nessun abbonamento in scadenza rilevato."}\n\n` +
        `💡 *Suggerimento strategico per ${contesto.utente.ruolo}:* Contatta tempestivamente i clienti con scadenza inferiore a 7 giorni per proporre il rinnovo promozionale prima della scadenza definitiva.`
    }

    return new Response(
      JSON.stringify({
        risposta: aiResponse,
        provider: providerUsed,
        utente: contesto.utente,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto"
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
