import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useTokenWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/tokens/balance');
      setWallet(res.data);
    } catch (error) {
      console.error('Failed to fetch token wallet', error);
      toast.error('Failed to load token balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return { wallet, loading, refreshWallet: fetchWallet };
}
