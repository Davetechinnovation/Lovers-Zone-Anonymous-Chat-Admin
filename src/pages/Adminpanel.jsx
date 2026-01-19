import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase'; 
import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

// --- HELPER: Format Seconds ---
const formatTime = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// --- COMPONENT: Custom Audio Player ---
const CustomAudioPlayer = ({ src, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);
  const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button onClick={togglePlay} className="text-gray-300 hover:text-white focus:outline-none">
        {isPlaying ? (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-cyan-400"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-gray-300"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
        )}
      </button>
      <div className="flex flex-col justify-center w-full">
         <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all duration-100" style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}></div>
         </div>
         <span className="text-xs text-gray-400 mt-1 font-mono">
            {isPlaying ? formatTime(currentTime) : (duration || "0:00")}
         </span>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} className="hidden" />
    </div>
  );
};

function Adminpanel() {
  const [chats, setChats] = useState([]); 
  const [selectedChatId, setSelectedChatId] = useState(null); 
  const [messages, setMessages] = useState([]); 
  const [reply, setReply] = useState("");
  
  // --- LOADERS ---
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // --- RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mimeTypeRef = useRef("audio/webm");
  const timerRef = useRef(null);

  const dummy = useRef();

  // Helper Name
  const getAnonymousName = (id) => {
    if (!id) return "Unknown";
    const shortCode = id.slice(-4).toUpperCase(); 
    return `Anonymous #${shortCode}`;
  };

  // 1. FETCH CHATS
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingChats(false); 
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH MESSAGES
  useEffect(() => {
    if (!selectedChatId) return;
    
    setIsLoadingMessages(true); 
    const q = query(
      collection(db, "chats", selectedChatId, "messages"), 
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingMessages(false); 
      setTimeout(() => dummy.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // --- RECORDING LOGIC (FIXED FOR IOS) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; 
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }
      
      mimeTypeRef.current = mimeType;
      const options = { mimeType: mimeType };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
           await sendAudioMessage(reader.result, formatTime(recordingTime));
        };
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingTime(0);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (base64Audio, durationString) => {
    if (!selectedChatId) return;
    try {
      await addDoc(collection(db, "chats", selectedChatId, "messages"), {
        audio: base64Audio,
        duration: durationString,
        type: 'audio',
        sender: 'admin', 
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", selectedChatId), {
        lastMessage: `🎤 Voice Message`,
        lastUpdated: serverTimestamp(),
        unread: false 
      });
    } catch (error) {
      console.error("Error sending audio:", error);
    }
    setRecordingTime(0);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedChatId) return;

    const text = reply;
    setReply("");

    try {
      await addDoc(collection(db, "chats", selectedChatId, "messages"), {
        text: text,
        type: 'text',
        sender: 'admin', 
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", selectedChatId), {
        lastMessage: `You: ${text}`,
        lastUpdated: serverTimestamp(),
        unread: false 
      });
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  return (
    <div className='flex bg-[#0b141a] h-[100dvh] overflow-hidden'>
      
      {/* --- SIDEBAR --- */}
      <div className={`
        flex-col bg-[#111b21] border-r border-gray-800
        w-full md:w-1/3 
        ${selectedChatId ? 'hidden md:flex' : 'flex'}
      `}>
        <div className='px-4 py-[21.5px] bg-[#202c33] flex justify-between items-center text-gray-300'>
          <h2 className='text-xl font-bold text-white'>Inbox</h2>
        </div>

        <div className='overflow-y-auto flex-1'>
          {/* LOADING STATE FOR CHATS */}
          {isLoadingChats ? (
            <div className="flex flex-col gap-4 p-4">
               {[1,2,3].map(i => (
                 <div key={i} className="flex gap-3 animate-pulse">
                   <div className="w-12 h-12 bg-gray-800 rounded-full"></div>
                   <div className="flex-1 space-y-2 py-1">
                     <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                     <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                   </div>
                 </div>
               ))}
            </div>
          ) : chats.length === 0 ? (
            /* --- EMPTY INBOX STATE (FIX ADDED HERE) --- */
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6 text-center">
               <div className="w-16 h-16 bg-[#202c33] rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
               </div>
               <p className="font-medium text-gray-400">No Chats Yet</p>
               <p className="text-sm mt-1">Users will appear here when they start a conversation.</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-[#202c33] transition-colors flex gap-3
                  ${selectedChatId === chat.id ? 'bg-[#2a3942]' : ''}
                `}
              >
                <div className='w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0'>
                  {chat.id.slice(-2).toUpperCase()} 
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex justify-between items-baseline'>
                    <h3 className='text-white font-medium truncate'>
                      {getAnonymousName(chat.id)}
                    </h3>
                    <span className='text-xs text-gray-500'>
                       {chat.lastUpdated?.seconds ? formatDistanceToNow(new Date(chat.lastUpdated.seconds * 1000)) : ''}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${chat.unread ? 'text-white font-bold' : 'text-gray-500'}`}>
                    {chat.lastMessage}
                  </p>
                </div>
                {chat.unread && <div className='w-3 h-3 bg-green-500 rounded-full mt-2'></div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`
        flex-col bg-[#0b141a] relative h-full
        w-full md:flex-1
        ${selectedChatId ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedChatId ? (
          <>
            {/* Header */}
            <div className='bg-[#202c33] p-4 flex items-center gap-4 text-white shadow-md'>
              <button onClick={() => setSelectedChatId(null)} className='md:hidden text-gray-400 hover:text-white mr-2'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </button>
              <div className='w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-sm'>
                 {selectedChatId.slice(-2).toUpperCase()}
              </div>
              <div>
                <h2 className='font-bold'>{getAnonymousName(selectedChatId)}</h2>
                <p className='text-xs text-gray-400'>online</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className='flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")] bg-opacity-5'>
              {isLoadingMessages ? (
                 <div className="flex justify-center items-center h-full">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
              ) : messages.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-70">
                    <div className="w-20 h-20 bg-[#202c33] rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h9m-9 3.75h9m-9 3.75h9m1.5-13.5a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 19.5 21h-15a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 4.5 3h15Z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-400">No messages here yet</p>
                    <p className="text-sm">When the user sends a message, it will appear here.</p>
                 </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                     <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] md:max-w-[70%] rounded-lg p-3 text-sm text-white shadow-sm relative
                          ${isAdmin ? 'bg-[#005c4b] rounded-tr-none' : 'bg-[#202c33] rounded-tl-none'}
                        `}
                      >
                        {msg.type === 'audio' ? (
                           <CustomAudioPlayer src={msg.audio} duration={msg.duration} />
                        ) : (
                          <p>{msg.text}</p>
                        )}
                        <span className='text-[10px] text-gray-400 block text-right mt-1'>
                          {msg.createdAt?.seconds ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000)) : '...'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <span ref={dummy}></span>
            </div>

            {/* Input Area */}
            <div className='bg-[#202c33] p-2 md:p-4 flex gap-2 items-center'>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {isRecording ? (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>
                )}
              </button>

              <form onSubmit={sendReply} className='flex-1 flex gap-2'>
                <input 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  type="text" 
                  placeholder={isRecording ? `Recording... ${formatTime(recordingTime)}` : "Type a message..."}
                  disabled={isRecording}
                  className='flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-100 disabled:text-red-400'
                />
                {!isRecording && (
                  <button type="submit" className='text-gray-400 hover:text-white p-2'>
                    <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          /* --- GLOBAL EMPTY STATE (No Chat Selected) --- */
          <div className='flex-1 flex flex-col items-center justify-center text-gray-500 border-l border-gray-800 bg-[#222e35]'>
             <h3 className='text-3xl font-light mb-4 text-gray-300'>Lovers Zone Admin</h3>
             <p>Select a chat from the sidebar to start messaging.</p>
          </div>
        )}
      </div>

    </div>
  )
}

export default Adminpanel