import React, { useEffect, useState } from "react";

export const AdBlockDetector: React.FC = () => {
  const [isAdBlockDetected, setIsAdBlockDetected] = useState(false);

  useEffect(() => {
    // Method 1: Bait Element (CSS Blocking)
    const bait = document.createElement("div");
    bait.className =
      "adsbox ad-banner ad-placement doubleclick ad-placeholder adsbygoogle";
    bait.style.position = "absolute";
    bait.style.top = "-1000px";
    bait.style.left = "-1000px";
    bait.style.width = "1px";
    bait.style.height = "1px";
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);

    // Method 2: Script Loading Check (Network Blocking)
    const script = document.createElement("script");
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    script.async = true;
    script.onerror = () => {
      setIsAdBlockDetected(true);
    };
    document.body.appendChild(script);

    // Method 3: Fetch Check (Aggressive Network Check)
    fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
      mode: "no-cors",
    }).catch(() => {
      setIsAdBlockDetected(true);
    });

    const checkAdBlock = () => {
      // Check Method 1
      if (
        !bait ||
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        bait.offsetLeft === 0 ||
        bait.offsetTop === 0 ||
        bait.style.display === "none" ||
        window.getComputedStyle(bait).display === "none"
      ) {
        setIsAdBlockDetected(true);
      }

      // Cleanup
      if (bait && bait.parentNode) bait.parentNode.removeChild(bait);
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(checkAdBlock, 2000);

    return () => {
      clearTimeout(timer);
      if (bait && bait.parentNode) bait.parentNode.removeChild(bait);
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  if (!isAdBlockDetected) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-red-500/50 rounded-3xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">กรุณาปิด AdBlock</h2>
        <p className="text-slate-300 mb-8 leading-relaxed">
          เราตรวจพบว่าคุณมีการใช้งานส่วนขยายบล็อกโฆษณา
          <br />
          เว็บไซต์นี้เปิดให้บริการฟรีโดยมีรายได้จากโฆษณา
          <br />
          <span className="text-red-400 font-medium">
            โปรดปิด AdBlock เพื่อสนับสนุนเราและใช้งานต่อครับ
          </span>
        </p>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          ฉันปิด AdBlock แล้ว (รีโหลด)
        </button>
      </div>
    </div>
  );
};
