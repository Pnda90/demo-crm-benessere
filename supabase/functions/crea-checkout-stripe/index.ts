import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from "npm:stripe@^16.0.0"
import { createClient } from "npm:@supabase/supabase-js@^2.40.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Gestione preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim()
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY non configurata nei secrets Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Verifica utente autenticato chiamante
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Manca token di autorizzazione" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utente non autorizzato" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { abbonamento_id } = await req.json()
    if (!abbonamento_id) {
      return new Response(
        JSON.stringify({ error: "abbonamento_id obbligatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Lettura dati abbonamento e cliente (rispetta RLS tramite client utente)
    const { data: abbonamento, error: abbError } = await supabaseUserClient
      .from("abbonamenti")
      .select("id, piano, prezzo, cliente_id, clienti(nome, email)")
      .eq("id", abbonamento_id)
      .single()

    if (abbError || !abbonamento) {
      return new Response(
        JSON.stringify({ error: "Abbonamento non trovato o non accessibile" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" })

    // 3. Creazione sessione Stripe Checkout (in Test Mode)
    const origin = req.headers.get("origin") || "http://localhost:5173"
    const prezzoCent = Math.round(Number(abbonamento.prezzo) * 100)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Rinnovo ${abbonamento.piano} - Centro Benessere`,
              description: `Rinnovo per ${abbonamento.clienti?.nome ?? 'Cliente'}`,
            },
            unit_amount: prezzoCent,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: abbonamento.clienti?.email ?? undefined,
      metadata: {
        abbonamento_id: abbonamento.id.toString(),
        cliente_id: abbonamento.cliente_id.toString(),
        richiesto_da: user.id,
      },
      success_url: `${origin}/?pagamento=successo&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?pagamento=annullato`,
    })

    // 4. Inserimento record pagamento "in_attesa" usando il service role per garantire la scrittura
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { error: errPag } = await supabaseAdmin
      .from("pagamenti")
      .insert({
        abbonamento_id: abbonamento.id,
        importo: abbonamento.prezzo,
        stato: "in_attesa",
        stripe_session_id: session.id,
      })

    if (errPag) {
      console.error("Errore salvataggio pagamento in attesa:", errPag)
    }

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
