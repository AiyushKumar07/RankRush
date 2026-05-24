import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Plus, Search, Power, Trash2, Calendar, Hash, Percent } from 'lucide-react';
import { paymentsAPI } from '../services/api';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

export default function RedeemCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountPercentage: '',
    maxUses: '',
    expiresAt: '',
  });

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const res = await paymentsAPI.getAllRedeemCodes();
      setCodes(res.data || []);
    } catch (err) {
      toast.error('Failed to load redeem codes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await paymentsAPI.toggleRedeemCodeStatus(id, !currentStatus);
      toast.success(`Code ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchCodes();
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle status');
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discountPercentage || !formData.maxUses) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await paymentsAPI.createRedeemCode({
        code: formData.code.toUpperCase(),
        discountPercentage: Number(formData.discountPercentage),
        maxUses: Number(formData.maxUses),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      });
      toast.success('Redeem code created successfully');
      setIsModalOpen(false);
      setFormData({ code: '', discountPercentage: '', maxUses: '', expiresAt: '' });
      fetchCodes();
    } catch (err) {
      toast.error(err?.message || 'Failed to create code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCodes = codes.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-7 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-white tracking-tight"
          >
            Redeem Codes
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-dark-400 mt-1.5"
          >
            Manage discount codes and promotional offers
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
            Create Code
          </Button>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code..."
          className="w-full md:w-1/3 rounded-xl glass-input pl-11 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : filteredCodes.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No redeem codes found"
          description={search ? "Try adjusting your search query." : "Create your first promotional code to offer discounts."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCodes.map((code) => (
              <motion.div
                key={code.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "glass-card rounded-2xl p-5 border",
                  code.isActive ? "border-white/[0.04]" : "border-red-500/20 bg-red-500/5"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border",
                      code.isActive 
                        ? "bg-accent-500/10 border-accent-500/20 text-accent-400" 
                        : "bg-dark-800/50 border-dark-700/50 text-dark-500"
                    )}>
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white tracking-wider">{code.code}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md",
                          code.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={code.isActive ? 'danger' : 'success'}
                    size="sm"
                    icon={Power}
                    onClick={() => handleToggleStatus(code.id, code.isActive)}
                    className="!p-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-dark-900/50 rounded-xl p-3 border border-white/[0.02]">
                    <div className="flex items-center gap-1.5 text-xs text-dark-400 mb-1">
                      <Percent className="h-3 w-3" /> Discount
                    </div>
                    <div className="font-semibold text-white">{code.discountPercentage}%</div>
                  </div>
                  <div className="bg-dark-900/50 rounded-xl p-3 border border-white/[0.02]">
                    <div className="flex items-center gap-1.5 text-xs text-dark-400 mb-1">
                      <Hash className="h-3 w-3" /> Uses
                    </div>
                    <div className="font-semibold text-white">
                      {code.currentUses} / {code.maxUses}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-dark-500 mt-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {code.expiresAt ? (
                    <span>Expires: {new Date(code.expiresAt).toLocaleDateString()}</span>
                  ) : (
                    <span>No expiration</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Redeem Code">
        <form onSubmit={handleCreateCode} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
              Code String
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., SUMMER50"
              className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
                Discount %
              </label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                placeholder="e.g., 20"
                className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
                Max Uses
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                placeholder="e.g., 100"
                className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50 [color-scheme:dark]"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.04]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Code
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
