
import React, { useState, useRef, useEffect } from "react";

function App() {
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const BACKEND_URL = "http://10.0.0.69:8000/caption/";

  useEffect(() => {
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);
    speak("Welcome to VisionMate.");
    if (!mobileCheck) startCamera(); // Auto-start on desktop
    return () => stopCamera();
  }, []);

  const speak = (msg) => {
    const utterance = new SpeechSynthesisUtterance(msg);
    speechSynthesis.speak(utterance);
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
      speak("Caption: " + data.caption);
      playSound("/ding.mp3");
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
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      generateCaption(file);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>📸 VisionMate</h1>
      <p style={styles.subtitle}>AI Image Captioning for Everyone</p>

      <div style={styles.card}>
        {isMobile ? (
          <>
            <input type="file" accept="image/*" capture="environment" onChange={handleMobileUpload} style={styles.button} />
          </>
        ) : (
          <>
            {cameraActive && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onClick={captureImage}
                style={styles.video}
              />
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <button onClick={stopCamera} style={{ ...styles.button, backgroundColor: "#ff4d4d" }}>
              ❌ Close Camera
            </button>
          </>
        )}

        {imagePreview && (
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

        {caption && (
          <p style={styles.caption}>📜 Caption: {caption}</p>
        )}
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
};

export default App;