import React, { useState, useEffect } from 'react'
import { db } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

function Home() {
  // --- STATE ---
  const hasVisited = localStorage.getItem('hasVisitedLoversZone');
  
  // Visibility States
  const [showWelcome, setShowWelcome] = useState(!hasVisited);
  const [showIntro, setShowIntro] = useState(false);
  const [showMainFeed, setShowMainFeed] = useState(!!hasVisited);

  // Data States
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  
  // Loading Logic States
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Key 1: Data
  const [minTimePassed, setMinTimePassed] = useState(false); // Key 2: Time
  const [connectionStatus, setConnectionStatus] = useState("Connecting you to the zone..."); // Text to show user

  // --- 1. FETCH POSTS & HANDLE CONNECTION ---
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    // This is the listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        // SUCCESS: Data received
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postsData);
        setIsDataLoaded(true); // <--- DATA KEY TURNED
      }, 
      (error) => {
        // ERROR: Bad connection or permission issue
        console.error("Connection error:", error);
        setConnectionStatus("Connection issues. Loading offline mode...");
        // Even if error, we mark loaded so they aren't stuck on Intro screen forever
        setIsDataLoaded(true); 
      }
    );

    return () => unsubscribe();
  }, []);

  // --- 2. THE COORDINATOR (The "Door" Logic) ---
  // This effect watches for when BOTH keys are ready
  useEffect(() => {
    if (showIntro && isDataLoaded && minTimePassed) {
      // Both requirements met! Fade out intro, show feed.
      setShowIntro(false);
      setTimeout(() => {
        setShowMainFeed(true);
      }, 500);
    }
  }, [showIntro, isDataLoaded, minTimePassed]);

  // --- 3. SAFETY TIMEOUT (Bad Connection Backup) ---
  // If data takes longer than 8 seconds, force entry anyway so user isn't stuck
  useEffect(() => {
    if (showIntro) {
      const safetyTimer = setTimeout(() => {
        if (!isDataLoaded) {
          setConnectionStatus("Taking longer than usual...");
          setIsDataLoaded(true); // Force the door open
        }
      }, 8000); // 8 seconds max wait
      return () => clearTimeout(safetyTimer);
    }
  }, [showIntro, isDataLoaded]);


  // --- HANDLERS ---
  const handleSeePosts = () => {
    setShowWelcome(false);
    localStorage.setItem('hasVisitedLoversZone', 'true');

    // Start Intro
    setTimeout(() => {
      setShowIntro(true);
      
      // Start the "Minimum Time" timer (2 seconds)
      // This prevents the intro from flashing instantly if internet is super fast
      setTimeout(() => {
        setMinTimePassed(true); // <--- TIME KEY TURNED
      }, 2000);

    }, 500);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        text: newPost,
        createdAt: serverTimestamp(),
        author: "Anonymous User",
        avatarColor: Math.floor(Math.random()*16777215).toString(16)
      });
      setNewPost(""); 
    } catch (error) {
      alert("Could not post. Check internet connection.");
    }
  };

  const resetVisit = () => {
    localStorage.removeItem('hasVisitedLoversZone');
    window.location.reload();
  };

  return (
    <div className='w-full bg-black h-[100dvh] relative overflow-hidden font-sans'>
      
      {/* 1. WELCOME SECTION */}
      <div className={`absolute inset-0 z-30 flex items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${showWelcome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className='text-white text-center max-w-2xl px-6'>
          <h1 className='text-4xl font-bold mb-4'>Community Feed</h1>
          <p className='text-gray-400 mb-6'>Welcome to Lovers Zone - your safe anonymous community space.</p>
          <button onClick={handleSeePosts} className='bg-linear-to-r from-cyan-400 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer'>
            See Posts
          </button>
        </div>
      </div>

      {/* 2. INTRO SECTION (Now Dynamic) */}
      <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${showIntro ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <img src="/profile.png" alt="Profile" className='w-24 h-24 rounded-full mb-6 border-2 border-blue-500 shadow-lg shadow-blue-500/50' />
        <h2 className='text-white text-3xl font-bold animate-pulse'>Feel free to post...</h2>
        
        {/* Dynamic Status Text */}
        <p className={`mt-2 transition-colors duration-300 ${connectionStatus.includes("issue") || connectionStatus.includes("longer") ? "text-yellow-500" : "text-gray-500"}`}>
          {connectionStatus}
        </p>
        
        {/* Optional: Visual Spinner if waiting for data */}
        {!isDataLoaded && minTimePassed && (
          <div className="mt-4 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* 3. MAIN FEED */}
      <div className={`absolute inset-0 z-10 w-full h-full overflow-y-auto transition-opacity duration-1000 ease-in-out ${showMainFeed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <form onSubmit={handlePostSubmit} className='flex items-center gap-4 md:pt-10 pt-14 px-6 md:px-14 max-w-4xl mx-auto'>
          <img src="/profile.png" alt="Profile" className='w-[50px] h-[50px] rounded-full object-cover border border-gray-700' />
          <div className='flex-1 relative'>
            <input 
              type="text" 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?" 
              className='w-full bg-transparent border-b border-gray-700 pb-2 outline-none placeholder:text-[#c7c7c7] text-white focus:border-blue-500 transition-colors'
            />
            {newPost.trim() && (
              <button type="submit" className='absolute cursor-pointer right-0 bottom-2 text-blue-500 font-bold text-sm'>POST</button>
            )}
          </div>
        </form>

        <div className='py-6 max-w-4xl mx-auto text-white px-6 md:px-14'>
          <div className='flex justify-between items-center mb-8 border-b border-gray-800 pb-4'>
            <h1 className='text-2xl font-bold'>Main Feed</h1>
            <button onClick={resetVisit} className='text-xs text-red-500 hover:text-red-400 cursor-pointer'>Reset (Test Again)</button>
          </div>

          <div className='space-y-4 pb-20'>
            {posts.length === 0 ? (
               <div className='text-gray-500 text-center italic'>
                 {isDataLoaded ? "No posts yet. Be the first!" : "Loading feed..."}
               </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className='bg-gray-900 rounded-xl p-6 border border-gray-800'>
                  <div className='flex items-center gap-3 mb-4'>
                      <div className='w-10 h-10 border rounded-full flex items-center justify-center text-white font-bold uppercase' style={{ backgroundColor: `#${post.avatarColor || '3b82f6'}` }}>
                        {post.author ? post.author[0] : 'A'}
                      </div>
                      <div>
                        <h3 className='font-bold'>{post.author}</h3>
                        <p className='text-xs text-gray-500'>{post.createdAt?.seconds ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000)) + ' ago' : 'Just now'}</p>
                      </div>
                  </div>
                  <p className='text-gray-300 wrap-break-word'>{post.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home