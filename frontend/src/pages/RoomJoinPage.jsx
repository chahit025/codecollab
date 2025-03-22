import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Code2,
  Hash,
  User,
  Plus,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import toast, { Toaster } from "react-hot-toast";

const RoomJoinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get("type") === "host";
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId || !username) {
      toast.error("Please fill in all fields");
      return;
    }

    if (isHost) {
      navigate(`/enhanced?roomId=${roomId}&username=${username}&host=true`);
    } else {
      navigate(`/enhanced?roomId=${roomId}&username=${username}&host=false`);
    }
  };

  const generateNewRoom = () => {
    const newRoomId = uuidv4().substring(0, 8);
    setRoomId(newRoomId);
    toast.success(
      "New room created! Share this ID with others to collaborate."
    );
  };

  const shareUrl = `${window.location.origin}/room/join?type=user&roomId=${roomId}`;
  const shareText = `Join my collaborative coding session on CodeCollab! Room ID: ${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (platform) => {
    let shareLink = "";
    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`;
        break;
      case "linkedin":
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          shareUrl
        )}`;
        break;
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(
          shareText + " " + shareUrl
        )}`;
        break;
    }
    window.open(shareLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Toaster />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Code2 className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isHost ? "Create a Room" : "Join a Room"}
        </h2>
        {isHost && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new room and share the ID with others
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="room-id"
                className="block text-sm font-medium text-gray-700"
              >
                Room ID
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="room-id"
                  type="text"
                  required
                  value={roomId}
                  onChange={(e) => !isHost && setRoomId(e.target.value)} // Prevent typing when isHost is true
                  readOnly={isHost} // Make input readonly for host
                  className={`block w-full pl-10 pr-16 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 
                  ${isHost ? "bg-gray-100 cursor-not-allowed" : ""}`} // Only apply styles when isHost is true
                  placeholder={isHost ? "Click create button to generate RoomID" : "Enter room ID"}
                />
                {isHost && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={generateNewRoom}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isHost && roomId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Share2 className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Share Room
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleShare("twitter")}
                      className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                      aria-label="Share on Twitter"
                    >
                      <Twitter className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare("facebook")}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      aria-label="Share on Facebook"
                    >
                      <Facebook className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare("linkedin")}
                      className="p-2 text-gray-500 hover:text-blue-700 transition-colors"
                      aria-label="Share on LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare("whatsapp")}
                      className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                      aria-label="Share on WhatsApp"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                      aria-label="Copy link"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your display name"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isHost ? "Create & Join Room" : "Join Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomJoinPage;
