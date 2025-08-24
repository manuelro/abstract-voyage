// @ts-nocheck
import { useCallback, useState } from 'react';

export default function useToast(autoHideMs = 1200) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  const toast = useCallback((m) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setShow(false), autoHideMs);
  }, [autoHideMs]);

  return { msg, show, toast, hide: () => setShow(false) };
}
