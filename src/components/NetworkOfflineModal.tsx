import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import './NetworkOfflineModal.css';

interface NetworkOfflineModalProps {
  onReconnect?: () => void;
}

export const NetworkOfflineModal: React.FC<NetworkOfflineModalProps> = ({ onReconnect }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestoredToast, setShowRestoredToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredToast(true);
      if (onReconnect) {
        onReconnect();
      }
      window.dispatchEvent(new CustomEvent('streamplay-network-restored'));
      setTimeout(() => setShowRestoredToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat internet check every 12 seconds
    const interval = setInterval(async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      try {
        const ping = await fetch('/StreamPlay.png?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
        if (!ping.ok && isOffline) {
          // still down
        } else if (isOffline) {
          handleOnline();
        }
      } catch {
        if (!isOffline) setIsOffline(true);
      }
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOffline, onReconnect]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      // Test real connection
      await fetch('/StreamPlay.png?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      setIsOffline(false);
      setShowRestoredToast(true);
      if (onReconnect) {
        onReconnect();
      }
      window.dispatchEvent(new CustomEvent('streamplay-network-restored'));
      setTimeout(() => setShowRestoredToast(false), 3000);
    } catch {
      setIsOffline(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      {/* 1. Offline Full Modal */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            className="network-offline-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="network-offline-card"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              <div className="offline-icon-circle">
                <div className="offline-icon-halo" />
                <WifiOff size={38} className="wifi-off-icon" />
              </div>

              <h2 className="offline-title">Your Internet Is Down</h2>
              <p className="offline-description">
                Please check your Wi-Fi or mobile data connection. StreamPlay will automatically refresh your movies and music as soon as connection is restored.
              </p>

              <button
                className={`offline-refresh-btn ${isRetrying ? 'loading' : ''}`}
                onClick={handleManualRetry}
                disabled={isRetrying}
              >
                <RefreshCw size={18} className={`refresh-spinner-icon ${isRetrying ? 'spin' : ''}`} />
                <span>{isRetrying ? 'Checking Connection...' : 'Refresh Connection'}</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Success Reconnected Toast */}
      <AnimatePresence>
        {showRestoredToast && (
          <motion.div
            className="network-restored-toast"
            initial={{ y: -50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -50, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 400 }}
          >
            <CheckCircle2 size={18} color="#00e676" />
            <span>Connection Restored • Content Refreshed</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
