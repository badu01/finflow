import Sheet from './Sheet'
import Segmented from './Segmented'
import { ACCOUNT_KINDS, CATEGORIES } from '../lib/constants'
import { useData } from '../context/DataContext'

export const PERIODS = [['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom']]

const Group = ({ label, children }) => (<div className="mb-5"><p className="label">{label}</p>{children}</div>)

export default function FilterSheet({ open, onClose, f, set, reset, count }) {
  const { accounts } = useData()
  const chip = (on) => `chip ${on ? 'chip-on' : ''}`
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <Group label="Period">
        <div className="flex flex-wrap gap-2">{PERIODS.map(([v, l]) => <button key={v} onClick={() => set('period', v)} className={chip(f.period === v)}>{l}</button>)}</div>
        {f.period === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input aria-label="From date" type="date" className="field" value={f.from} max={f.to} onChange={(e) => set('from', e.target.value)} />
            <input aria-label="To date" type="date" className="field" value={f.to} min={f.from} onChange={(e) => set('to', e.target.value)} />
          </div>
        )}
      </Group>
      <Group label="Category">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => set('cat', 'all')} className={chip(f.cat === 'all')}>All</button>
          {CATEGORIES.map((c) => <button key={c.name} onClick={() => set('cat', c.name)} className={chip(f.cat === c.name)}>{c.name}</button>)}
        </div>
      </Group>
      {accounts.length > 0 && (
        <Group label="Account or card">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => set('acct', 'all')} className={chip(f.acct === 'all')}>All</button>
            {accounts.map((a) => { const K = ACCOUNT_KINDS[a.kind]; return <button key={a.id} onClick={() => set('acct', a.id)} className={`${chip(f.acct === a.id)} flex items-center gap-1.5`}><K.icon size={13} />{a.nickname}{a.last4 ? ` ••${a.last4}` : ''}</button> })}
          </div>
        </Group>
      )}
      <Group label="Sort by"><Segmented options={[['new', 'Newest'], ['old', 'Oldest'], ['high', 'Highest']]} value={f.sort} onChange={(v) => set('sort', v)} /></Group>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={reset} disabled={!count}>Reset</button>
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  )
}
