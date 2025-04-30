import React, { useState, useRef, useEffect } from "react";

function App() {
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechUnlocked, setSpeechUnlocked] = useState(false);
  const [waitingForRetap, setWaitingForRetap] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const BACKEND_URL = "https://visionmate-backend.onrender.com/caption/";

  useEffect(() => {
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    if (!mobileCheck) {
      speak("Welcome to VisionMate.");
      startCamera();
    }

    return () => stopCamera();
  }, []);

  const [readyToCapture, setReadyToCapture] = useState(false);

const handleScreenTap = () => {
  const unlock = new SpeechSynthesisUtterance(" ");
  window.speechSynthesis.speak(unlock);

  setTimeout(() => {
    speak("Tap anywhere to open the camera. Press the volume button to take a picture. Then press the bottom right of the screen to use the photo.");
    setSpeechUnlocked(true);
    setReadyToCapture(true); // this enables tap to open camera
  }, 300);
};


  const speak = (msg) => {
    const synth = window.speechSynthesis;

    const speakNow = () => {
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = "en-US";
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;

      const voices = synth.getVoices();
      if (voices.length > 0) {
        utterance.voice = voices.find(v => v.lang === "en-US") || voices[3];
      }

      synth.cancel();
      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => speakNow();
    } else {
      speakNow();
    }
  };

  const playSound = (src) => {
    const audio = new Audio(src);
    audio.play().catch(err => console.log("Audio play blocked:", err));
  };

  const generateCaption = async (blob) => {
    const formData = new FormData();
    const file = new File([blob], "captured.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    setIsProcessing(true);
    setCaption("");
    speak("Generating caption. Please wait.");
    playSound("/beep.mp3");

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setCaption(data.caption);

      setTimeout(() => {
        speak("Caption: " + data.caption);

        if (isMobile) {
          setTimeout(() => {
            speak("Tap anywhere on the screen to generate caption for another image.");
            setWaitingForRetap(true);
          }, 5000);
        }

        playSound("/ding.mp3");
      }, 500);
    } catch (err) {
      speak("Failed to generate caption.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      setCameraActive(true);
      speak("Tap anywhere to click a picture");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => console.log("🎥 Camera playing"))
            .catch((err) => console.warn("⚠️ Camera play error:", err));
        }
      }, 300);
    } catch (err) {
      speak("Camera not accessible.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      setImagePreview(URL.createObjectURL(blob));
      generateCaption(blob);
    }, "image/jpeg");
  };

  const handleMobileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setWaitingForRetap(false); // reset tap-to-recapture
      speak("Photo received. Please wait while we generate a caption.");
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      generateCaption(file);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* 🔊 Step 1: Unlock speech */}
      {isMobile && !speechUnlocked && (
        <div style={styles.tapToUnlock} onClick={handleScreenTap} />
      )}
  
      {/* 📷 Step 2: Tap anywhere to open camera after speech unlock (initial capture) */}
      {isMobile && speechUnlocked && !imagePreview && !waitingForRetap && (
        <div
          style={styles.fullscreenTapToCapture}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        />
      )}
  
      {/* 🔁 Tap anywhere to capture for LAPTOP when camera is active */}
      {!isMobile && cameraActive && !imagePreview && (
        <>
        <p style={{ fontStyle: "italic", color: "#777" }}>
          Tap anywhere to capture an image
        </p>
        <div
          style={styles.fullscreenTapToCapture}
          onClick={captureImage}
        />
        </>
      )}
  
      {/* 🔁 After showing preview, tap anywhere to capture again (for LAPTOP) */}
      {!isMobile && imagePreview && (
  <div
    style={styles.fullscreenTapToCapture}
    onClick={() => {
      setImagePreview(null);
      setCaption("");
      startCamera();
      speak("Tap anywhere to click a picture");
    }}
  />
)}

  
      {/* 🔁 Step 3: After caption, wait for user to tap again to recapture on MOBILE */}
      {isMobile && waitingForRetap && (
        <div
          style={styles.fullscreenTapToCapture}
          onClick={() => {
            setWaitingForRetap(false);
            fileInputRef.current?.click();
          }}
        />
      )}
  

      {/* Hidden camera trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleMobileUpload}
        style={{ display: "none" }}
      />

      <h1 style={styles.title}>📸 VisionMate</h1>
      <p style={styles.subtitle}>AI Image Captioning for Everyone</p>

      <div style={styles.card}>
        {isMobile ? (
          imagePreview ? (
            <></>
          ) : (
            <p style={{ fontStyle: "italic", color: "#777" }}>
              Tap anywhere to open camera
            </p>
          )
        ) : (
          <>
            {cameraActive ? (
  <>
    {!imagePreview ? (
  <>
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={styles.video}
    />
    <canvas ref={canvasRef} style={{ display: "none" }} />
  </>
) : (
  <img
    src={imagePreview}
    alt="Captured"
    style={{
      ...styles.video,
      boxShadow: isProcessing ? "0 0 15px 5px #007bff" : "none"
    }}
  />
)}


  </>
) : (
  <button
    onClick={startCamera}
    style={{ ...styles.button, backgroundColor: "#007bff" }}
  >
    🎥 Open Camera
  </button>
)}

          </>
        )}

        {/* 📱 Mobile-only preview block */}
{isMobile && imagePreview && (
  <div style={{ marginTop: "20px" }}>
    <h4 style={styles.subHeader}>📌 Preview:</h4>
    <img
      src={imagePreview}
      alt="Captured"
      style={{
        ...styles.image,
        boxShadow: isProcessing ? "0 0 15px 5px #007bff" : "none"
      }}
    />
  </div>
)}


        {caption && <p style={styles.caption}>📜 Caption: {caption}</p>}
      </div>

      <footer style={styles.footer}>
        Built by Anoushka <span style={{ color: "hotpink" }}>❤</span>
      </footer>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    maxWidth: "500px",
    margin: "auto",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#555",
    marginBottom: "20px",
  },
  button: {
    display: "block",
    width: "100%",
    margin: "10px 0",
    padding: "12px 15px",
    fontSize: "1rem",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    touchAction: "manipulation",
  },
  subHeader: {
    fontSize: "1.1rem",
    marginBottom: "10px",
  },
  video: {
    width: "100%",
    aspectRatio: "4/3",
    borderRadius: "10px",
    border: "2px solid #000",
    objectFit: "cover",
    marginBottom: "10px",
    cursor: "pointer",
  },
  image: {
    width: "100%",
    borderRadius: "10px",
    border: "2px solid #000",
  },
  caption: {
    marginTop: "20px",
    fontSize: "1.1rem",
    fontWeight: "bold",
    color: "#007bff",
    wordWrap: "break-word",
  },
  footer: {
    marginTop: "40px",
    fontSize: "1rem",
    color: "#666",
  },
  tapToUnlock: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(255,255,255,0)",
    zIndex: 9999,
    cursor: "pointer",
  },
  fullscreenTapToCapture: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9998,
    backgroundColor: "rgba(255,255,255,0)",
    cursor: "pointer",
  },
};

export default App;