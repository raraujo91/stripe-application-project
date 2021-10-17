const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // initializing Stripe with secret key

var app = express();

// view engine setup (Handlebars)
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))
app.use(express.json({}));

/**
 * Home route
 */
app.get('/', function (req, res) {
  res.render('index');
});

/**
 * Checkout route
 */
app.get('/checkout', async function (req, res) {
  // Just hardcoding amounts here to avoid using a database
  const { item, error_message } = req.query;
  let title, amount, error;

  // added a validation to get the error_message from a payment bad path
  if (error_message != undefined) error = error_message;

  switch (item) {
    case '1':
      title = "The Art of Doing Science and Engineering"
      amount = 2300
      break;
    case '2':
      title = "The Making of Prince of Persia: Journals 1985-1993"
      amount = 2500
      break;
    case '3':
      title = "Working in Public: The Making and Maintenance of Open Source"
      amount = 2800
      break;
    default:
      // Included in layout view, feel free to assign error
      error = "No item selected"
      break;
  }

    res.render('checkout', {
      title: title,
      amount: amount,
      error: error
    });

});

/**
 * Public key and client secret route
 */
app.route('/stripe/:endpoint')
  .get(async function (req, res) {
    const { endpoint } = req.params;

    switch (endpoint) {
      // returns Stripe public key for Stripe.js
      case 'config':
        res.json({ public: process.env.STRIPE_PUBLISHABLE_KEY });
        break;
      default:
        res.json({ error: "Route not available"});
        break;
    }
  })
  .post(async function (req, res) {
    const { endpoint } = req.params;

    switch(endpoint) {
      // creating payment intent to send to buyer's approval on front-end
      case 'create':
        const { amount, title } = req.body;

        try {
          // payment intent is created here :)
          const createIntent = await stripe.paymentIntents.create({
            amount,
            description: title,
            currency: 'usd'
          });

          // and it's returned as JSON to the front-end
          res.json({ secret: createIntent.client_secret });
        } catch (err) {
          // logs and throws an error entry for front-end validation in case of error
          console.log(`[${err.statusCode}] ${err.type} | ${err.raw.message}`)
          res.json({ error: true });
        }
        break;
      default:
        res.json({ error: "Route not available"});
        break;      
    }
  });

/**
 * Success route
 */
app.get('/success', async function (req, res) {
  // get pi_ ID from payment execution... 
  const { id } = req.query;

  try {
    // ...to get the data from PaymentIntent Retrieve API
    const stripeIntent = await stripe.paymentIntents.retrieve(id);

    // breaks all information to return on success route
    const { amount, description, receipt_email } = stripeIntent;

    // render the success page with the data
    res.render('success', {
      amount,
      intent_id: id,
      product: description,
      email: receipt_email,
      success: true
    });
  } catch (err) {
    // logs and throws an error entry for front-end validation in case of error
    console.log(`[${err.statusCode}] ${err.type} | ${err.raw.message}`)

    res.render('success', {
      error: "An error was found while retrieving your purchase details. Please contact website owners.",
    })
  }
});

/**
 * Start server
 */
app.listen(3000, () => {
  console.log('Getting served on port 3000');
});
