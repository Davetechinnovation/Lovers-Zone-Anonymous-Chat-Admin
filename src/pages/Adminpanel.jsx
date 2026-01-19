import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase'; 
import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
      setIsLoadingChats(false); // Stop loading when data arrives
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH MESSAGES
  useEffect(() => {
    if (!selectedChatId) return;
    
    setIsLoadingMessages(true); // Start loading when clicking a user
    const q = query(
      collection(db, "chats", selectedChatId, "messages"), 
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingMessages(false); // Stop loading
      setTimeout(() => dummy.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  // --- AUDIO LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Convert Blob to Base64 to save in Firestore
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
           const base64Audio = reader.result;
           await sendAudioMessage(base64Audio);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (base64Audio) => {
    if (!selectedChatId) return;
    try {
      await addDoc(collection(db, "chats", selectedChatId, "messages"), {
        audio: base64Audio, // Save audio data
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
  };

  // 3. SEND TEXT REPLY
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
    <div className='flex h-screen bg-[#0b141a] overflow-hidden'>
      
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

            <div className='flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")] bg-opacity-5'>
              {isLoadingMessages ? (
                 <div className="flex justify-center items-center h-full">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
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
                          <div className="flex items-center gap-2 min-w-[200px]">
                             {/* Audio Player */}
                             <audio controls src={msg.audio} className="w-full h-8" />
                          </div>
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
              {/* Record Button */}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'text-gray-400 hover:text-white'}`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {isRecording ? (
                   // Stop Icon
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                     <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                   </svg>
                ) : (
                   // Mic Icon
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                     <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                     <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                   </svg>
                )}
              </button>

              <form onSubmit={sendReply} className='flex-1 flex gap-2'>
                <input 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  type="text" 
                  placeholder={isRecording ? "Recording audio..." : "Type a message..."}
                  disabled={isRecording}
                  className='flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50'
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