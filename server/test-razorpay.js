const Razorpay = require('razorpay');
const rzp = new Razorpay({
  key_id: 'rzp_test_St6W634brn1rIY',
  key_secret: 'Zv1wLf8Zh5gF1bD06hFIUlwk'
});
rzp.orders.create({
  amount: 29900,
  currency: 'INR',
  receipt: 'receipt_test'
}).then(console.log).catch(err => console.error(JSON.stringify(err, null, 2)));
