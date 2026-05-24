import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function BillingHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await api.get('/tokens/balance');
        setTransactions(res.data.transactions || []);
      } catch (err) {
        toast.error('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  const [activeTab, setActiveTab] = useState('purchases');

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="loader" /></div>;
  }

  const purchases = transactions.filter((t) => t.amount > 0);
  const usage = transactions.filter((t) => t.amount <= 0);

  const displayTransactions = activeTab === 'purchases' ? purchases : usage;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Transaction History
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-dark-300"
        >
          View your token purchases, consumption, and subscription history.
        </motion.p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-white/[0.05] pb-2">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            activeTab === 'purchases' ? 'bg-white/10 text-white' : 'text-dark-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Token Purchases
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            activeTab === 'usage' ? 'bg-white/10 text-white' : 'text-dark-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Token Usage
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-3xl overflow-hidden border-white/[0.05]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Date</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Description</th>
                {activeTab === 'purchases' && (
                  <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Amount Paid</th>
                )}
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {displayTransactions.length > 0 ? (
                displayTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 text-sm text-dark-200">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-white">{tx.description || tx.type.replace('_', ' ')}</p>
                      <p className={`text-xs ${tx.amount > 0 ? 'text-accent-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} Tokens
                      </p>
                    </td>
                    {activeTab === 'purchases' && (
                      <td className="py-4 px-6 text-sm font-bold text-white">
                        {tx.price != null ? `₹${tx.price}` : (tx.type === 'PURCHASE' ? '-' : 'Free')} 
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${tx.amount > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                        <CheckCircle className="h-3 w-3" />
                        {tx.amount > 0 ? 'SUCCESS' : 'COMPLETED'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === 'purchases' ? "4" : "3"} className="py-12 text-center text-dark-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No transaction history found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
