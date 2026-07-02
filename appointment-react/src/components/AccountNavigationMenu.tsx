import { CalendarDays, LogOut, Menu as MenuIcon, Settings } from 'lucide-react'
import type { Key } from 'react-aria-components'
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components'
import { useNavigate } from 'react-router'

import { cx } from '@/lib/cx'

export default function AccountNavigationMenu({
  displayName,
}: {
  displayName: string | null
}) {
  const navigate = useNavigate()

  function handleAction(key: Key) {
    switch (key) {
      case 'appointments':
        void navigate('/booked-appointments')
        break
      case 'account':
        void navigate('/account-settings')
        break
      case 'logout':
        void navigate('/signout')
        break
    }
  }

  return (
    <MenuTrigger>
      <AriaButton className="border-bc-border-dark bg-bc-white text-bc-primary hover:bg-bc-button-secondary-hover focus-visible:outline-bc-focus inline-flex min-h-10 items-center gap-2 rounded-sm border px-4 focus-visible:outline-2">
        <MenuIcon aria-hidden="true" className="size-4" />
        Menu
      </AriaButton>
      <Popover
        className="border-bc-border bg-bc-white shadow-bc-popover z-50 min-w-60 rounded-sm border p-1"
        placement="bottom end"
      >
        {displayName && (
          <div className="text-bc-secondary border-bc-border mx-2 truncate border-b px-1 py-2 font-bold">
            {displayName}
          </div>
        )}
        <Menu
          aria-label="Account navigation"
          className="outline-hidden"
          onAction={handleAction}
        >
          <MenuItem
            className={menuItemClassName}
            id="appointments"
            textValue="My Appointments"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            My Appointments
          </MenuItem>
          <MenuItem
            className={menuItemClassName}
            id="account"
            textValue="Account Settings"
          >
            <Settings aria-hidden="true" className="size-4" />
            Account Settings
          </MenuItem>
          <Separator className="bg-bc-border my-1 h-px" />
          <MenuItem
            className={cx(menuItemClassName, 'text-bc-danger')}
            id="logout"
            textValue="Log out"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

const menuItemClassName =
  'data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 outline-hidden'
