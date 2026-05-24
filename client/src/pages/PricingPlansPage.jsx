import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Search,
  Power,
  Pencil,
  Coins,
  IndianRupee,
  Users,
  TrendingUp,
  RefreshCcw,
  Zap,
  Filter,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { subscriptionPlansAPI } from '../services/api';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const REFRESH_LABELS = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 border border-white/[0.04] relative overflow-hidden group"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent" />
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center border',
            color
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">
            {label}
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SortablePlanCard({ plan, children, isDragDisabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          'glass-card rounded-2xl p-5 border relative overflow-hidden group transition-all duration-200',
          plan.isActive
            ? 'border-white/[0.04]'
            : 'border-red-500/20 bg-red-500/[0.02]',
          isDragging && 'ring-2 ring-accent-500/40 shadow-xl shadow-accent-500/10 scale-[1.02]'
        )}
      >
        {/* Drag handle */}
        {!isDragDisabled && (
          <div
            {...listeners}
            className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-dark-500 group-hover:text-dark-300" />
          </div>
        )}
        <div className={cn(!isDragDisabled && 'ml-6')}>
          {children}
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  tokenCount: '',
  isRecurring: false,
  refreshFrequency: 'MONTHLY',
  isPopular: false,
};

export default function PricingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isFiltering = search.trim() !== '' || statusFilter !== 'all';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, statsRes] = await Promise.all([
        subscriptionPlansAPI.getAll(),
        subscriptionPlansAPI.getStats(),
      ]);
      setPlans(plansRes.data || plansRes || []);
      setStats(statsRes.data || statsRes || {});
    } catch (err) {
      toast.error('Failed to load pricing plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plans.findIndex((p) => p.id === active.id);
    const newIndex = plans.findIndex((p) => p.id === over.id);
    const newPlans = arrayMove(plans, oldIndex, newIndex);

    setPlans(newPlans);

    try {
      await subscriptionPlansAPI.reorder(newPlans.map((p) => p.id));
      toast.success('Plan order updated');
    } catch (err) {
      toast.error('Failed to save order');
      fetchData(); // revert on failure
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await subscriptionPlansAPI.toggleStatus(id, !currentStatus);
      toast.success(
        `Plan ${currentStatus ? 'deactivated' : 'activated'} successfully`
      );
      fetchData();
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle status');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.tokenCount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setIsSubmitting(true);
      await subscriptionPlansAPI.create({
        name: formData.name,
        description: formData.description || undefined,
        price: Number(formData.price),
        tokenCount: Number(formData.tokenCount),
        isRecurring: formData.isRecurring,
        refreshFrequency: formData.isRecurring
          ? formData.refreshFrequency
          : undefined,
        isPopular: formData.isPopular,
      });
      toast.success('Plan created successfully');
      setIsCreateOpen(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      toast.error(err?.message || 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (plan) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      tokenCount: String(plan.tokenCount),
      isRecurring: plan.isRecurring,
      refreshFrequency: plan.refreshFrequency || 'MONTHLY',
      isPopular: plan.isPopular || false,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.tokenCount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setIsSubmitting(true);
      await subscriptionPlansAPI.update(editingId, {
        name: formData.name,
        description: formData.description || undefined,
        price: Number(formData.price),
        tokenCount: Number(formData.tokenCount),
        isRecurring: formData.isRecurring,
        refreshFrequency: formData.isRecurring
          ? formData.refreshFrequency
          : undefined,
        isPopular: formData.isPopular,
      });
      toast.success('Plan updated successfully');
      setIsEditOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      toast.error(err?.message || 'Failed to update plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  const renderPlanForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div>
        <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
          Plan Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Starter Pass"
          className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="e.g., Perfect for getting started"
          className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
            Price (₹) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            placeholder="e.g., 99"
            className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
            Token Count *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.tokenCount}
            onChange={(e) =>
              setFormData({ ...formData, tokenCount: e.target.value })
            }
            placeholder="e.g., 10"
            className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50"
          />
        </div>
      </div>

      {/* Recurring toggle */}
      <div className="bg-dark-900/50 rounded-xl p-4 border border-white/[0.02] space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={(e) =>
                setFormData({ ...formData, isRecurring: e.target.checked })
              }
              className="sr-only"
            />
            <div
              className={cn(
                'w-11 h-6 rounded-full transition-colors duration-300',
                formData.isRecurring ? 'bg-accent-500' : 'bg-dark-700'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300',
                  formData.isRecurring && 'translate-x-5'
                )}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-white">
              Recurring Subscription
            </span>
            <p className="text-xs text-dark-400 mt-0.5">
              Tokens refresh automatically at the chosen interval
            </p>
          </div>
        </label>

        {formData.isRecurring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="block text-xs font-semibold text-dark-300 mb-1.5 uppercase tracking-wider">
              Refresh Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(REFRESH_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, refreshFrequency: key })
                  }
                  className={cn(
                    'py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all duration-200',
                    formData.refreshFrequency === key
                      ? 'bg-accent-500/15 border-accent-500/30 text-accent-300'
                      : 'bg-dark-800/50 border-white/[0.04] text-dark-300 hover:text-white hover:border-white/[0.08]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Popular toggle */}
      <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-dark-900/50 border border-white/[0.02]">
        <div className="relative">
          <input
            type="checkbox"
            checked={formData.isPopular}
            onChange={(e) =>
              setFormData({ ...formData, isPopular: e.target.checked })
            }
            className="sr-only"
          />
          <div
            className={cn(
              'w-11 h-6 rounded-full transition-colors duration-300',
              formData.isPopular ? 'bg-amber-500' : 'bg-dark-700'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300',
                formData.isPopular && 'translate-x-5'
              )}
            />
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-white flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Mark as Popular
          </span>
          <p className="text-xs text-dark-400 mt-0.5">
            Highlights this plan on the student pricing page. Only one plan can be popular.
          </p>
        </div>
      </label>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.04]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            setEditingId(null);
            setFormData(emptyForm);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  const renderPlanContent = (plan) => (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center border shrink-0',
              plan.isActive
                ? 'bg-accent-500/10 border-accent-500/20 text-accent-400'
                : 'bg-dark-800/50 border-dark-700/50 text-dark-500'
            )}
          >
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate">
              {plan.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md',
                  plan.isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                )}
              >
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
              {plan.isRecurring && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 flex items-center gap-1">
                  <RefreshCcw className="h-2.5 w-2.5" />
                  {REFRESH_LABELS[plan.refreshFrequency] || 'Recurring'}
                </span>
              )}
              {plan.isPopular && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Popular
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics inline */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-dark-500 uppercase tracking-wider flex items-center gap-1 justify-center">
              <IndianRupee className="h-2.5 w-2.5" /> Price
            </div>
            <div className="font-bold text-white text-sm">₹{plan.price}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-dark-500 uppercase tracking-wider flex items-center gap-1 justify-center">
              <Coins className="h-2.5 w-2.5" /> Tokens
            </div>
            <div className="font-bold text-white text-sm">{plan.tokenCount}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-dark-500 uppercase tracking-wider flex items-center gap-1 justify-center">
              <Users className="h-2.5 w-2.5" /> Subs
            </div>
            <div className="font-bold text-white text-sm">{plan.subscriberCount || 0}</div>
          </div>
          <div className="flex gap-1.5 ml-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => openEdit(plan)}
              className="!p-2"
            />
            <Button
              variant={plan.isActive ? 'danger' : 'success'}
              size="sm"
              icon={Power}
              onClick={() => handleToggleStatus(plan.id, plan.isActive)}
              className="!p-2"
            />
          </div>
        </div>
      </div>

      {/* Description + date */}
      {plan.description && (
        <p className="text-xs text-dark-400 line-clamp-1">{plan.description}</p>
      )}
    </>
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
            Pricing Plans
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-dark-400 mt-1.5"
          >
            Drag to reorder plans · Students see plans in this order
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Create Plan
          </Button>
        </motion.div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CreditCard}
            label="Total Plans"
            value={stats.totalPlans}
            color="bg-accent-500/10 border-accent-500/20 text-accent-400"
            delay={0.1}
          />
          <StatCard
            icon={Zap}
            label="Active Plans"
            value={stats.activePlans}
            color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            delay={0.15}
          />
          <StatCard
            icon={Users}
            label="Total Subscribers"
            value={stats.totalSubscribers}
            color="bg-sky-500/10 border-sky-500/20 text-sky-400"
            delay={0.2}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Revenue"
            value={`₹${stats.totalRevenue?.toLocaleString('en-IN') || 0}`}
            color="bg-amber-500/10 border-amber-500/20 text-amber-400"
            delay={0.25}
          />
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="w-full md:w-1/2 rounded-xl glass-input pl-11 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 capitalize',
                statusFilter === f
                  ? 'bg-accent-500/15 border-accent-500/30 text-accent-300'
                  : 'glass-input border-white/[0.04] text-dark-400 hover:text-white'
              )}
            >
              <span className="flex items-center gap-1.5">
                <Filter className="h-3 w-3" />
                {f}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Drag-and-drop hint */}
      {isFiltering && plans.length > 0 && (
        <div className="text-xs text-dark-500 bg-dark-800/30 rounded-xl px-4 py-2.5 border border-white/[0.03] flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5" />
          Drag & drop reordering is disabled while filtering. Clear search/filter to reorder.
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-6 animate-pulse h-24"
            />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No plans found"
          description={
            search || statusFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first pricing plan to start selling tokens.'
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredPlans.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredPlans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <SortablePlanCard plan={plan} isDragDisabled={isFiltering}>
                    {renderPlanContent(plan)}
                  </SortablePlanCard>
                </motion.div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormData(emptyForm);
        }}
        title="Create Pricing Plan"
      >
        {renderPlanForm(handleCreate, 'Create Plan')}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingId(null);
          setFormData(emptyForm);
        }}
        title="Edit Pricing Plan"
      >
        {renderPlanForm(handleEdit, 'Save Changes')}
      </Modal>
    </div>
  );
}
