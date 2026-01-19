

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Adminpanel from './pages/Adminpanel'
import Moodtracker from './pages/Moodtracker'
import Videosession from './pages/Videosession'
import Home from './pages/Home'
import Sidebar from './Components/Sidebar'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 overflow-y-auto w-full ">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Adminpanel />} />
            <Route path="/mood-tracker" element={<Moodtracker />} />
            <Route path="/video-session" element={<Videosession />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
