import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar automatically when route changes (for mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* --- 1. MOBILE OVERLAY --- */}
      {/* Dark background that shows when sidebar is open on mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* --- 2. HAMBURGER BUTTON --- */}
      {/* Only visible on mobile (md:hidden) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-2 bg-gray-800 rounded-lg text-white md:hidden hover:bg-gray-700 transition-colors shadow-lg"
      >
        {isOpen ? (
          // Close Icon (X)
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Menu Icon (Hamburger)
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {/* --- 3. SIDEBAR CONTAINER --- */}
      {/* 
         - Mobile: fixed position, slides in from left (-translate-x-full to translate-x-0)
         - Desktop (md): relative position, always visible (translate-x-0), takes up space
      */}
      <div className={`
        fixed inset-y-0 left-0 z-50 sm:w-[300px] w-[250px] h-screen bg-black border-r border-gray-800 p-5 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:block shrink-0
      `}>
        
        {/* Logo Section */}
        <div className='flex gap-2 items-center mb-8 mt-10 md:mt-0'>
          <div className='w-10 h-10 bg-linear-to-r from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg shadow-blue-500/30'>
            🌿
          </div>
          <p className='font-bold text-[26px] text-white'>Lovers Zone</p>
        </div>
        
        {/* Navigation Links */}
        <div className='flex flex-col gap-4'>
          <Link 
            to="/" 
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              location.pathname === "/" ? "bg-gray-800 text-cyan-400 font-bold border-l-4 border-cyan-400" : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
          >
            <span>🏠</span>
            <span>Community Feed</span>
          </Link>
          
          <Link 
            to="/mood-tracker" 
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              location.pathname === "/mood-tracker" ? "bg-gray-800 text-cyan-400 font-bold border-l-4 border-cyan-400" : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
          >
            <span>📊</span>
            <span>Mood Tracker</span>
          </Link>
          
          <Link 
            to="/video-session" 
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              location.pathname === "/video-session" ? "bg-gray-800 text-cyan-400 font-bold border-l-4 border-cyan-400" : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
          >
            <span>📹</span>
            <span>Video Session</span>
          </Link>
          
          <Link 
            to="/admin" 
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              location.pathname === "/admin" ? "bg-gray-800 text-cyan-400 font-bold border-l-4 border-cyan-400" : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
          >
            <span>🛡️</span>
            <span>Admin Panel</span>
          </Link>
        </div>

        
      </div>
    </>
  )
}

export default Sidebar