import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "./speech.css";

const MyBot: React.FC = () => {
    const { transcript, listening, resetTranscript } = useSpeechRecognition();

    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [role, setRole] = useState(
        "You are a Full Stack Interview Helper. Explain the topic clearly, provide JavaScript example code, Java example code, and interview tips."
    );
    const [error, setError] = useState("");
    const [rememberContext, setRememberContext] = useState(false);
    const [savedPrompts, setSavedPrompts] = useState<string[]>([]);

    const [lastCopy, setLastCopy] = useState("");
    const [displayTranscript, setDisplayTranscript] = useState("");

    const anchorRef = useRef<HTMLDivElement>(null);

    // disable the scrolling feature
    // useEffect(() => {
    //     anchorRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [response]);

    // keep displayTranscript in sync with live speech
    useEffect(() => {
        if (listening) {
            setDisplayTranscript(transcript);
        }
    }, [transcript, listening]);

    const handleStart = () => {
        resetTranscript();
        setDisplayTranscript("");
        setResponse("");
        SpeechRecognition.startListening({ continuous: true });
    };

    const handleListenStop = () => {
        SpeechRecognition.stopListening();
        resetTranscript();
        setDisplayTranscript("");
        setResponse("");
        setError("");
    };

    const handleLastCopy = async () => {
        if (!lastCopy) return;
        await navigator.clipboard.writeText(lastCopy);
        setDisplayTranscript(lastCopy); // restore previous question
    };

    const handleStop = async () => {
        if (!displayTranscript.trim()) {
            setError("Say something first");
            return;
        }

        const currentQuestion = displayTranscript.trim();

        // ✅ store previous question
        setLastCopy(currentQuestion);

        setLoading(true);
        setError("");
        setResponse("");

        let combinedPrompt = currentQuestion;
        if (rememberContext) {
            combinedPrompt = [...savedPrompts, currentQuestion].join(" and also ");
        }

        // ✅ clear transcript box immediately after Ask AI
        resetTranscript();
        setDisplayTranscript("");

        try {
            const res = await fetch("https://mybotbackend.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // body: JSON.stringify({ prompt: combinedPrompt, role }), 
                body: JSON.stringify({ prompt: combinedPrompt, role, apiKey }),    //added new api key feature            
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
                setSavedPrompts((p) => [...p, currentQuestion]);
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
                <option value="You are a Full Stack Interview Helper. Explain the topic clearly, provide JavaScript example code, Java example code">
                    Full Stack Interview Helper (JS + Java)
                </option>
               <option value="You are an HR Interview & Salary Negotiation Expert for tech roles. Prepare me for Optum HR rounds with professional, confident answers. Context: Current CTS offer is 11.7 LPA; interviewing at Optum for a higher package. Provide polished responses for salary expectations, HR behavioral questions, and role-fit discussions. Suggest realistic salary ranges (13.5–15.5 LPA), negotiation strategies, benefits and CTC breakup discussion points, counter-offer templates, and do/don’ts. Keep answers concise, practical, and senior-level.">
                    HR Round & Salary Negotiation (Optum vs CTS)
               </option>
                <option value="You are a Frontend Web Development Expert. Help with React + TypeScript, HTML5, CSS responsive design, Jest unit testing, API integration, performance optimization, and AWS deployment. Provide code examples and best practices.">
                    Frontend Web Development Expert
                </option>
                <option value="You are a Frontend Developer Interview Helper. Explain React, HTML, and CSS concepts clearly, provide code examples, best practices">
                    Frontend Developer (React + HTML + CSS)
                </option>
                <option value="You are a Backend Interview Helper specializing in Java, Spring Boot, and Microservices. Explain each concept clearly, cover real-world backend scenarios, provide Spring Boot examples, Microservices architecture explanations, and core Java program examples.">
                    Backend Interview Helper (Java + Spring Boot + Microservices)
                </option>
                <option value="You are a Full Stack Interview Helper. Explain the topic clearly JavaScript example code.">
                    Full Stack Interview Helper (JS)
                </option>
                 <option value="You are a Full Stack Interview Helper. Explain the topic clearly Java example code.">
                    Full Stack Interview Helper (Java)
                </option>
                <option value="You are a JavaScript expert. Provide JavaScript code examples and explanations.">
                    JavaScript Coding
                </option>
                <option value="You are a Java expert. Provide Java code examples and explanations.">
                    Java Coding
                </option>
                 <option value="You are an Expert Question Analyzer for Fill-in-the-Blank and Multiple Choice Questions. Analyze the user's voice input carefully. For Fill-in-the-Blank questions: Provide ONLY the exact, correct word or phrase that completes the statement accurately. For Multiple Choice questions: Identify the correct option letter (A/B/C/D/E) with absolute certainty. For both types: Provide brief, concise reasoning explaining why this is the correct answer. Never guess or provide approximations. If you cannot determine the answer with certainty, state that clearly. Be precise, authoritative, and accurate.">
                    Fill-in-the-Blank & MCQ Analyzer
                </option>
                <option value="You are an Online Assessment Expert. Identify the correct Answer for the question.">
                    Online Assessment
                </option>
                <option value="You are an MCQ Helper. Analyze the question, explain each option, identify the correct answer with reasoning, and provide tips for similar questions.">
                    MCQ Helper
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
                <button onClick={handleStop}>
                    Ask AI
                </button>
                <button onClick={() => { resetTranscript(); setDisplayTranscript(""); }}>Clear</button>
                <button onClick={() => setRememberContext((p) => !p)}>
                    Prev: {rememberContext ? "ON" : "OFF"}
                </button>
                <button onClick={() => setApiKey("873c7221e01c68adb678623298f71215db20b7787bdad3f9c6060783f07140da")}>
                    New Key
                </button>
                <button onClick={handleListenStop}>Stop</button>
                <button onClick={handleLastCopy} disabled={!lastCopy}>
                    Last Copy
                </button>
            </div>

            <div className="chat user">
                <strong>You:</strong>
                <p>{displayTranscript || "—"}</p>
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
            {blocks.map((block, blockIndex) => {
                if (blockIndex % 2 === 1) {
                    return (
                        <pre key={blockIndex} className="code-block">
                            <code>{block.trim()}</code>
                        </pre>
                    );
                }

                const lines = block.split("\n");
                const elements: React.ReactNode[] = [];

                let bulletBuffer: string[] = [];
                let numberBuffer: string[] = [];

                const flushBullets = () => {
                    if (bulletBuffer.length) {
                        elements.push(
                            <ul key={`ul-${elements.length}`} className="compact-list">
                                {bulletBuffer.map((b, i) => (
                                    <li key={i}>{b}</li>
                                ))}
                            </ul>
                        );
                        bulletBuffer = [];
                    }
                };

                const flushNumbers = () => {
                    if (numberBuffer.length) {
                        elements.push(
                            <ol key={`ol-${elements.length}`} className="compact-list">
                                {numberBuffer.map((n, i) => (
                                    <li key={i}>{n}</li>
                                ))}
                            </ol>
                        );
                        numberBuffer = [];
                    }
                };

                lines.forEach((line, i) => {
                    const t = line.trim();
                    if (!t) return;

                    if (t.startsWith("### ")) {
                        flushBullets();
                        flushNumbers();
                        elements.push(<h3 key={i}>{t.slice(4)}</h3>);
                        return;
                    }

                    if (t.startsWith("## ")) {
                        flushBullets();
                        flushNumbers();
                        elements.push(<h2 key={i}>{t.slice(3)}</h2>);
                        return;
                    }

                    if (t.startsWith("- ") || t.startsWith("* ")) {
                        flushNumbers();
                        bulletBuffer.push(t.slice(2));
                        return;
                    }

                    if (/^\d+\.\s/.test(t)) {
                        flushBullets();
                        numberBuffer.push(t.replace(/^\d+\.\s/, ""));
                        return;
                    }

                    flushBullets();
                    flushNumbers();
                    elements.push(
                        <p key={i} className="compact-text">{t}</p>
                    );
                });

                flushBullets();
                flushNumbers();

                return <div key={blockIndex}>{elements}</div>;
            })}
        </>
    );
};










