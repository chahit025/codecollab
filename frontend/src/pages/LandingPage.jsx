import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Code2,
  Users,
  ArrowRight,
  MessageSquare,
  Globe2,
  Zap,
  Lock,
  Code,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, handleJoinRoom } = useAuth();

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6 text-indigo-500" />,
      title: "Built-in Chat System",
      description:
        "Real-time communication with your team members while coding",
    },
    {
      icon: <Code className="h-6 w-6 text-indigo-500" />,
      title: "AI Code Review System",
      description: "Intelligent code review system powered by AI for better code quality",
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-indigo-500" />,
      title: "AI Chat Assistant",
      description: "Built-in AI assistant accessible with '@ai' command in chat",
    },
    {
      icon: <Globe2 className="h-6 w-6 text-indigo-500" />,
      title: "Cross-Platform",
      description: "Code from anywhere, any device, without installation",
    },
    {
      icon: <Zap className="h-6 w-6 text-indigo-500" />,
      title: "Real-time Collaboration",
      description: "See changes instantly as your team members code",
    },
    {
      icon: <Lock className="h-6 w-6 text-indigo-500" />,
      title: "Secure Rooms",
      description: "Private rooms with unique IDs for controlled access",
    },
    {
      icon: <Code className="h-6 w-6 text-indigo-500" />,
      title: "Multi-Language Support",
      description:
        "Code in various programming languages with syntax highlighting",
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      title: "Team Management",
      description: "See who's online and coding in real-time",
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Code2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                CodeCollab
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors shadow-sm hover:shadow-md"
                  >
                    Register
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {user.username[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.username}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Real-time Collaborative</span>
              <span className="block bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                Code Editor Platform
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Code together in real-time, share ideas, and build amazing
              projects with your team. Experience seamless collaboration with
              our powerful editor.
            </p>

            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-4xl mx-auto">
              <div
                onClick={() => handleJoinRoom("host")}
                className="relative group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-indigo-100"
              >
                <div className="flex items-center justify-center">
                  <Users className="h-12 w-12 text-indigo-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Join as Host
                </h2>
                <p className="mt-2 text-gray-500">
                  Create a new room and invite others to collaborate
                </p>
                <ArrowRight className="absolute right-4 bottom-4 h-5 w-5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div
                onClick={() => handleJoinRoom("user")}
                className="relative group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-indigo-100"
              >
                <div className="flex items-center justify-center">
                  <Code2 className="h-12 w-12 text-indigo-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Join as User
                </h2>
                <p className="mt-2 text-gray-500">
                  Enter a room ID to join an existing session
                </p>
                <ArrowRight className="absolute right-4 bottom-4 h-5 w-5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="mt-24">
              <h2 className="text-3xl font-bold text-gray-900 mb-12">
                Why Choose CodeCollab?
              </h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 text-left">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="relative group bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="mt-4 text-gray-500">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center space-x-2 text-gray-500 text-sm">
            <Code2 className="h-4 w-4" />
            <span>
              &copy; {new Date().getFullYear()} CodeCollab. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
