import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Users, Coins, Gift } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReferAndEarnPage() {
  const [referralInfo, setReferralInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferralInfo() {
      try {
        const res = await api.get('/tokens/referrals');
        setReferralInfo(res.data);
      } catch (err) {
        toast.error('Failed to load referral data');
      } finally {
        setLoading(false);
      }
    }
    fetchReferralInfo();
  }, []);

  const copyToClipboard = async () => {
    if (referralInfo?.referralCode) {
      try {
        await navigator.clipboard.writeText(referralInfo.referralCode);
        toast.success('Copied Successfully');
      } catch (err) {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = referralInfo.referralCode;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Copied Successfully');
        } catch (err2) {
          toast.error('Failed to copy');
        }
        document.body.removeChild(textArea);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="loader" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-neon-cyan mb-6"
        >
          Refer & Earn Tokens
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-dark-300 max-w-2xl mx-auto text-lg"
        >
          Invite your friends to RankRush and both of you will earn 2 free quiz tokens when they sign up and verify their email.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-3xl p-8 border-accent-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Gift className="w-32 h-32 text-accent-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Share2 className="text-accent-400" /> Your Referral Code
          </h3>
          
          <div className="bg-dark-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-6">
            <span className="text-2xl font-mono text-neon-cyan tracking-widest font-bold">
              {referralInfo?.referralCode || 'GENERATING...'}
            </span>
            <button 
              onClick={copyToClipboard}
              className="p-3 hover:bg-white/5 rounded-xl transition-colors text-dark-300 hover:text-white"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          
          <p className="text-sm text-dark-400">
            Share this code with your friends. They can enter it during registration.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-center items-center text-center">
            <div className="h-12 w-12 rounded-full bg-accent-500/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-accent-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{referralInfo?.successfulReferrals || 0}</div>
            <div className="text-sm text-dark-400">Successful Referrals</div>
          </div>
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-center items-center text-center">
            <div className="h-12 w-12 rounded-full bg-neon-cyan/10 flex items-center justify-center mb-4">
              <Coins className="h-6 w-6 text-neon-cyan" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{referralInfo?.tokensEarned || 0}</div>
            <div className="text-sm text-dark-400">Tokens Earned</div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-bold text-white mb-4">Recent Referrals</h3>
        <div className="glass-card rounded-2xl overflow-hidden">
          {referralInfo?.history?.length > 0 ? (
            <div className="divide-y divide-white/5">
              {referralInfo.history.map((ref, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Referred User</p>
                    <p className="text-xs text-dark-400">{new Date(ref.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {ref.status === 'SUCCESS' ? (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold tracking-wider">COMPLETED</span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold tracking-wider">PENDING</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-dark-400">
              No referrals yet. Start inviting friends to earn tokens!
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
