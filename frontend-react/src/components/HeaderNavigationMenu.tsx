import { LogOut, Menu as MenuIcon } from 'lucide-react'
import type { Key } from 'react-aria-components'
import {
  Button as ReactAriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components'
import { useNavigate } from 'react-router'

import { isAdminRole } from '@/app/admin'
import type { Office } from '@/api/schemas'
import { cx } from '@/lib/cx'

interface HeaderNavigationMenuProps {
  currentOffice: Office | null
  currentRoleCode: string | null
  onLogout: () => void | Promise<void>
  username?: string | null
}

export default function HeaderNavigationMenu({
  currentOffice,
  currentRoleCode,
  onLogout,
  username = null,
}: HeaderNavigationMenuProps) {
  const navigate = useNavigate()
  const appointmentsEnabled = currentOffice?.appointments_enabled_ind === 1
  const examsEnabled = currentOffice?.exams_enabled_ind === 1

  function handleAction(key: Key) {
    switch (key) {
      case 'queue':
        void navigate('/queue')
        return
      case 'admin':
        void navigate('/admin')
        return
      case 'appointments':
        void navigate('/appointments')
        return
      case 'booking':
        void navigate('/booking')
        return
      case 'exams':
        void navigate('/exams')
        return
      case 'logout':
        void onLogout()
        return
    }
  }

  return (
    <MenuTrigger>
      <ReactAriaButton className="focus-visible:outline-bc-focus border-bc-border-dark bg-bc-white text-bc-primary hover:bg-bc-button-secondary-hover data-[pressed]:bg-bc-button-secondary-pressed text-bc-body inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border px-4 focus-visible:outline-2 focus-visible:outline-offset-2">
        <MenuIcon aria-hidden="true" className="text-bc-secondary h-4 w-4" />
        Menu
      </ReactAriaButton>
      <Popover
        className="border-bc-border bg-bc-white shadow-bc-popover z-50 min-w-52 rounded-sm border p-1"
        placement="bottom end"
      >
        {username && (
          <div className="text-bc-secondary/80 border-bc-border mx-2 mt-1 mb-1 truncate border-b px-1 py-2">
            {username}
          </div>
        )}
        <Menu
          aria-label="Application navigation"
          className="outline-hidden"
          onAction={handleAction}
        >
          <MenuItem className={menuItemClassName} id="queue" textValue="Queue">
            Queue
          </MenuItem>
          {appointmentsEnabled && (
            <MenuItem
              className={menuItemClassName}
              id="appointments"
              textValue="Appointments"
            >
              Appointments
            </MenuItem>
          )}
          {examsEnabled && (
            <MenuItem
              className={menuItemClassName}
              id="exams"
              textValue="Exams"
            >
              Exams
            </MenuItem>
          )}
          {examsEnabled && (
            <MenuItem
              className={menuItemClassName}
              id="booking"
              textValue="Room Bookings"
            >
              Room Bookings
            </MenuItem>
          )}
          <Separator className={separatorClassName} />
          {isAdminRole(currentRoleCode) && (
            <MenuItem
              className={menuItemClassName}
              id="admin"
              textValue="Admin"
            >
              Admin
            </MenuItem>
          )}
          <Separator className={separatorClassName} />
          <MenuItem
            className={cx(menuItemClassName, 'text-bc-danger')}
            id="logout"
            textValue="Log out"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Log out
            </span>
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

const menuItemClassName = cx(
  'text-bc-body text-bc-primary data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover cursor-pointer rounded-sm px-3 py-2 outline-hidden',
)

const separatorClassName = 'bg-bc-border my-1 h-px border-0'

export { HeaderNavigationMenu }
