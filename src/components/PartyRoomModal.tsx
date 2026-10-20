import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  X,
  Copy,
  Check,
  Send,
  Sparkles,
  LogOut,
  Radio
} from 'lucide-react';
import { useParty } from '../context/PartyContext';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import './PartyRoomModal.css';

export const PartyRoomModal: React.FC = () => {
  const {
    isPartyModalOpen,
    closePartyModal,
    isInParty,
    roomCode,
    memberCount,
    createPartyRoom,
    joinPartyRoom,
    leavePartyRoom,
    chatMessages,
    sendChatMessage,
    sendReaction
  } = useParty();

  const { appMode } = useNavigation();
  const { currentSong, activeMovie } = useMedia();

  const [inputCode, setInputCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!isPartyModalOpen) return null;

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    joinPartyRoom(inputCode.trim());
    setInputCode('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const PARTY_REACTIONS = ['🔥', '❤️', '🍿', '🚀', '👏', '😂'];

  const currentMediaTitle =
    appMode === 'music'
      ? currentSong?.title || 'No track playing'
      : activeMovie?.name || 'No video active';

  return (
    <AnimatePresence>
      <div className="party-modal-backdrop" onClick={closePartyModal}>
        <motion.div
          className="party-modal-card"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="party-modal-header">
            <div className="party-header-title-wrap">
              <div className="party-header-icon-box">
                <Users size={20} className="text-lime" />
              </div>
              <div>
                <h3 className="party-modal-title">Friends Mode</h3>
                <span className="party-modal-subtitle">
                  {isInParty
                    ? `Live Party Room • ${memberCount} Connected`
                    : 'Watch & listen in real-time sync with friends'}
                </span>
              </div>
            </div>
            <button className="party-modal-close-btn" onClick={closePartyModal} title="Close">
              <X size={18} />
            </button>
          </div>

          {/* Current Media Sync Badge */}
          <div className="party-current-media-banner">
            <Radio size={14} className="text-lime animate-pulse" />
            <span className="media-sync-label">Syncing {appMode === 'music' ? 'Music' : 'Movie'}:</span>
            <span className="media-sync-title">{currentMediaTitle}</span>
          </div>

          {!isInParty ? (
            /* ========================================== */
            /* VIEW A: CREATE OR JOIN PARTY ROOM          */
            /* ========================================== */
            <div className="party-setup-view">
              <div className="party-setup-card host-card">
                <div className="setup-card-icon">
                  <Sparkles size={24} className="text-cyan" />
                </div>
                <h4>Host a Watch & Listen Party</h4>
                <p>Generate a room code and invite friends to stream in perfect sync (under 150ms drift).</p>
                <button className="party-primary-btn" onClick={() => createPartyRoom()}>
                  Create Party Room
                </button>
              </div>

              <div className="party-divider-text">
                <span>OR</span>
              </div>

              <div className="party-setup-card join-card">
                <h4>Join Friend's Room</h4>
                <p>Enter the 6-character room code shared by your friend.</p>
                <form onSubmit={handleJoin} className="party-join-form">
                  <input
                    type="text"
                    className="party-code-input"
                    placeholder="e.g. STREAM-4821"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="party-secondary-btn" disabled={!inputCode.trim()}>
                    Join Room
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* ========================================== */
            /* VIEW B: ACTIVE PARTY ROOM                  */
            /* ========================================== */
            <div className="party-active-view">
              {/* Room Code Share Bar */}
              <div className="party-room-code-bar">
                <div className="room-code-info">
                  <span className="room-code-label">ROOM CODE</span>
                  <span className="room-code-value">{roomCode}</span>
                </div>
                <button className="party-copy-btn" onClick={handleCopyCode}>
                  {copied ? <Check size={16} color="#c8ff00" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Floating Reaction Bar */}
              <div className="party-reaction-bar">
                <span className="reaction-bar-label">Send Reaction:</span>
                <div className="reaction-buttons-list">
                  {PARTY_REACTIONS.map((emoji, idx) => (
                    <motion.button
                      key={idx}
                      className="reaction-emoji-btn"
                      whileHover={{ scale: 1.25 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => sendReaction(emoji)}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Live Chat Box */}
              <div className="party-chat-container">
                <div className="party-chat-scroll">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <p>No messages yet. Say hello to your friends!</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className="party-chat-bubble">
                        <div className="chat-bubble-sender">{msg.senderName}</div>
                        <div className="chat-bubble-text">{msg.text}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendChat} className="party-chat-input-row">
                  <input
                    type="text"
                    className="party-chat-input"
                    placeholder="Chat with friends..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="party-chat-send-btn" disabled={!chatInput.trim()}>
                    <Send size={15} />
                  </button>
                </form>
              </div>

              {/* Footer controls */}
              <div className="party-active-footer">
                <button className="party-leave-btn" onClick={leavePartyRoom}>
                  <LogOut size={15} />
                  <span>Leave Party</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
