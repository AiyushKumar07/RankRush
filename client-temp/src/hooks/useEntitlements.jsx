import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { userAPI } from '../services/api'

// Shape from server (after JSON-safe transform):
// { planId, planName, isFreeTier, entitlements: { [KEY]: { included: bool, cap: number | 'UNLIMITED', value: string|null } } }

const EntitlementsContext = createContext(null)

export function EntitlementsProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userAPI.getEntitlements()
      setData(res?.data ?? res ?? null)
      setError(null)
    } catch (err) {
      setError(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const value = useMemo(() => {
    const entitlements = data?.entitlements ?? {}
    return {
      data,
      loading,
      error,
      refresh,
      hasFeature: (key) => entitlements[key]?.included === true,
      getCap: (key) => {
        const cap = entitlements[key]?.cap
        if (cap === 'UNLIMITED') return Infinity
        return typeof cap === 'number' ? cap : 0
      },
      getValue: (key) => entitlements[key]?.value ?? null,
      planName: data?.planName ?? 'Free',
      isFreeTier: data?.isFreeTier ?? true,
    }
  }, [data, loading, error, refresh])

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  )
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) {
    // Fallback: hook used outside provider. Returns a stub that always denies.
    return {
      data: null,
      loading: false,
      error: null,
      refresh: () => {},
      hasFeature: () => false,
      getCap: () => 0,
      getValue: () => null,
      planName: 'Free',
      isFreeTier: true,
    }
  }
  return ctx
}
