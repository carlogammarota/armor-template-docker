const express = require('express');
const bodyParser = require('body-parser');
const paypal = require('paypal-rest-sdk');

// Configura PayPal SDK con tus credenciales de sandbox
paypal.configure({
  mode: 'sandbox', // 'sandbox' o 'live'
  client_id: 'AYToHdsUIAr9M-7M-U38jwlo-qS5MIAXO53cMhH0mcguS4qYMshX-QHfSCrqWrUsgk74ESK6FbGNWBMx',
  client_secret: 'EKNU57pApeXr8oWMNaPEYQVMyuzkEVvKlBV5x1pkMgkeN6kB2kXirXjpT56vfAIqaa2gswGU-OJEWAzG'
});

const app = express();
const port = 7171;

// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para crear el pago
app.post('/create-payment', (req, res) => {
  const payment = {
    intent: 'sale',
    redirect_urls: {
      return_url: 'http://localhost:3000/success', // URL a la que se redirige después del pago
      cancel_url: 'http://localhost:3000/cancel'  // URL a la que se redirige si el pago es cancelado
    },
    payer: {
      payment_method: 'paypal'
    },
    transactions: [{
      amount: {
        total: '10.00', // Monto total del pago
        currency: 'USD' // Moneda del pago
      },
      description: 'Descripción del pago'
    }]
  };

  paypal.payment.create(payment, (error, payment) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error creating payment');
    } else {
      // Encuentra el enlace de aprobación (approve_url) para redirigir al usuario
      const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
      if (approvalUrl) {
        res.redirect(approvalUrl.href);
      } else {
        res.status(500).send('Approval URL not found');
      }
    }
  });
});

// Ruta para manejar la notificación de webhook de PayPal
app.post('/webhook', (req, res) => {
    console.log('Webhook received:');
  const webhookEvent = req.body;

  // Verifica el webhook event (opcional: valida la firma del webhook si es necesario)
  console.log('Webhook received:', webhookEvent);

  // Maneja el evento del webhook
  if (webhookEvent.event_type === 'PAYMENT.SALE.COMPLETED') {
    console.log('Payment completed:', webhookEvent);
    // Aquí puedes actualizar el estado del pago en tu base de datos o tomar alguna acción
  }

  
  switch (webhookEvent.event_type) {
    case 'BILLING.SUBSCRIPTION.CREATED':
      console.log('Subscription created:', webhookEvent);
      // Maneja la creación de la suscripción
      break;
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      console.log('Subscription activated:', webhookEvent);
      // Maneja la activación de la suscripción
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      console.log('Subscription cancelled:', webhookEvent);
      // Maneja la cancelación de la suscripción
      break;
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      console.log('Subscription suspended:', webhookEvent);
      // Maneja la suspensión de la suscripción
      break;
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      console.log('Subscription re-activated:', webhookEvent);
      // Maneja la reactivación de la suscripción
      break;
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      console.log('Payment failed:', webhookEvent);
      // Maneja el fallo en el pago
      break;
    case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
      console.log('Payment succeeded:', webhookEvent);
      // Maneja el éxito del pago
      break;
    default:
      console.log('Unhandled event type:', webhookEvent.event_type);
  }

  res.status(200).send('Webhook received');
});

// Rutas de éxito y cancelación
app.get('/success', (req, res) => {
  res.send('Payment successful!');
});

app.get('/cancel', (req, res) => {
  res.send('Payment canceled.');
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
