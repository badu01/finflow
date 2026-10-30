export default function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-card rounded-2xl p-1" role="tablist">
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return (
          <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
            className={`flex-1 rounded-xl py-2 text-sm transition-colors ${value === v ? 'bg-accent text-onaccent font-medium' : 'text-mute'}`}>{l}</button>
        )
      })}
    </div>
  )
}
