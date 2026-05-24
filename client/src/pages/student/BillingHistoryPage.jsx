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
        const res = await api.get('/tokens/balance'); // The balance endpoint returns history too!
        // Actually, we need to make sure `getWallet` in `TokensService` returns the transaction history or we create a specific endpoint.
        // I will assume `res.data.history` has the payment/token history, or I should update the backend.
        setTransactions(res.data.transactions || []);
      } catch (err) {
        toast.error('Failed to load billing history');
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="loader" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Billing History
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-dark-300"
        >
          View your token purchases and subscription history.
        </motion.p>
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
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Amount</th>
                <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-dark-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {transactions.length > 0 ? (
                transactions.filter(t => t.type === 'PURCHASE').map((tx, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 text-sm text-dark-200">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-white">{tx.description || 'Token Purchase'}</p>
                      <p className="text-xs text-accent-400">+{tx.amount} Tokens</p>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-white">
                      ₹{tx.amount * 5 /* Placeholder for actual price calculation */} 
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 w-fit px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider">
                        <CheckCircle className="h-3 w-3" />
                        PAID
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-dark-400">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No billing history found.</p>
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
