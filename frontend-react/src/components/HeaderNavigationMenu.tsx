import { ChevronDown } from 'lucide-react'
import type { Key } from 'react-aria-components'
import {
  Button as ReactAriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components'
import { useNavigate } from 'react-router'

import { isAdminRole } from '@/app/admin'
import { cx } from '@/lib/cx'

interface HeaderNavigationMenuProps {
  currentRoleCode: string | null
  onLogout: () => void | Promise<void>
}

export default function HeaderNavigationMenu({
  currentRoleCode,
  onLogout,
}: HeaderNavigationMenuProps) {
  const navigate = useNavigate()

  function handleAction(key: Key) {
    switch (key) {
      case 'queue':
        void navigate('/queue')
        return
      case 'admin':
        void navigate('/admin')
        return
      case 'logout':
        void onLogout()
        return
    }
  }

  return (
    <MenuTrigger>
      <ReactAriaButton className="focus-visible:outline-bc-focus border-bc-border-dark bg-bc-white text-bc-primary hover:bg-bc-button-secondary-hover data-[pressed]:bg-bc-button-secondary-pressed text-bc-body inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border px-4 focus-visible:outline-2 focus-visible:outline-offset-2">
        Menu
        <ChevronDown
          aria-hidden="true"
          className="text-bc-secondary h-4 w-4"
        />
      </ReactAriaButton>
      <Popover
        className="border-bc-border bg-bc-white shadow-bc-popover z-50 min-w-52 rounded-sm border p-1"
        placement="bottom end"
      >
        <Menu
          aria-label="Application navigation"
          className="outline-hidden"
          onAction={handleAction}
        >
          <MenuItem className={menuItemClassName} id="queue" textValue="Queue">
            Queue
          </MenuItem>
          {isAdminRole(currentRoleCode) && (
            <MenuItem
              className={menuItemClassName}
              id="admin"
              textValue="Admin"
            >
              Admin
            </MenuItem>
          )}
          <MenuItem
            className={menuItemClassName}
            id="logout"
            textValue="Log out"
          >
            Log out
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

const menuItemClassName = cx(
  'text-bc-body text-bc-primary data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover cursor-pointer rounded-sm px-3 py-2 outline-hidden',
)

export { HeaderNavigationMenu }
