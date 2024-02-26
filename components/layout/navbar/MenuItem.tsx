import React from "react"

interface MenuItemProps {
    children: React.ReactNode;
    onClick: () => void
}

const MenuItem: React.FC<MenuItemProps> = ({children, onClick}) => {
  return (
    <div onClick={onClick} className="px-4 py-3 w-ful hover:bg-neutral-100 transition  font-semibold">
      {children}
    </div>
  )
}

export default MenuItem
