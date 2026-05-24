import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Sparkles } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useTokenWallet } from '../../hooks/useTokenWallet';

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const { refreshWallet } = useTokenWallet();

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await api.get('/subscriptions/plans');
        setPlans(res.data);
      } catch (err) {
        toast.error('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handlePurchase = async (plan) => {
    setPurchasing(plan.id);
    try {
      // 1. Create Order
      const orderRes = await api.post('/payments/create-order', { planId: plan.id });
      const { orderId, amount, currency, paymentId, keyId } = orderRes.data;

      // 2. Load Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || keyId,
        amount: amount.toString(),
        currency: currency,
        name: 'RankRush',
        description: plan.name,
        order_id: orderId,
        handler: async function (response) {
          try {
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(`${plan.name} purchased successfully!`);
            refreshWallet();
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#7c6bf5' },
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          toast.error(response.error.description || 'Payment failed');
        });
        rzp.open();
      } else {
        // Fallback or mock environment without razorpay script
        toast.error('Razorpay SDK not loaded');
      }
    } catch (err) {
      console.error('Payment Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to initiate payment';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Failed to initiate payment');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="loader" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-dark-300 mb-6"
        >
          Power Up Your Learning
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-dark-300 max-w-2xl mx-auto text-lg"
        >
          Get tokens to attempt premium quizzes and unlock advanced features. Choose the plan that best fits your journey.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`relative rounded-3xl p-8 glass-card flex flex-col ${
              plan.isRecurring 
                ? 'border-accent-500/50 shadow-[0_0_40px_rgba(124,107,245,0.15)] transform md:-translate-y-4' 
                : 'border-white/[0.05]'
            }`}
          >
            {plan.isRecurring && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-500 to-neon-cyan text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full flex items-center gap-2 shadow-lg">
                <Sparkles className="h-3 w-3" />
                Most Popular
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-dark-400 text-sm">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">₹{plan.price}</span>
                {plan.isRecurring && <span className="text-dark-400">/mo</span>}
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-dark-200">
                <div className="h-6 w-6 rounded-full bg-accent-500/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-accent-400" />
                </div>
                <span>{plan.tokenCount} Quiz Tokens</span>
              </li>
              <li className="flex items-center gap-3 text-dark-200">
                <div className="h-6 w-6 rounded-full bg-accent-500/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-accent-400" />
                </div>
                <span>Access to Premium Quizzes</span>
              </li>
              {plan.isRecurring && (
                <li className="flex items-center gap-3 text-dark-200">
                  <div className="h-6 w-6 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0">
                    <Zap className="h-3 w-3 text-neon-cyan" />
                  </div>
                  <span>Tokens refresh automatically</span>
                </li>
              )}
            </ul>

            <button
              onClick={() => handlePurchase(plan)}
              disabled={purchasing === plan.id}
              className={`w-full rounded-xl py-3.5 font-bold transition-all ${
                plan.isRecurring
                  ? 'bg-gradient-to-r from-accent-500 to-neon-cyan text-white hover:shadow-[0_0_20px_rgba(124,107,245,0.4)]'
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {purchasing === plan.id ? 'Processing...' : 'Get Started'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
