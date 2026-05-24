import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Sparkles, Star, Shield, Tag } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useTokenWallet } from '../../hooks/useTokenWallet';

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const { refreshWallet } = useTokenWallet();

  // Promo code states
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [applicablePlanIds, setApplicablePlanIds] = useState([]);
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await api.get('/subscriptions/plans');
        // Plans come pre-sorted by admin-defined order from the API
        setPlans(res.data);
      } catch (err) {
        toast.error('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleApplyCode = async (e) => {
    e.preventDefault();
    if (!redeemCodeInput.trim()) return;

    setValidatingCode(true);
    try {
      const res = await api.post('/payments/validate-code', { code: redeemCodeInput });
      setAppliedCode(res.data.code);
      setDiscountPercentage(res.data.discountPercentage);
      setApplicablePlanIds(res.data.applicablePlanIds || []);
      toast.success(`Promo code applied! ${res.data.discountPercentage}% off`);
    } catch (err) {
      setAppliedCode(null);
      setDiscountPercentage(0);
      setApplicablePlanIds([]);
      toast.error(err.response?.data?.message || 'Invalid promo code');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleClearCode = () => {
    setAppliedCode(null);
    setDiscountPercentage(0);
    setApplicablePlanIds([]);
    setRedeemCodeInput('');
  };

  const handlePurchase = async (plan) => {
    setPurchasing(plan.id);
    try {
      const payload = { planId: plan.id };
      if (appliedCode) {
        payload.redeemCode = appliedCode;
      }

      const orderRes = await api.post('/payments/create-order', payload);
      const { orderId, amount, currency, paymentId, keyId } = orderRes.data;

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

  // Define some gradient maps for different tiers
  const tierStyles = {
    'Starter Pass': {
      border: 'border-white/10 hover:border-emerald-500/50',
      button: 'bg-white/5 hover:bg-emerald-500/20 text-white border border-white/10 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      icon: <Star className="w-6 h-6 text-emerald-400" />,
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0)] hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]'
    },
    'Scholar Pack': {
      border: 'border-white/10 hover:border-blue-500/50',
      button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0)] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
    },
    'Ranker Pro': {
      border: 'border-accent-500/50 scale-105 z-10',
      button: 'bg-gradient-to-r from-accent-500 to-neon-cyan hover:from-accent-400 hover:to-neon-cyan text-white shadow-xl shadow-accent-500/30',
      iconBg: 'bg-accent-500/20',
      iconColor: 'text-neon-cyan',
      icon: <Zap className="w-6 h-6 text-neon-cyan fill-neon-cyan" />,
      glow: 'shadow-[0_0_40px_rgba(124,107,245,0.2)]'
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 relative min-h-screen">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-500/20 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none" />

      <div className="text-center mb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-medium text-white/80 tracking-wide uppercase">Upgrade Your Journey</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 mb-6 tracking-tight"
        >
          Pricing that scales with you
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-dark-300 max-w-2xl mx-auto text-lg md:text-xl font-light mb-10"
        >
          Whether you're warming up or aiming for the top rank, we have the perfect token package to power your practice.
        </motion.p>

        {/* Promo Code Input */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto relative z-20 bg-dark-800/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl"
        >
          <form onSubmit={handleApplyCode} className="flex gap-2 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
              <Tag className="w-5 h-5" />
            </div>
            <input 
              type="text"
              placeholder="Have a redeem code?"
              value={redeemCodeInput}
              onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
              disabled={appliedCode || validatingCode}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-dark-400 pl-10 px-4 py-3 uppercase tracking-wider font-semibold disabled:opacity-50"
            />
            <AnimatePresence mode="wait">
              {appliedCode ? (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleClearCode}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-3 rounded-xl font-bold transition-all border border-red-500/20"
                >
                  Clear
                </motion.button>
              ) : (
                <motion.button
                  key="apply"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="submit"
                  disabled={validatingCode || !redeemCodeInput.trim()}
                  className="bg-accent-600 hover:bg-accent-500 text-white disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-all"
                >
                  {validatingCode ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply'}
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto relative z-10 mt-16">
        {plans.map((plan, index) => {
          const style = tierStyles[plan.name] || (plan.isPopular ? tierStyles['Ranker Pro'] : tierStyles['Starter Pass']);
          const isPremium = plan.isPopular || plan.isRecurring;
          
          const isCodeApplicable = appliedCode && (applicablePlanIds.length === 0 || applicablePlanIds.includes(plan.id));
          const discountedPrice = isCodeApplicable 
            ? Math.round(plan.price * (1 - discountPercentage / 100))
            : plan.price;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5, type: 'spring' }}
              className={`relative rounded-3xl p-8 bg-dark-800/40 backdrop-blur-xl border transition-all duration-300 flex flex-col h-full ${style.border} ${style.glow}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-500 to-neon-cyan text-white text-xs font-bold uppercase tracking-widest py-1.5 px-6 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(124,107,245,0.4)] border border-white/20 whitespace-nowrap">
                  <Sparkles className="h-4 w-4" />
                  Most Popular
                </div>
              )}
              
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{plan.name}</h3>
                  <p className="text-dark-300 text-sm h-10">{plan.description}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl ${style.iconBg} flex items-center justify-center shrink-0 shadow-inner`}>
                  {style.icon}
                </div>
              </div>

              <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-baseline gap-2 mb-2 relative">
                  <span className="text-sm font-medium text-dark-300 align-top mt-1">₹</span>
                  
                  {isCodeApplicable ? (
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-extrabold text-emerald-400 tracking-tighter">
                        {discountedPrice}
                      </span>
                      <span className="text-2xl font-bold text-dark-400 line-through decoration-red-500/50 mb-1">
                        {plan.price}
                      </span>
                    </div>
                  ) : (
                    <span className="text-5xl font-extrabold text-white tracking-tighter">
                      {plan.price}
                    </span>
                  )}

                  {plan.isRecurring && <span className="text-dark-300 font-medium">/mo</span>}
                </div>
                <div className="text-neon-cyan font-semibold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 fill-neon-cyan" />
                  {plan.tokenCount} Tokens {plan.isRecurring && 'Every Month'}
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full ${style.iconBg} flex items-center justify-center shrink-0`}>
                    <Check className={`h-3 w-3 ${style.iconColor}`} />
                  </div>
                  <span className="text-dark-200 leading-tight">Access to Premium Quizzes</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full ${style.iconBg} flex items-center justify-center shrink-0`}>
                    <Check className={`h-3 w-3 ${style.iconColor}`} />
                  </div>
                  <span className="text-dark-200 leading-tight">Detailed Performance Analytics</span>
                </li>
                {plan.isRecurring && (
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0">
                      <Zap className="h-3 w-3 text-neon-cyan" />
                    </div>
                    <span className="text-dark-200 leading-tight">Automatic Token Refresh</span>
                  </li>
                )}
                {isPremium && (
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0">
                      <Star className="h-3 w-3 text-neon-cyan" />
                    </div>
                    <span className="text-dark-200 leading-tight">Priority Support & Early Access</span>
                  </li>
                )}
              </ul>

              <button
                onClick={() => handlePurchase(plan)}
                disabled={purchasing === plan.id}
                className={`w-full rounded-xl py-4 font-bold tracking-wide transition-all duration-300 ease-out active:scale-[0.98] ${style.button} ${purchasing === plan.id ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {purchasing === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Get Started Now'
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Trust badges below */}
      <div className="mt-20 text-center relative z-10">
        <p className="text-dark-400 text-sm mb-6 uppercase tracking-widest font-semibold">Secure payments powered by</p>
        <div className="flex justify-center items-center gap-8 opacity-75 hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.5 10H77.5C84.4036 10 90 15.5964 90 22.5V77.5C90 84.4036 84.4036 90 77.5 90H22.5C15.5964 90 10 84.4036 10 77.5V22.5C10 15.5964 15.5964 10 22.5 10Z" fill="#02042B"/>
              <path d="M57.7725 36.3317L44.8368 76L30 71.1895L42.9356 31.5211L57.7725 36.3317Z" fill="#00C4FF"/>
              <path d="M72.0001 36.3317L59.0645 76L44.2276 71.1895L57.1633 31.5211L72.0001 36.3317Z" fill="#00C4FF"/>
            </svg>
            <span className="text-2xl font-bold text-[#00C4FF] tracking-tight">Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
