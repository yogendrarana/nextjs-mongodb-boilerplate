import { Icons } from "@/components/icons"

export interface NavItem {
    title: string
    href?: string
    active?: boolean
    disabled?: boolean
    external?: boolean
    icon?: keyof typeof Icons
    label?: string
    description?: string
}

export interface NavItemWithChildren extends NavItem {
    items?: NavItemWithChildren[]
}

export type MainNavItem = NavItemWithChildren
export type SidebarNavItem = NavItemWithChildren

export interface FooterItem {
    title: string
    items: {
        title: string
        href: string
        external?: boolean
    }[]
}