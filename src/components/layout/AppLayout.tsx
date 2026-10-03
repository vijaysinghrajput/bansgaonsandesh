'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { siteConfig as SITE_CONFIG } from '@/config/site'
import {
  HomeOutlined,
  CompassOutlined,
  PlusCircleOutlined,
  WalletOutlined,
  UserOutlined,
  HeartOutlined,
  MessageOutlined,
  ShareAltOutlined,
  EnvironmentOutlined,
  BellOutlined,
  LogoutOutlined,
  RocketOutlined,
  SearchOutlined,
  YoutubeOutlined
} from '@ant-design/icons'
import { Badge, Avatar, Dropdown, Space, message, Input } from 'antd'
import { useApp } from '../../lib/providers'
import { formatNumber } from '../../lib/utils'
import { supabaseClient } from '../../lib/supabase-client'
import { getProxiedImageUrl } from '../../lib/r2-storage'
import CitySelectionModal from '../shared/CitySelectionModal'
import AdminPopup from '../ads/AdminPopup'
import { fetchActivePopups, trackAdImpression, trackAdClick } from '../../app/actions/adActions'

import Sidebar from './Sidebar'
import NotificationPrompt from '../shared/NotificationPrompt'

interface AppLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  key: string
  icon: React.ComponentType<any>
  label: string
  onClick?: () => void
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, selectedCity, userCity, setSelectedCity, isGuest, showCitySelection, setShowCitySelection } = useApp()
  const [showCitySelector, setShowCitySelector] = useState(false)
  const [citiesFromDB, setCitiesFromDB] = useState<Array<{ id: string; name: string }>>([])
  const [popups, setPopups] = useState<any[]>([])
  const [citySearchText, setCitySearchText] = useState('')

  // Fetch cities and popups
  useEffect(() => {
    const fetchData = async () => {
      // Cities
      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (cityData) setCitiesFromDB(cityData)

      // Popups
      try {
        const popupData = await fetchActivePopups()
        console.log('[AppLayout] Fetched popups:', popupData.length, popupData)
        setPopups(popupData)
      } catch (error) {
        console.error('Failed to fetch popups:', error)
      }
    }

    fetchData()
  }, [])

  const handlePopupImpression = async (adId: string) => {
    await trackAdImpression(adId, 'popup')
  }

  const handlePopupClick = async (adId: string) => {
    await trackAdClick(adId, 'popup')
  }
  const navigationItems = isGuest ? [
    { key: '/', icon: HomeOutlined, label: 'Home' },
    { key: '/explore', icon: CompassOutlined, label: 'Explore' },
    { key: '/videos', icon: YoutubeOutlined, label: 'Videos' },
    {
      key: '/auth/login',
      icon: UserOutlined,
      label: 'Login',
      onClick: () => handleAuthAction('login')
    },
  ] : [
    { key: '/', icon: HomeOutlined, label: 'Home' },
    { key: '/explore', icon: CompassOutlined, label: 'Explore' },
    { key: '/videos', icon: YoutubeOutlined, label: 'Videos' },
    // Only show Create button for bansgaonsandesh users
    ...(user?.user_projects?.some(up => up.is_active && up.project_id === 'bansgaonsandesh') || user?.project_id === 'bansgaonsandesh' ? [{ key: '/create', icon: PlusCircleOutlined, label: 'Create' }] : []),
    { key: '/profile', icon: UserOutlined, label: 'Profile' },
  ]

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    setShowCitySelection(false)
  }

  const handleAuthAction = (action: string) => {
    try {
      // Redirect to auth with return path
      const returnPath = pathname !== '/auth/login' && pathname !== '/auth/register' ? pathname : '/'
      const authPath = action === 'register' ? '/auth/register' : '/auth/login'
      router.push(`${authPath}?returnTo=${encodeURIComponent(returnPath)}`)
    } catch (error) {
      console.error('Error navigating to auth:', error)
      // Fallback navigation
      router.push('/auth/login')
    }
  }

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut()
      message.success('Logged out')
    } catch (e) {
      console.error('Logout error:', e)
      message.error('Failed to log out')
    } finally {
      try {
        // Keep selected city when logging out
        // localStorage.removeItem('selectedCity') 
      } catch (err) {
        console.warn('localStorage access failed:', err)
      }
      // Stay on current page instead of redirecting
    }
  }

  // Fetch cities for the selector - REMOVED separate effect

  // Route protection for guest users
  useEffect(() => {
    const protectedRoutes = ['/create', '/profile']

    if (!isLoading && isGuest && protectedRoutes.includes(pathname)) {
  message.info('Please login to access this feature')
  handleAuthAction('login')
}
    }, [pathname, isGuest, isLoading])

  // Don't show layout for auth pages, admin pages, terms, or privacy pages
  if (pathname.startsWith('/auth') || pathname.startsWith('/admin') || pathname.startsWith('/terms') || pathname.startsWith('/privacy')) {
    return <>{children}</>
  }

  // Use only database cities (no hardcoded fallback)
  const cities = citiesFromDB.map(c => c.name)

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(citySearchText.toLowerCase())
  )

  const cityPopupRender = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
        <Input
          placeholder="Search cities..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={citySearchText}
          onChange={(e) => setCitySearchText(e.target.value)}
          className="w-full"
          autoFocus
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredCities.length > 0 ? (
          filteredCities.map(city => (
            <div
              key={city}
              onClick={() => {
                setSelectedCity(city)
                setCitySearchText('')
              }}
              className={`px-4 py-2.5 cursor-pointer transition-colors ${
                selectedCity === city
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {city}
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-gray-500">
            No cities found
          </div>
        )}
      </div>
    </div>
  )

  const cityItems = cities.map(city => ({
    key: city,
    label: city,
    onClick: () => setSelectedCity(city)
  }))

  const profileItems = isGuest ? [
    {
      key: 'login',
      label: (
        <div className="flex items-center space-x-2">
          <UserOutlined className="text-blue-500" />
          <span className="font-medium">Login</span>
        </div>
      ),
      onClick: () => handleAuthAction('login')
    },
    {
      key: 'register',
      label: (
        <div className="flex items-center space-x-2">
          <PlusCircleOutlined className="text-green-500" />
          <span className="font-medium">Sign Up</span>
        </div>
      ),
      onClick: () => handleAuthAction('register')
    }
  ] : [
    {
      key: 'profile',
      label: (
        <div className="flex items-center space-x-2">
          <UserOutlined />
          <span>My Profile</span>
        </div>
      ),
      onClick: () => router.push('/profile')
    },
    {
      key: 'logout',
      label: (
        <div className="flex items-center space-x-2">
          <LogoutOutlined />
          <span>Logout</span>
        </div>
      ),
      onClick: handleLogout
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area - NO overflow-y-auto here, let body scroll */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header (Mobile Only) */}
        <header
          className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 pb-3 shadow-sm"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <Image 
                src="/logoo.jpeg" 
                alt={SITE_CONFIG.name}
                width={120}
                height={40}
                className="w-auto h-8 object-contain"
                priority
              />
            </div>

            {/* Right Side - City Selector & Profile */}
            <div className="flex items-center space-x-2">
              {/* City Selector */}
              <Dropdown
                popupRender={cityPopupRender}
                trigger={['click']}
                placement="bottomRight"
                onOpenChange={(open) => {
                  if (!open) setCitySearchText('')
                }}
              >
                <div className="flex items-center cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors">
                  <EnvironmentOutlined className="text-primary text-lg" />
                  {selectedCity && (
                    <span className="ml-1.5 text-sm font-medium text-gray-700">
                      {selectedCity}
                    </span>
                  )}
                </div>
              </Dropdown>
              {/* Profile */}
              <Dropdown
                menu={{ items: profileItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <div className="flex items-center cursor-pointer">
                  {isGuest ? (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-full">
                      <UserOutlined className="text-sm" />
                      <span className="text-sm font-medium">Login</span>
                    </div>
                  ) : (
                    <Avatar
                      src={getProxiedImageUrl(user?.avatar_url)}
                      size={32}
                      className="border-2 border-primary"
                    >
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  )}
                </div>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-2 z-[9999]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        <div className="flex items-center justify-around mx-auto w-full">
          {navigationItems.map((item) => {
            const isActive = pathname === item.key
            const Icon = item.icon

            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick()
                  } else {
                    router.push(item.key)
                  }
                }}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl min-w-[64px] transition-all duration-200 relative ${isActive
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-200/60 ring-1 ring-blue-500/40'
                  : 'text-slate-500 hover:text-slate-700 bg-white/5'
                  }`}
              >
                <Icon className="text-xl mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* City Selection Modal for Guest Users */}
      <CitySelectionModal
        open={showCitySelection}
        onCitySelect={handleCitySelect}
        onClose={() => setShowCitySelection(false)}
        showSkip={true}
        title={isGuest ? `Welcome to ${SITE_CONFIG.name}!` : "Select Your City"}
        description={isGuest
          ? "Choose your city to see local news and connect with your community"
          : "Change your city to see different local content"
        }
      />

      {/* Admin Popup System - Show only 1 popup */}
      {popups.length > 0 && (
        <AdminPopup
          ads={[popups[0]]}
          onImpression={handlePopupImpression}
          onClick={handlePopupClick}
        />
      )}

      {/* Notification Prompt */}
      {!isGuest && user?.id && <NotificationPrompt userId={user.id} />}
    </div>
  )
}
