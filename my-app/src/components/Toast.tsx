import React, { useEffect } from "react";
import "../style/Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

const icons: Record<ToastType, React.ReactElement> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L2 17h16L10 2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 8v4M10 14v .5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M10 6.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1.5 6h3v1h-3v-1z" fill="currentColor"/>
    </svg>
  ),
};

export default function Toast({
  message,
  type = "success",
  onClose,
  duration = 3000,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast-notification toast-${type}`} role="alert">
      {icons[type]}
      {message}
    </div>
  );
}