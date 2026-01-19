import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

function Home() {
  // --- STATE ---
  const hasVisited = localStorage.getItem("hasVisitedLoversZone");

  const [showWelcome, setShowWelcome] = useState(!hasVisited);
  const [showIntro, setShowIntro] = useState(false);
  const [showMainFeed, setShowMainFeed] = useState(!!hasVisited);

  // Data States
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");

  // Loading Logic States
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    "Connecting you to the zone...",
  );

  // Ref for the textarea to auto-resize
  const textareaRef = useRef(null);

  // --- 1. FETCH POSTS ---
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
        setIsDataLoaded(true);
      },
      (error) => {
        console.error("Connection error:", error);
        setConnectionStatus("Connection issues. Loading offline mode...");
        setIsDataLoaded(true);
      },
    );
    return () => unsubscribe();
  }, []);

  // --- 2. COORDINATOR ---
  useEffect(() => {
    if (showIntro && isDataLoaded && minTimePassed) {
      setShowIntro(false);
      setTimeout(() => {
        setShowMainFeed(true);
      }, 500);
    }
  }, [showIntro, isDataLoaded, minTimePassed]);

  // --- 3. SAFETY TIMEOUT ---
  useEffect(() => {
    if (showIntro) {
      const safetyTimer = setTimeout(() => {
        if (!isDataLoaded) {
          setConnectionStatus("Taking longer than usual...");
          setIsDataLoaded(true);
        }
      }, 8000);
      return () => clearTimeout(safetyTimer);
    }
  }, [showIntro, isDataLoaded]);

  // --- HANDLERS ---
  const handleSeePosts = () => {
    setShowWelcome(false);
    localStorage.setItem("hasVisitedLoversZone", "true");
    setTimeout(() => {
      setShowIntro(true);
      setTimeout(() => {
        setMinTimePassed(true);
      }, 2000);
    }, 500);
  };

  // --- NEW: AUTO-GROW TEXTAREA HANDLER ---
  const handleInputChange = (e) => {
    setNewPost(e.target.value);

    // Reset height to auto to shrink if text is deleted
    e.target.style.height = "auto";
    // Set height to scrollHeight to expand if text is added
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        text: newPost,
        createdAt: serverTimestamp(),
        author: "Anonymous User",
        avatarColor: Math.floor(Math.random() * 16777215).toString(16),
      });
      setNewPost("");
      // Reset height of textarea back to original
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      alert("Could not post. Check internet connection.");
    }
  };

  return (
    // Main Container: h-[100dvh] fixes mobile browser address bar issues
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden font-sans">
      {/* 1. WELCOME SECTION */}
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${showWelcome ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="text-white text-center max-w-2xl px-6">
          <h1 className="text-4xl font-bold mb-4">Community Feed</h1>
          <p className="text-gray-400 mb-6">
            Welcome to Lovers Zone - your safe anonymous community space.
          </p>
          {/* Note: Fixed bg-linear-to-r to bg-gradient-to-r */}
          <button
            onClick={handleSeePosts}
            className="bg-gradient-to-r from-cyan-400 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
          >
            See Posts
          </button>
        </div>
      </div>

      {/* 2. INTRO SECTION */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${showIntro ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <img
          src="/profile.png"
          alt="Profile"
          className="w-24 h-24 rounded-full mb-6 border-2 border-blue-500 shadow-lg shadow-blue-500/50"
        />
        <h2 className="text-white text-3xl font-bold animate-pulse">
          Feel free to post...
        </h2>
        <p
          className={`mt-2 transition-colors duration-300 ${connectionStatus.includes("issue") || connectionStatus.includes("longer") ? "text-yellow-500" : "text-gray-500"}`}
        >
          {connectionStatus}
        </p>
        {!isDataLoaded && minTimePassed && (
          <div className="mt-4 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* 3. MAIN FEED - FLEXBOX LAYOUT (Fixes scrolling issues) */}
      <div
        className={`absolute inset-0 z-10 w-full h-full flex flex-col transition-opacity duration-1000 ease-in-out ${showMainFeed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* INPUT SECTION (Stays fixed at top) */}
        <div className="shrink-0 w-full bg-black/95 backdrop-blur-sm z-20 border-b border-gray-800 pt-14 md:pt-8">
          <form
            onSubmit={handlePostSubmit}
            className="flex gap-4 px-4 pb-4 max-w-4xl mx-auto items-center"
          >
            <img
              src="/profile.png"
              alt="Profile"
              className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-full object-cover border border-gray-700 mt-1"
            />

            <div className="flex-1 relative">
              {/* REPLACED INPUT WITH TEXTAREA */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={newPost}
                onChange={handleInputChange}
                placeholder="What's on your mind?"
                className="w-full bg-transparent border-b border-gray-700 pb-2 outline-none placeholder:text-[#c7c7c7] text-white focus:border-blue-500 transition-colors resize-none overflow-hidden min-h-[40px]"
              />

              {newPost.trim() && (
                <button
                  type="submit"
                  className="absolute cursor-pointer right-0 bottom-3 text-blue-500 font-bold text-sm bg-black pl-2"
                >
                  POST
                </button>
              )}
            </div>
          </form>
        </div>

        {/* POSTS LIST (Scrolls independently) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="py-6 max-w-4xl mx-auto text-white px-4 md:px-14">
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
              <h1 className="text-2xl font-bold">Main Feed</h1>
            </div>

            <div className="space-y-4 pb-20">
              {posts.length === 0 ? (
                <div className="text-gray-500 text-center italic">
                  {isDataLoaded
                    ? "No posts yet. Be the first!"
                    : "Loading feed..."}
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-900 rounded-xl p-6 border border-gray-800"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 border rounded-full flex items-center justify-center text-white font-bold uppercase"
                        style={{
                          backgroundColor: `#${post.avatarColor || "3b82f6"}`,
                        }}
                      >
                        {post.author ? post.author[0] : "A"}
                      </div>
                      <div>
                        <h3 className="font-bold">{post.author}</h3>
                        <p className="text-xs text-gray-500">
                          {post.createdAt?.seconds
                            ? formatDistanceToNow(
                                new Date(post.createdAt.seconds * 1000),
                              ) + " ago"
                            : "Just now"}
                        </p>
                      </div>
                    </div>
                    {/* whitespace-pre-wrap ensures line breaks from the textarea are respected */}
                    <p className="text-gray-300 break-words whitespace-pre-wrap leading-relaxed">
                      {post.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
