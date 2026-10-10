/** The message room the reader has open right now, shared by the places that show unread counts. */
let current: string | null = null;

export const setOpenRoom = (id: string | null) => {
  current = id;
};

/** The query string that keeps the open room out of an unread count: what is on screen is already read. */
export const unreadUrl = () => `/api/messages/unread${current ? `?exclude=${encodeURIComponent(current)}` : ""}`;
