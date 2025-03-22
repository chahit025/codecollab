import React from "react";

const UsersList = ({ users }) => {
  return (
    <div className="flex-grow overflow-y-auto mb-4">
      <h2 className="text-xl font-bold mb-2">Users in Room</h2>
      <ul>
        {users.map((user) => (
          <li
            key={user.socketId || user._id}
            className="mb-2 flex items-center space-x-2 p-2 rounded-lg bg-gray-50"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-medium text-indigo-600">
                {user.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-gray-700">
              {user.username}
              {user.isHost && " (Host)"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
