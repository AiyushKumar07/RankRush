const Razorpay = require('razorpay');
const rzp = new Razorpay({
  key_id: 'rzp_test_St6W634brn1rIY',
  key_secret: 'Zv1wLf8Zh5gF1bD06hFIUlwk'
});

async function run() {
  for(let i=0; i<3; i++) {
    try {
      const order = await rzp.orders.create({
        amount: 29900,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
      });
      console.log(`Success ${i}:`, order.id);
    } catch(err) {
      console.error(`Error ${i}:`, err.statusCode, err.error.description);
    }
  }
}
run();
