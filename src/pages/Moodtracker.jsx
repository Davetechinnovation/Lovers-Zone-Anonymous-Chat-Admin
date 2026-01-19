import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase"; 
import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

function Moodtracker() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true); 

  // --- RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // We need to track the mimeType to create the Blob correctly later
  const mimeTypeRef = useRef("audio/webm"); 
  
  const dummy = useRef(); 

  const [userId] = useState(() => {
    const saved = localStorage.getItem("moodtracker_uid");
    if (saved) return saved;
    const newId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("moodtracker_uid", newId);
    return newId;
  });

  useEffect(() => {
    const q = query(
      collection(db, "chats", userId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false); 
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- RECORDING LOGIC (FIXED FOR IOS) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 1. DETECT SUPPORTED MIME TYPE
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; // iOS Safari usually wants this
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }
      
      // Store the type for when we stop
      mimeTypeRef.current = mimeType;

      // 2. CREATE RECORDER WITH CORRECT TYPE
      const options = { mimeType: mimeType };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // 3. USE THE DETECTED TYPE TO CREATE BLOB
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
           const base64Audio = reader.result;
           await sendAudioMessage(base64Audio);
        };
        
        // Stop all tracks to turn off the red microphone icon on the device
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please enable microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (base64Audio) => {
    try {
      await addDoc(collection(db, "chats", userId, "messages"), {
        audio: base64Audio,
        type: 'audio',
        sender: "user",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "chats", userId),{
          lastMessage: "🎤 Voice Message",
          lastUpdated: serverTimestamp(),
          userId: userId,
          unread: true, 
      }, { merge: true });
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "chats", userId, "messages"), {
        text: text,
        type: 'text',
        sender: "user",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "chats", userId),{
          lastMessage: text,
          lastUpdated: serverTimestamp(),
          userId: userId,
          unread: true, 
      }, { merge: true });
    } catch (error) {
      console.error("Error sending:", error);
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-[#0b141a] flex flex-col relative">
      <div className="bg-[#202c33] p-4 flex items-center gap-3 text-white z-10 shadow-md">
        <button onClick={() => navigate(-1)} className="md:hidden text-gray-400 hover:text-white mr-2 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold">A</div>
          <div>
            <h1 className="font-bold">Admin Support</h1>
            <p className="text-xs text-gray-400">Always here to help</p>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b141a] bg-[url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")] bg-fixed bg-opacity-5'>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 fade-in">
            <div className="bg-[#182229] p-6 rounded-xl text-center max-w-sm shadow-lg border border-gray-800/50">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="text-yellow-500 font-bold text-sm mb-2 uppercase tracking-wide">Safe & Anonymous Zone</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Messages are encrypted and sent directly to the Admin. <br /><br />Your identity is hidden. Feel free to express yourself.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] md:max-w-[70%] rounded-lg p-3 relative text-sm text-white shadow-sm ${isUser ? "bg-[#005c4b] rounded-tr-none" : "bg-[#202c33] rounded-tl-none"}`}>
                  {/* CHECK IF AUDIO OR TEXT */}
                  {msg.type === 'audio' ? (
                     <div className="flex items-center gap-2 min-w-[200px]">
                        <audio controls src={msg.audio} className="w-full h-8" />
                     </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  <div className="text-[10px] text-gray-400 text-right mt-1">
                    {msg.createdAt?.seconds ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true }) : "..."}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <span ref={dummy}></span>
      </div>

      <div className="bg-[#202c33] p-3 flex gap-2 items-center">
         {/* Record Button */}
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

        <form onSubmit={sendMessage} className="flex-1 flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            type="text"
            placeholder={isRecording ? "Recording audio..." : "Type a message..."}
            disabled={isRecording}
            className="flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-cyan-600 transition-all disabled:opacity-50"
          />
          {!isRecording && (
            <button type="submit" className="bg-cyan-600 p-3 rounded-full text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default Moodtracker;