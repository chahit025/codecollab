import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { X, Share2, Save, Play, Settings, Crown, MessageSquare, Send, ChevronDown, LogOut, RotateCcw, Clipboard, Edit } from "lucide-react";
import { toast } from "react-hot-toast";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import socketService from "../services/socketService";
import ReactMarkdown from "react-markdown";
import { Highlight, themes } from "prism-react-renderer";
import { marked } from 'marked';
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { Loader2 } from "lucide-react";

// Initialize marked with default options
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return code;
  },
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
});

const chatStyles = {
  sent: "flex justify-end",
  received: "flex justify-start",
  sentBubble: "bg-blue-500 text-white rounded-lg px-3 py-2 max-w-fit",
  receivedBubble: "bg-gray-200 text-black rounded-lg px-3 py-2 max-w-fit",
};

const EnhancedCodeEditor = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const username = searchParams.get("username");
  const isHost = searchParams.get("host") === "true";

  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState("# Your code here");
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("code");
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [globalPermissions, setGlobalPermissions] = useState({
    canEdit: true,
    canChat: true,
    canRun: true,
    canCopy: true,
    canReset: true,
  });
  const chatContainerRef = useRef(null);
  const [showAIToast, setShowAIToast] = useState(false);
  const [showAIReviewDrawer, setShowAIReviewDrawer] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewResponse, setAiReviewResponse] = useState("");

  useEffect(() => {
    const socket = socketService.connect();
    setSocket(socket);

    socketService.joinRoom(roomId, username, isHost);

    socketService.onRoomState(
      ({ code: roomCode, language: roomLanguage, users: roomUsers }) => {
        setCode(roomCode);
        setLanguage(roomLanguage);
        setUsers(roomUsers);
      }
    );

    socketService.onUserJoined(({ users: newUsers }) => {
      setUsers(newUsers);
    });

    socketService.onUserLeft(({ users: remainingUsers }) => {
      setUsers(remainingUsers);
    });

    socketService.onCodeUpdate(({ code: newCode, language: newLanguage }) => {
      setCode(newCode);
      setLanguage(newLanguage);
    });

    socketService.onNewMessage(({ message, username: sender }) => {
      setChatMessages((prev) => [...prev, { username: sender, message }]);
    });

    socketService.onPermissionsUpdated(
      ({ permissions, type, username: targetUser }) => {
        if (type === "global") {
          setGlobalPermissions(permissions);
        } else {
          setUserPermissions((prev) => ({
            ...prev,
            [targetUser]: permissions,
          }));
        }
      }
    );

    socketService.onCodeExecutionResult(({ output, error }) => {
      console.log("Received execution result:", { output, error });
      setOutput(error ? `Error:\n${output}` : `Output:\n${output}`);
      setActiveTab("output");
    });

    socketService.onSessionEnded(() => {
      toast.error('Host has ended the session', {
        duration: 5000,
        position: 'top-center',
      });
      setTimeout(() => {
        navigate('/');
      }, 1000);
    });

    return () => {
      socketService.disconnect();
    };
  }, [roomId, username, isHost, navigate]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const emitCodeChange = (roomId, code, language) => {
    socketService.emitCodeChange(roomId, code, language);
  };

  const emitChatMessage = (roomId, message, username) => {
    socketService.emitChatMessage(roomId, message, username);
  };

  useEffect(() => {
    if (users.length > 0) {
      const initialPermissions = {};
      users.forEach((user) => {
        if (!userPermissions[user.username]) {
          initialPermissions[user.username] = {
            canEdit: true,
            canChat: true,
            canRun: true,
            canCopy: true,
            canReset: true,
          };
        }
      });
      setUserPermissions((prev) => ({ ...prev, ...initialPermissions }));
    }
  }, [users]);

  const toggleGlobalPermission = (permission) => {
    const newPermissions = {
      ...globalPermissions,
      [permission]: !globalPermissions[permission],
    };
    setGlobalPermissions(newPermissions);
    socketService.emitPermissionUpdate(roomId, newPermissions, "global", null);
  };

  const toggleUserPermission = (username, permission) => {
    const newPermissions = {
      ...userPermissions[username],
      [permission]: !userPermissions[username][permission],
    };
    setUserPermissions((prev) => ({
      ...prev,
      [username]: newPermissions,
    }));
    socketService.emitPermissionUpdate(
      roomId,
      newPermissions,
      "user",
      username
    );
  };

  const handleCodeChange = (value) => {
    if (!isHost && !globalPermissions.canEdit) return;
    if (!isHost && userPermissions[username]?.canEdit === false) return;
    setCode(value || "");
    emitCodeChange(roomId, value || "", language);
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
    emitCodeChange(roomId, code, event.target.value);
  };

  const sendMessage = async () => {
    if (!isHost && !globalPermissions.canChat) return;
    if (!isHost && userPermissions[username]?.canChat === false) return;

    if (currentMessage.trim() && socket) {
      if (currentMessage.trim().startsWith("@ai")) {
        try {
          // Remove '@ai' from the message
          const prompt = currentMessage.slice(3).trim();

          // Show the user's message first
          emitChatMessage(roomId, currentMessage, username);

          // Make API call to get AI response
          const response = await fetch(
            `http://localhost:3000/ai/get-result?prompt=${encodeURIComponent(
              prompt
            )}`
          );
          const aiResponse = await response.text();

          // Emit AI's response as a special message
          socketService.emitChatMessage(roomId, aiResponse, "AI Assistant");
        } catch (error) {
          console.error("AI API Error:", error);
          socketService.emitChatMessage(
            roomId,
            "Sorry, I encountered an error processing your request.",
            "AI Assistant"
          );
        }
      } else {
        // Normal message handling
        emitChatMessage(roomId, currentMessage, username);
      }
      setCurrentMessage("");
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied!");
  };

  const handleRunCode = () => {
    if (!isHost && !globalPermissions.canRun) return;
    if (!isHost && userPermissions[username]?.canRun === false) return;

    setOutput("Executing code...");
    setActiveTab("output");

    try {
      socketService.emitExecuteCode(roomId, code, language);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const handleCopyCode = () => {
    if (!isHost && !globalPermissions.canCopy) return;
    if (!isHost && userPermissions[username]?.canCopy === false) return;

    navigator.clipboard.writeText(code);
    alert("Code copied to clipboard!");
  };

  const handleResetCode = () => {
    if (!isHost && !globalPermissions.canReset) return;
    if (!isHost && userPermissions[username]?.canReset === false) return;

    if (window.confirm("Are you sure you want to clear all code?")) {
      handleCodeChange("");
    }
  };

  // Process AI response to handle newlines
  const processAIResponse = (text) => {
    return text.replace(/\\n/g, '\n');
  };

  const handleAIReview = async () => {
    try {
      setAiReviewLoading(true);
      setShowAIReviewDrawer(true);
      
      // Generate a filename based on the selected language
      const fileExtension = language === 'javascript' ? 'js' : 
                           language === 'python' ? 'py' : 
                           language === 'java' ? 'java' : 
                           language === 'cpp' ? 'cpp' : 
                           language === 'csharp' ? 'cs' : 
                           language === 'go' ? 'go' : 
                           language === 'ruby' ? 'rb' : 
                           language === 'php' ? 'php' : 
                           language === 'swift' ? 'swift' : 
                           language === 'kotlin' ? 'kt' : 
                           language === 'scala' ? 'scala' : 
                           language === 'rust' ? 'rs' : 
                           language === 'bash' ? 'sh' : 
                           language === 'markdown' ? 'md' : 
                           language === 'html' ? 'html' : 
                           language === 'css' ? 'css' : 
                           language === 'json' ? 'json' : 
                           language === 'yaml' ? 'yml' : 
                           language === 'xml' ? 'xml' : 'txt';
      
      const filename = `code.${fileExtension}`;
      
      const response = await fetch('http://localhost:3000/ai/get-code-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code,
          filename: filename 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.text();
      setAiReviewResponse(processAIResponse(result));
    } catch (error) {
      console.error('AI Review Error:', error);
      setAiReviewResponse("Sorry, I encountered an error while reviewing your code. Please try again.");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const controlPanelStyles = {
    container: 'fixed right-0 top-0 h-screen w-full bg-white/90 backdrop-blur-lg border-l border-gray-200 shadow-xl transform transition-all duration-300 ease-in-out',
    header: 'px-6 py-4 border-b border-gray-200 flex items-center justify-between',
    title: 'text-xl font-semibold text-gray-800',
    closeButton: 'p-2 rounded-full hover:bg-gray-100 transition-colors duration-200',
    content: 'p-6 space-y-6 overflow-y-auto h-[calc(100vh-120px)]',
    section: 'space-y-4',
    sectionTitle: 'text-sm font-medium text-gray-500 uppercase tracking-wide',
    grid: 'grid grid-cols-2 gap-4',
    card: 'p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200',
    checkboxContainer: 'flex items-center space-x-2 cursor-pointer',
    checkbox: 'w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors duration-200',
    checkboxLabel: 'text-sm text-gray-700 cursor-pointer',
  };

  const aiReviewStyles = {
    container: 'fixed right-0 top-0 h-screen w-full bg-white/90 backdrop-blur-lg border-l border-gray-200 shadow-xl transform transition-all duration-300 ease-in-out overflow-hidden',
    header: 'px-6 py-4 border-b border-gray-200 flex items-center justify-between',
    title: 'text-xl font-semibold text-gray-800',
    closeButton: 'p-2 rounded-full hover:bg-gray-100 transition-colors duration-200',
    content: 'p-6 space-y-4 overflow-y-auto h-[calc(100vh-120px)] prose prose-gray max-w-none',
    loading: 'flex items-center justify-center h-full space-x-2',
    error: 'text-red-500 bg-red-50 p-4 rounded-lg',
    response: 'bg-gray-50 p-6 rounded-lg text-gray-700 shadow-sm',
    codeBlock: 'bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto my-4 text-white shadow-md',
    heading1: 'text-2xl font-bold text-blue-600 mt-8 mb-4',
    heading2: 'text-xl font-semibold text-blue-500 mt-6 mb-4 pb-2 border-b border-gray-200',
    heading3: 'text-lg font-medium text-blue-400 mt-5 mb-3',
    paragraph: 'text-gray-700 leading-relaxed mb-4',
    list: 'list-disc pl-6 mb-4 space-y-2',
    listItem: 'mb-2',
  };

  const formatAIResponse = (response) => {
    // Add custom CSS styles for the AI review components
    const customStyles = `
      <style>
        .review-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563eb;
          margin: 1.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .review-heading {
          font-size: 1.25rem;
          font-weight: 600;
          color: #3b82f6;
          margin: 1.25rem 0 0.75rem;
        }
        .review-paragraph {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        .review-list {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .review-list-item {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .code-block {
          background-color: #1e293b;
          border-radius: 0.5rem;
          margin: 1rem 0;
          overflow: hidden;
        }
        .code-block pre {
          padding: 1rem;
          overflow-x: auto;
          margin: 0;
        }
        .code-block code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #e2e8f0;
          white-space: pre;
          tab-size: 2;
        }
        .language-javascript, .language-js {
          color: #f7df1e;
        }
        .language-python, .language-py {
          color: #3776ab;
        }
        .language-java {
          color: #b07219;
        }
        .language-cpp {
          color: #f34b7d;
        }
      </style>
    `;
    
    // Return the formatted response with custom styles
    return customStyles + response;
  };

  const ControlPanel = () => (
    <div className={controlPanelStyles.container}>
      <div className={controlPanelStyles.header}>
        <h2 className={controlPanelStyles.title}>Control Panel</h2>
        <button
          onClick={() => setShowControlPanel(false)}
          className={controlPanelStyles.closeButton}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className={controlPanelStyles.content}>
        <div className={controlPanelStyles.section}>
          <h3 className={controlPanelStyles.sectionTitle}>Global Permissions</h3>
          <div className={controlPanelStyles.grid}>
            {Object.entries(globalPermissions).map(([permission, value]) => (
              <div key={permission} className={controlPanelStyles.card}>
                <div 
                  className={controlPanelStyles.checkboxContainer}
                  onClick={() => toggleGlobalPermission(permission)}
                >
                  <input
                    type="checkbox"
                    checked={value}
                    readOnly
                    className={controlPanelStyles.checkbox}
                  />
                  <label className={controlPanelStyles.checkboxLabel}>
                    Allow {permission.replace('can', '').toLowerCase()}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={controlPanelStyles.section}>
          <h3 className={controlPanelStyles.sectionTitle}>Participants</h3>
          <div className="space-y-2">
            {users
              .filter(user => !user.isHost)
              .map((user) => (
                <div key={user.username} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm text-gray-600">{user.username[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">{user.username}</div>
                    <div className="text-xs text-gray-500">Member</div>
                  </div>
                  {isHost && (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(userPermissions[user.username] || {}).map(([permission, value]) => (
                        <div
                          key={permission}
                          className="flex items-center space-x-2 cursor-pointer"
                          onClick={() => toggleUserPermission(user.username, permission)}
                        >
                          <input
                            type="checkbox"
                            checked={value}
                            readOnly
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
                          />
                          <label className="text-xs text-gray-600 cursor-pointer">
                            {permission.replace('can', '').toLowerCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AIReviewDrawer = () => (
    <div className={aiReviewStyles.container}>
      <div className={aiReviewStyles.header}>
        <h2 className={aiReviewStyles.title}>AI Code Review</h2>
        <button
          onClick={() => setShowAIReviewDrawer(false)}
          className={aiReviewStyles.closeButton}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className={aiReviewStyles.content}>
        {aiReviewLoading ? (
          <div className={aiReviewStyles.loading}>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Analyzing your code...</span>
          </div>
        ) : aiReviewResponse ? (
          <div
            className={aiReviewStyles.response}
            dangerouslySetInnerHTML={{ __html: formatAIResponse(aiReviewResponse) }}
          />
        ) : (
          <div className={aiReviewStyles.error}>
            No review available. Please try again.
          </div>
        )}
      </div>
    </div>
  );

  const ChatMessage = ({ msg, index }) => (
    <div
      key={index}
      className={`w-full mb-2 ${
        msg.username === username ? chatStyles.sent : chatStyles.received
      }`}
    >
      <div
        className={`${
          msg.username === "AI Assistant"
            ? "bg-black text-white rounded-lg px-3 py-2 max-w-[85%] w-fit"
            : msg.username === username
            ? chatStyles.sentBubble
            : chatStyles.receivedBubble
        }`}
      >
        <div className="flex flex-col">
          <span className="text-xs opacity-75 mb-1">
            {msg.username === username ? "You" : msg.username}
          </span>
          {msg.username === "AI Assistant" ? (
            <ReactMarkdown
              className="break-words text-sm"
              components={{
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold my-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold my-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-bold my-2">{children}</h3>
                ),

                // Updated code blocks with syntax highlighting
                pre: ({ children }) => (
                  <pre className="bg-gray-800 rounded-md p-2 my-2 overflow-x-auto max-w-full">
                    {children}
                  </pre>
                ),
                code: ({ inline, className, children }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "javascript";

                  return inline ? (
                    <code className="bg-gray-800 px-1 rounded font-mono text-pink-300">
                      {children}
                    </code>
                  ) : (
                    <div className="max-w-full">
                      <Highlight
                        theme={themes.nightOwl}
                        code={String(children).replace(/\n$/, "")}
                        language={language}
                      >
                        {({
                          className,
                          style,
                          tokens,
                          getLineProps,
                          getTokenProps,
                        }) => (
                          <div className="overflow-x-auto">
                            <pre
                              className={`${className} w-auto`}
                              style={{
                                ...style,
                                margin: 0,
                                padding: "0.5rem",
                                backgroundColor: "transparent",
                              }}
                            >
                              {tokens.map((line, i) => (
                                <div
                                  key={i}
                                  {...getLineProps({ line })}
                                  style={{ display: "table-row" }}
                                >
                                  <div
                                    style={{
                                      display: "table-cell",
                                      whiteSpace: "pre",
                                    }}
                                  >
                                    {line.map((token, key) => (
                                      <span
                                        key={key}
                                        {...getTokenProps({ token })}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </pre>
                          </div>
                        )}
                      </Highlight>
                    </div>
                  );
                },

                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc ml-4 my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-4 my-2 space-y-1">
                    {children}
                  </ol>
                ),

                // Paragraphs
                p: ({ children }) => <p className="my-2">{children}</p>,

                // Links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),

                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-gray-500 pl-4 my-2 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {msg.message}
            </ReactMarkdown>
          ) : (
            <span className="break-words">{msg.message}</span>
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (activeTab === "chat") {
      setShowAIToast(true);
      const timer = setTimeout(() => {
        setShowAIToast(false);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleLeaveRoom = () => {
    navigate("/");
  };

  const handleEndSession = () => {
    if (isHost) {
      socketService.emitEndSession(roomId);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white p-4 border-r flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-center">Code Collab</h1>
          {isHost && (
            <div className="flex items-center justify-center mb-4">
              <Crown className="text-yellow-500 mr-2" />
              <span className="text-sm font-semibold">Host</span>
            </div>
          )}
          <h2 className="mt-4 font-bold">Users:</h2>
          <ul className="overflow-auto max-h-40 border p-2 rounded">
            {users.map((user, index) => (
              <li
                key={index}
                className="p-1 border-b flex items-center justify-between"
              >
                <span>{user.username}</span>
                {user.isHost && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2"> {/* Added vertical space between all buttons */}
  {isHost && (
    <button
    onClick={() => setShowControlPanel(true)}
    className="bg-blue-500 text-white px-4 py-2 rounded flex items-center hover:bg-blue-600 hover:scale-95 transition-all duration-300"
  >
    <Settings className="mr-2 h-4 w-4" /> Control Panel
  </button>
  
  )}
  <button
  onClick={copyRoomId}
  className="bg-gray-300 text-black px-4 py-2 rounded flex items-center hover:bg-gray-400 hover:scale-95 transition-all duration-300"
>
  <Share2 className="mr-2 h-4 w-4" /> Copy Room ID
</button>

  <button
  onClick={handleLeaveRoom}
  className="bg-red-500 text-white px-4 py-2 rounded flex items-center hover:bg-red-600 hover:scale-95 transition-all duration-300"
>
  <LogOut className="mr-2 h-4 w-4" /> Leave Room
</button>

  {isHost && (
   <button
   onClick={handleEndSession}
   className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700 hover:scale-95 transition-all duration-300"
 >
   <X className="mr-2 h-4 w-4" /> End Session
 </button>
 
  
  
  )}
</div>

      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b bg-white">
          <button
            className={`p-2 flex-1 ${
              activeTab === "code" ? "bg-gray-200" : ""
            }`}
            onClick={() => setActiveTab("code")}
          >
            code
          </button>
          <button
            className={`p-2 flex-1 ${
              activeTab === "output" ? "bg-gray-200" : ""
            }`}
            onClick={() => setActiveTab("output")}
          >
            Output
          </button>
          <button
            className={`p-2 flex-1 ${
              activeTab === "chat" ? "bg-gray-200" : ""
            }`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
        </div>
        {activeTab === "code" && (
          <div className="p-2 bg-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <label className="mr-2">Language:</label>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="border p-1 rounded"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyCode}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                  !isHost &&
                  (!globalPermissions.canCopy ||
                    userPermissions[username]?.canCopy === false)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={
                  !isHost &&
                  (!globalPermissions.canCopy ||
                    userPermissions[username]?.canCopy === false)
                }
                title="Copy Code"
              >
                <Clipboard className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetCode}
                className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                  !isHost &&
                  (!globalPermissions.canReset ||
                    userPermissions[username]?.canReset === false)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={
                  !isHost &&
                  (!globalPermissions.canReset ||
                    userPermissions[username]?.canReset === false)
                }
                title="Reset Code"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleRunCode}
                className={`bg-green-500 text-white px-4 py-2 rounded flex items-center ${
                  !isHost &&
                  (!globalPermissions.canRun ||
                    userPermissions[username]?.canRun === false)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-green-600"
                }`}
                disabled={
                  !isHost &&
                  (!globalPermissions.canRun ||
                    userPermissions[username]?.canRun === false)
                }
              >
                <Play className="h-4 w-4 mr-2" />
                Run Code
              </button>
              <button
                onClick={handleAIReview}
                className="bg-purple-500 text-white px-4 py-2 rounded flex items-center hover:bg-purple-600"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                𝗔𝗜 Code Review 
              </button>
            </div>
          </div>
        )}
        {activeTab === "code" && (
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              readOnly:
                !isHost &&
                (!globalPermissions.canEdit ||
                  userPermissions[username]?.canEdit === false),
            }}
          />
        )}
        {activeTab === "output" && (
          <div className="p-4 bg-gray-50 flex-1 overflow-auto">
            {output || "No output yet"}
          </div>
        )}
        {activeTab === "chat" && (
          <div className="p-4 flex-1 flex flex-col overflow-hidden relative">
            {showAIToast && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-4 py-2 z-10 border border-gray-200">
                <p className="text-sm">
                  To enable AI assistant, start message with{" "}
                  <span className="text-blue-500 font-semibold">@ai</span>
                </p>
              </div>
            )}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-auto border p-2 rounded space-y-2"
            >
              {chatMessages.map((msg, index) => (
                <ChatMessage msg={msg} index={index} />
              ))}
            </div>
            <div className="mt-2 flex">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border rounded"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                disabled={
                  !isHost &&
                  (!globalPermissions.canChat ||
                    userPermissions[username]?.canChat === false)
                }
              />
              <button
                onClick={sendMessage}
                className={`ml-2 px-4 py-2 rounded ${
                  !isHost &&
                  (!globalPermissions.canChat ||
                    userPermissions[username]?.canChat === false)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white`}
                disabled={
                  !isHost &&
                  (!globalPermissions.canChat ||
                    userPermissions[username]?.canChat === false)
                }
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      {showControlPanel && isHost && <ControlPanel />}
      {showAIReviewDrawer && <AIReviewDrawer />}
    </div>
  );
};
export default EnhancedCodeEditor;
