import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from "npm:stripe@^16.0.0"
import { createClient } from "npm:@supabase/supabase-js@^2.40.0"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim()
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim()

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY non configurata" }), { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" })
  const signature = req.headers.get("stripe-signature")
  const body = await req.text()

  let event: Stripe.Event

  try {
    // Se c'è il webhookSecret verifichiamo crittograficamente la firma
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // In modalità test demo senza secret configurato, decodifichiamo il payload
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore validazione webhook"
    console.error("Errore verifica webhook Stripe:", msg)
    return new Response(`Webhook Error: ${msg}`, { status: 400 })
  }

  // Client Supabase con service_role per aggiornare stato pagamento e contratti
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`Ricevuto evento Stripe: ${event.type}`)

  try {
    let updateError: string | null = null
    let updatedData: unknown = null

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const sessionId = session.id
      const abbonamentoId = session.metadata?.abbonamento_id

      console.log(`Checkout completato per sessione ${sessionId}, abbonamento #${abbonamentoId}`)

      // 1. Aggiorniamo il pagamento a 'pagato'.
      // NOTA BENE: Questo UPDATE attiva automaticamente il trigger Postgres di Fase 2
      // che calcola e accredita la provvigione all'agente assegnato!
      const { data: pagamentiAggiornati, error: pagError } = await supabaseAdmin
        .from("pagamenti")
        .update({
          stato: "pagato",
          pagato_il: new Date().toISOString(),
        })
        .eq("stripe_session_id", sessionId)
        .select()

      if (pagError) {
        console.error("Errore aggiornamento pagamento:", pagError)
        updateError = pagError.message
      } else {
        console.log("Pagamento registrato come pagato:", pagamentiAggiornati)
        updatedData = pagamentiAggiornati
      }

      // 2. Se abbiamo l'abbonamento_id, estendiamo o confermiamo la validità del contratto
      if (abbonamentoId) {
        await supabaseAdmin
          .from("abbonamenti")
          .update({
            stato: "attivo",
          })
          .eq("id", abbonamentoId)
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      console.log(`Rimborso ricevuto per charge ${charge.id}`)
    }

    if (updateError) {
      return new Response(JSON.stringify({ received: false, error: updateError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ received: true, data: updatedData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore gestione webhook"
    console.error("Errore elaborazione webhook:", msg)
    return new Response(`Errore interno: ${msg}`, { status: 500 })
  }
})
