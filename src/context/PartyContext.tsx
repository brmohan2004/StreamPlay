import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useMedia } from './MediaContext';
import { useNavigation } from './NavigationContext';

export interface PartyMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

export interface PartySyncPacket {
  type: 'play' | 'pause' | 'seek' | 'reaction' | 'chat' | 'join' | 'sync_state';
  roomCode: string;
  senderId: string;
  senderName: string;
  mediaType: 'movie' | 'music';
  mediaId?: string;
  mediaTitle?: string;
  currentTime?: number;
  isPlaying?: boolean;
  sendTime: number;
  chatMessage?: PartyMessage;
  reactionEmoji?: string;
}

interface PartyContextType {
  isPartyModalOpen: boolean;
  openPartyModal: () => void;
  closePartyModal: () => void;
  isInParty: boolean;
  roomCode: string | null;
  isHost: boolean;
  memberCount: number;
  createPartyRoom: () => string;
  joinPartyRoom: (code: string) => boolean;
  leavePartyRoom: () => void;
  chatMessages: PartyMessage[];
  sendChatMessage: (text: string) => void;
  floatingReactions: FloatingReaction[];
  sendReaction: (emoji: string) => void;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentSong,
    isPlayingSong,
    songProgress,
    toggleSongPlay,
    seekSong,
    activeMovie
  } = useMedia();

  const { appMode } = useNavigation();

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isInParty, setIsInParty] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<PartyMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Persistent user identity in party
  const userIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('streamplay_party_user_id') ||
        (() => {
          const generated = 'user_' + Math.random().toString(36).substring(2, 8);
          sessionStorage.setItem('streamplay_party_user_id', generated);
          return generated;
        })()
      : 'user_default'
  );

  const userNameRef = useRef<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('streamplay_user_name') || 'Friend ' + Math.floor(100 + Math.random() * 900)
      : 'Friend'
  );

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-detect ?party= & ?media= URL parameters on initial launch (Mobile scan QR join)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const partyFromUrl = urlParams.get('party');
      if (partyFromUrl) {
        joinPartyRoom(partyFromUrl);
        setIsPartyModalOpen(true);
      }
    } catch (e) {
      console.warn('Failed to parse URL party params:', e);
    }
  }, []);

  // Initialize Multi-Device Cross-Device Sync (SSE + BroadcastChannel)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('streamplay_party_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event: MessageEvent<PartySyncPacket>) => {
        handleIncomingPacket(event.data);
      };

      return () => {
        channel.close();
      };
    }
  }, [roomCode, isInParty]);

  // Real-time Cloud Cross-Device Peer Sync (Connects Phone to Desktop across internet)
  useEffect(() => {
    if (!isInParty || !roomCode) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const sanitizedRoom = roomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const sseUrl = `https://ntfy.sh/streamplay_sync_${sanitizedRoom}/sse`;
    let sse: EventSource | null = null;

    try {
      sse = new EventSource(sseUrl);
      eventSourceRef.current = sse;

      sse.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'message' && payload.message) {
            const packet: PartySyncPacket = JSON.parse(payload.message);
            handleIncomingPacket(packet);
          }
        } catch {
          // Keep stream alive on non-JSON heartbeats
        }
      };

      sse.onerror = () => {
        // SSE will reconnect automatically
      };
    } catch (err) {
      console.warn('SSE multi-device connection error:', err);
    }

    return () => {
      if (sse) {
        sse.close();
        eventSourceRef.current = null;
      }
    };
  }, [roomCode, isInParty]);

  // Handle incoming party broadcast packets
  const handleIncomingPacket = (packet: PartySyncPacket) => {
    if (!packet || packet.roomCode !== roomCode || packet.senderId === userIdRef.current) {
      return;
    }

    const latency = Math.max(0, (Date.now() - packet.sendTime) / 2);

    switch (packet.type) {
      case 'join':
        setMemberCount(prev => prev + 1);
        // If host, send current sync state back to newly joined friend
        if (isHost) {
          sendPacket({
            type: 'sync_state',
            roomCode: packet.roomCode,
            senderId: userIdRef.current,
            senderName: userNameRef.current,
            mediaType: appMode === 'music' ? 'music' : 'movie',
            mediaId: currentSong?.id || activeMovie?.id,
            currentTime: songProgress,
            isPlaying: isPlayingSong,
            sendTime: Date.now()
          });
        }
        break;

      case 'sync_state':
        setMemberCount(prev => Math.max(prev, 2));
        if (packet.currentTime !== undefined) {
          const targetTime = packet.currentTime + latency / 1000;
          if (Math.abs(songProgress - targetTime) > 0.3) {
            seekSong(targetTime);
          }
        }
        break;

      case 'play':
        if (!isPlayingSong) {
          toggleSongPlay();
        }
        if (packet.currentTime !== undefined) {
          const targetTime = packet.currentTime + latency / 1000;
          if (Math.abs(songProgress - targetTime) > 0.25) {
            seekSong(targetTime);
          }
        }
        break;

      case 'pause':
        if (isPlayingSong) {
          toggleSongPlay();
        }
        break;

      case 'seek':
        if (packet.currentTime !== undefined) {
          const targetTime = packet.currentTime + latency / 1000;
          seekSong(targetTime);
        }
        break;

      case 'reaction':
        if (packet.reactionEmoji) {
          addFloatingReaction(packet.reactionEmoji);
        }
        break;

      case 'chat':
        if (packet.chatMessage) {
          setChatMessages(prev => [...prev, packet.chatMessage!]);
        }
        break;
    }
  };

  const sendPacket = (packet: PartySyncPacket) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(packet);
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }
    // Also use localStorage storage event as fallback
    try {
      localStorage.setItem('streamplay_party_event', JSON.stringify({ ...packet, _t: Date.now() }));
    } catch {
      // Ignored
    }

    // Cloud Multi-Device Broadcast (delivers to mobile phones, TVs, separate computers)
    if (packet.roomCode) {
      const sanitizedRoom = packet.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
      fetch(`https://ntfy.sh/streamplay_sync_${sanitizedRoom}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(packet)
      }).catch(() => {
        // Fail gracefully offline
      });
    }
  };

  // Listen to localStorage fallback
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'streamplay_party_event' && e.newValue) {
        try {
          const packet: PartySyncPacket = JSON.parse(e.newValue);
          handleIncomingPacket(packet);
        } catch {
          // Ignored
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [roomCode, isInParty]);

  const addFloatingReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      x: 15 + Math.random() * 70
    };
    setFloatingReactions(prev => [...prev, newReaction]);

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2800);
  };

  const openPartyModal = () => setIsPartyModalOpen(true);
  const closePartyModal = () => setIsPartyModalOpen(false);

  const createPartyRoom = (): string => {
    const code = 'STREAM-' + Math.floor(1000 + Math.random() * 9000);
    setRoomCode(code);
    setIsInParty(true);
    setIsHost(true);
    setMemberCount(1);
    setChatMessages([
      {
        id: 'msg-sys-1',
        senderName: 'StreamPlay Bot',
        text: `Party room created! Share code "${code}" with friends to watch & listen together in real time.`,
        timestamp: Date.now()
      }
    ]);
    return code;
  };

  const joinPartyRoom = (code: string): boolean => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    setRoomCode(cleanCode);
    setIsInParty(true);
    setIsHost(false);
    setMemberCount(2);

    sendPacket({
      type: 'join',
      roomCode: cleanCode,
      senderId: userIdRef.current,
      senderName: userNameRef.current,
      mediaType: appMode === 'music' ? 'music' : 'movie',
      sendTime: Date.now()
    });

    setChatMessages([
      {
        id: 'msg-sys-join',
        senderName: 'StreamPlay Bot',
        text: `Joined party room "${cleanCode}". Synchronizing playback with host...`,
        timestamp: Date.now()
      }
    ]);
    return true;
  };

  const leavePartyRoom = () => {
    setIsInParty(false);
    setRoomCode(null);
    setIsHost(false);
    setMemberCount(1);
    setChatMessages([]);
  };

  const sendChatMessage = (text: string) => {
    if (!text.trim() || !roomCode) return;
    const msg: PartyMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderName: userNameRef.current,
      text: text.trim(),
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, msg]);

    sendPacket({
      type: 'chat',
      roomCode,
      senderId: userIdRef.current,
      senderName: userNameRef.current,
      mediaType: appMode === 'music' ? 'music' : 'movie',
      chatMessage: msg,
      sendTime: Date.now()
    });
  };

  const sendReaction = (emoji: string) => {
    addFloatingReaction(emoji);
    if (isInParty && roomCode) {
      sendPacket({
        type: 'reaction',
        roomCode,
        senderId: userIdRef.current,
        senderName: userNameRef.current,
        mediaType: appMode === 'music' ? 'music' : 'movie',
        reactionEmoji: emoji,
        sendTime: Date.now()
      });
    }
  };

  return (
    <PartyContext.Provider
      value={{
        isPartyModalOpen,
        openPartyModal,
        closePartyModal,
        isInParty,
        roomCode,
        isHost,
        memberCount,
        createPartyRoom,
        joinPartyRoom,
        leavePartyRoom,
        chatMessages,
        sendChatMessage,
        floatingReactions,
        sendReaction
      }}
    >
      {children}
    </PartyContext.Provider>
  );
};

export const useParty = () => {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error('useParty must be used within PartyProvider');
  return ctx;
};
