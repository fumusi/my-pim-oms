import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCustomers, type Customer } from '../api/customers'
import { assignCustomerToPriceList, getAssignedCustomerIds } from '../api/price-lists'
import { getApiError } from '../utils/format'

interface Props {
  priceListId: number
  alreadyAssignedIds: Set<number>
  onClose: () => void
  onAssigned: () => void
}

export function AssignCustomerModal({ priceListId, alreadyAssignedIds, onClose, onAssigned }: Props) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => setDebouncedSearch(value), 300)
    setDebounceTimer(timer)
  }

  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [debounceTimer])

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-assign', debouncedSearch],
    queryFn: () => getCustomers({ search: debouncedSearch || undefined, limit: 50 }).then((r) => r.data),
  })

  const { data: assignedCustomerIds } = useQuery({
    queryKey: ['assigned-customer-ids'],
    queryFn: () => getAssignedCustomerIds(),
  })

  const assignedSet = new Set(assignedCustomerIds ?? [])

  const customers = (customersData?.data ?? []).filter((c) => !alreadyAssignedIds.has(c.id))

  async function handleAssign() {
    if (!selected) return
    setIsAssigning(true)
    try {
      await assignCustomerToPriceList(priceListId, selected.id)
      toast.success('Customer assigned')
      onAssigned()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Assign Customer</h3>

        <input
          className="modal-input"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          autoFocus
          style={{ marginBottom: '0.5rem' }}
        />

        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {customers.map((c) => {
            const hasOtherPriceList = assignedSet.has(c.id)
            const isSelected = selected?.id === c.id
            return (
              <button
                key={c.id}
                className="exact-btn"
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontSize: '0.85rem',
                  background: isSelected ? 'rgba(124,58,237,0.18)' : undefined,
                  borderColor: isSelected ? '#7c3aed' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
                onClick={() => setSelected(isSelected ? null : c)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#e0e2f0', fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: '#6b6e87', fontSize: '0.75rem' }}>{c.email}</span>
                  {hasOtherPriceList && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        background: 'rgba(251,191,36,0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(251,191,36,0.3)',
                        borderRadius: 4,
                        padding: '1px 5px',
                      }}
                      title="Already has a price list assigned"
                    >
                      ⚠
                    </span>
                  )}
                </div>
                {isSelected && hasOtherPriceList && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                    This customer already has a price list — assigning may fail
                  </div>
                )}
              </button>
            )
          })}
          {customers.length === 0 && (
            <p style={{ color: '#6b6e87', fontSize: '0.8rem', padding: '4px 0' }}>No customers found</p>
          )}
        </div>

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="exact-btn exact-btn-primary"
            disabled={!selected || isAssigning}
            onClick={handleAssign}
          >
            {isAssigning ? (
              <span>
                <span className="spinner-border spinner-border-sm" style={{ marginRight: 6 }} />
                Assigning…
              </span>
            ) : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}
