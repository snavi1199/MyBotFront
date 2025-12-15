import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "./speech.css";

const MyBot: React.FC = () => {
    const { transcript, listening, resetTranscript } = useSpeechRecognition();

    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState("Full Stack Developer - Interview Helper");
    const [error, setError] = useState("");
    const [rememberContext, setRememberContext] = useState(false);
    const [savedPrompts, setSavedPrompts] = useState<string[]>([]);

    const anchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        anchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [response]);

    const handleStart = () => {
        resetTranscript();
        setResponse("");
        SpeechRecognition.startListening({ continuous: true });
    };

    const handleListenStop = () => {
        SpeechRecognition.stopListening();
        resetTranscript();
        setResponse('');
        setError('');
    };


    const handleStop = async () => {
        if (!transcript.trim()) {
            setError("Say something first");
            return;
        }

        setLoading(true);
        setError("");
        setResponse("");


        let combinedPrompt = transcript.trim();
        console.log(rememberContext)
        if (rememberContext) {
            combinedPrompt = [...savedPrompts, transcript.trim()].join(' and also ');
        }

        try {
            const res = await fetch("https://mybotbackend.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: combinedPrompt, role }),
            });

            if (!res.body) throw new Error("No stream");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data:")) {
                        const json = line.replace("data:", "").trim();
                        if (json === "[DONE]") return;

                        try {
                            const parsed = JSON.parse(json);
                            const token = parsed.choices?.[0]?.delta?.content;
                            if (token) {
                                fullText += token;
                                setResponse(fullText);
                            }
                        } catch { }
                    }
                }
            }

            if (rememberContext) {
                setSavedPrompts((p) => [...p, transcript]);
            } else {
                setSavedPrompts([]);
            }
        } catch {
            setError("Streaming failed");
        } finally {
            setLoading(false);
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
        }
    };

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <p>Browser not supported</p>;
    }

    return (
        <div className="app-container">
            <h2>My Bot</h2>

            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Full Stack Developer - Interview Helper</option>
                <option>Java DSA Interview</option>
                <option>Low Level System Design</option>
                <option>High Level System Design</option>
            </select>

            <p className="status">
                {listening ? "🎤 Listening..." : "⏹ Stopped"}
            </p>

            <div className="button-row">
                <button onClick={handleStart}>Start</button>
                <button onClick={handleStop} disabled={loading}>
                    Ask AI
                </button>
                <button onClick={() => resetTranscript()}>Clear</button>
                <button onClick={() => setRememberContext((prev) => !prev)}>
                    Prev: {rememberContext ? "ON" : "OFF"}
                </button>
                <button onClick={handleListenStop}>
                    Stop
                </button>
            </div>

            <div className="chat user">
                <strong>You:</strong>
                <p>{transcript || "—"}</p>
            </div>

            {loading && <p className="thinking">🤖 Thinking...</p>}
            {error && <p className="error">{error}</p>}

            {response && (
                <div className="chat ai">
                    <strong>AI:</strong>
                    <ResponseRenderer text={response} />
                </div>
            )}

            <div ref={anchorRef} />
        </div>
    );
};

export default MyBot;

/* ---------- Code Renderer ---------- */

const ResponseRenderer = ({ text }: { text: string }) => {
    const parts = text.split(/```/g);

    return (
        <>
            {parts.map((part, index) =>
                index % 2 === 1 ? (
                    <pre key={index} className="code-block">
                        <code>{part.trim()}</code>
                    </pre>
                ) : (
                    <p key={index}>{part}</p>
                )
            )}
        </>
    );
};
