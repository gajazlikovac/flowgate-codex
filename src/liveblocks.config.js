// src/liveblocks.config.js
import { createClient, LiveList, LiveObject, LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// 1) Create your Liveblocks client, with Auth0 fallback to public key
const client = createClient({
  authEndpoint: async (room) => {
    try {
      if (window.auth0?.getAccessTokenSilently) {
        const token = await window.auth0.getAccessTokenSilently();
        const resp = await fetch(
          `${process.env.REACT_APP_AUTH_API_URL || "http://localhost:3002"}/api/liveblocks-auth`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ room }),
          }
        );
        if (!resp.ok) {
          throw new Error(`Auth endpoint returned ${resp.status}`);
        }
        return await resp.json();
      }
    } catch (e) {
      console.warn("Liveblocks auth failed, falling back to public key:", e);
    }
    return {
      publicApiKey:
        process.env.REACT_APP_LIVEBLOCKS_PUBLIC_KEY ||
        "pk_prod_aezZIPlRpCGqXEjSZpNKYKxLdMt140zIw-cUVlr4L4rp8PdKohKvHR6SJurcmQtn",
    };
  },
});

// 2) Create a RoomContext
const roomContext = createRoomContext(client);

// 3) Grab the suspense‐mode hooks & components
const {
  RoomProvider,
  useOthers,
  useOthersMapped,
  useMyPresence,
  useUpdateMyPresence,
  useStorage,
  useMutation,
  useHistory,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
  useBroadcastEvent,
  useEventListener,
  useErrorListener,
  useThreads,
  useCreateThread,
  useUser,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useAddReaction,
  useRemoveReaction,
  useThreadSubscription,
} = roomContext.suspense;

// 4) Aliased export of the suspense “ClientSideSuspense”
const LiveblocksSuspense = roomContext.suspense.ClientSideSuspense;

// 5) Utility functions
function getRandomColor() {
  const colors = [
    "#2196f3",
    "#4caf50",
    "#f44336",
    "#ff9800",
    "#9c27b0",
    "#00bcd4",
    "#795548",
    "#607d8b",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createRoomId(type, id) {
  switch (type) {
    case "tasks":
      return `tasks-${id}`;
    case "goals":
      return `goals-${id}`;
    case "workflow":
      return `workflow-${id}`;
    case "permit":
      return `permit-${id}`;
    default:
      return `${type}-${id}`;
  }
}

// 6) Exports
export {
  client,
  RoomProvider,
  useOthers,
  useOthersMapped,
  useMyPresence,
  useUpdateMyPresence,
  useStorage,
  useMutation,
  useHistory,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
  useBroadcastEvent,
  useEventListener,
  useErrorListener,
  useThreads,
  useCreateThread,
  useUser,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useAddReaction,
  useRemoveReaction,
  useThreadSubscription,
  LiveblocksSuspense,
  LiveList,
  LiveObject,
  LiveMap,
  getRandomColor,
  createRoomId,
};
