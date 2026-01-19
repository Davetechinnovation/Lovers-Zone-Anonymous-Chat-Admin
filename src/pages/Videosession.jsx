import React from 'react'
import { Link } from 'react-router-dom'

function Videosession() {
  return (
    <div className='bg-black h-[100dvh] w-full flex flex-col items-center justify-center text-center p-6'>
      
      {/* Icon */}
      <div className='w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 animate-pulse'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-cyan-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      {/* Main Title */}
      <h1 className='sm:text-4xl text-[26px] font-bold text-white mb-4'>
        Something Special is Brewing...
      </h1>

      {/* Sweet Message */}
      <p className='text-gray-400 max-w-md sm:text-lg text-[15px] leading-relaxed mb-8'>
        We are carefully building a safe, encrypted space for you to have face-to-face sessions. 
        <br/><br/>
        <span className='text-cyan-400'>Quality connections take time.</span> 
        <br/>
        We'll let you know the moment the cameras are ready to roll.
      </p>

      {/* Back Button */}
      <Link 
        to="/"
        className='px-6 py-3 rounded-full bg-linear-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2'
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Return to Community
      </Link>

    </div>
  )
}

export default Videosession