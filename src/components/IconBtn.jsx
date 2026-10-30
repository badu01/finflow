export default function IconBtn({ icon: Icon, label, onClick, solid = false, badge }) {
  return (
    <button aria-label={label} onClick={onClick}
      className={`relative h-10 w-10 rounded-full grid place-items-center tap ${solid ? 'bg-accent text-onaccent shadow-glow' : 'bg-raised text-fg'}`}>
      <Icon size={18} strokeWidth={solid ? 2.4 : 1.9} />
      {badge > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-[10px] font-semibold text-onaccent grid place-items-center">{badge > 9 ? '9+' : badge}</span>}
    </button>
  )
}
