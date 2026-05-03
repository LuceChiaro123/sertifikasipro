import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

export default function Sidebar({ links }) {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex-shrink-0">
      <nav className="p-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            {Icon && <Icon size={18} />}
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
