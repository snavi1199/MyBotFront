import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "./speech.css";

const MyBot: React.FC = () => {
    const { transcript, listening, resetTranscript } = useSpeechRecognition();

    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState(
    "You are a Full Stack Interview Helper. Explain the topic clearly, provide JavaScript example code, Java example code, and interview tips."
    );
    const [error, setError] = useState("");
    const [rememberContext, setRememberContext] = useState(false);
    const [savedPrompts, setSavedPrompts] = useState<string[]>([]);

    const anchorRef = useRef<HTMLDivElement>(null);

    // disable the scrolling feature
    // useEffect(() => {
    //     anchorRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [response]);

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
    <option value="You are a Full Stack Interview Helper. Explain the topic clearly, provide JavaScript example code, Java example code, and interview tips.">
        Full Stack Interview Helper (JS + Java)
    </option>

    <option value="You are a JavaScript expert. Provide JavaScript code examples and explanations.">
        JavaScript Coding
    </option>

    <option value="You are a Java expert. Provide Java code examples and explanations.">
        Java Coding
    </option>

    <option value="You are a Java DSA Interviewer. Explain approach, algorithm, Java code, and complexity.">
        Java DSA Interview
    </option>

    <option value="You are a Low Level System Design interviewer. Explain with diagrams, classes, and code snippets.">
        Low Level System Design
    </option>

    <option value="You are a High Level System Design interviewer. Explain architecture, trade-offs, and scalability.">
        High Level System Design
    </option>
</select>


            <p className="status">
                {listening ? "🎤 Listening..." : "⏹ Stopped"}
            </p>

            <div className="button-row">
                <button onClick={handleStart}>Start</button>
                <button onClick={handleStop} disabled={loading || !listening}>
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
    const blocks = text.split(/```/g);

    return (
        <>
            {blocks.map((block, i) => {
                // CODE BLOCK
                if (i % 2 === 1) {
                    return (
                        <pre key={i} className="code-block">
                            <code>{block.trim()}</code>
                        </pre>
                    );
                }

                // NORMAL TEXT BLOCK
                return block.split("\n").map((line, idx) => {
                    const trimmed = line.trim();

                    // Headings
                    if (trimmed.startsWith("### ")) {
                        return <h3 key={idx}>{trimmed.replace("### ", "")}</h3>;
                    }
                    if (trimmed.startsWith("## ")) {
                        return <h2 key={idx}>{trimmed.replace("## ", "")}</h2>;
                    }
                    if (trimmed.startsWith("# ")) {
                        return <h1 key={idx}>{trimmed.replace("# ", "")}</h1>;
                    }

                    // Bullet points (- or *)
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                        return (
                            <ul key={idx}>
                                <li>{trimmed.substring(2)}</li>
                            </ul>
                        );
                    }

                    // Numbered points (1. 2. 3.)
                    if (/^\d+\.\s/.test(trimmed)) {
                        return (
                            <ol key={idx}>
                                <li>{trimmed.replace(/^\d+\.\s/, "")}</li>
                            </ol>
                        );
                    }

                    // Normal paragraph
                    return trimmed ? <p key={idx}>{trimmed}</p> : <br key={idx} />;
                });
            })}
        </>
    );
};




