import { nocodeDb } from "@/lib/nocode/db";
import { learnerAccess } from "@/lib/feed";

export const MAX_MESSAGE_LENGTH = 2000;

type Row = Record<string, unknown>;
type User = { id: string; role: string };

/** The room, only if this user may be in it: the creator who owns it, or a learner enrolled in its service. */
export async function getAccessibleRoom(roomId: string, user: User, token: string): Promise<Row | null> {
  const room = await nocodeDb.messageRooms.findUnique({ id: roomId }, token).catch(() => null);
  if (!room) return null;
  if (user.role === "CREATOR") return String(room.creator_id) === user.id ? room : null;
  const enrolled = await nocodeDb.enrollments.findMany({ where: { user_id: user.id, service_id: String(room.service_id) } }, token);
  return enrolled.length > 0 ? room : null;
}

export function messageOut(m: Row, userId: string) {
  return {
    id: String(m.id),
    userName: String(m.user_name || "Member"),
    role: m.user_role === "CREATOR" ? "CREATOR" : "STUDENT",
    content: String(m.content || ""),
    createdAt: String(m.created_at || ""),
    mine: String(m.user_id) === userId,
  };
}

const time = (v: unknown) => Date.parse(String(v || "")) || 0;

/**
 * The rooms this user can open, newest activity first, each with how many messages from others
 * they have not read yet. A creator also gets the services that have no room yet.
 */
export async function listRooms(user: User, token: string) {
  const isCreator = user.role === "CREATOR";

  let rooms: Row[] = [];
  let availableServices: { id: string; title: string }[] = [];
  if (isCreator) {
    rooms = await nocodeDb.messageRooms.findMany({ where: { creator_id: user.id } }, token);
    const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
    const taken = new Set(rooms.map((r) => String(r.service_id)));
    availableServices = services.filter((s) => !taken.has(String(s.id))).map((s) => ({ id: String(s.id), title: String(s.title || "Untitled") }));
  } else {
    const access = await learnerAccess(user.id, token);
    const lists = await Promise.all([...access.creatorIds].map((id) => nocodeDb.messageRooms.findMany({ where: { creator_id: id } }, token)));
    rooms = lists.flat().filter((r) => access.serviceIds.has(String(r.service_id)));
  }

  const reads = await nocodeDb.roomReads.findMany({ where: { user_id: user.id } }, token);
  const readUpTo = new Map(reads.map((r) => [String(r.room_id), time(r.last_read_at)]));

  const out = await Promise.all(
    rooms.map(async (r) => {
      const id = String(r.id);
      const recent = await nocodeDb.roomMessages.findMany({ where: { room_id: id }, orderBy: { created_at: "desc" }, take: 100 }, token);
      const last = recent[0];
      const seen = readUpTo.get(id) ?? 0;
      const unread = recent.filter((m) => String(m.user_id) !== user.id && time(m.created_at) > seen).length;
      return {
        id,
        serviceId: String(r.service_id),
        name: String(r.name || "Room"),
        last: last
          ? { userName: String(last.user_name || "Member"), content: String(last.content || ""), createdAt: String(last.created_at || "") }
          : null,
        unread,
        sortAt: time(last?.created_at) || time(r.created_at),
      };
    })
  );
  out.sort((a, b) => b.sortAt - a.sortAt);

  return {
    rooms: out.map((room) => ({
      id: room.id,
      serviceId: room.serviceId,
      name: room.name,
      last: room.last,
      unread: room.unread,
    })),
    availableServices,
    totalUnread: out.reduce((n, r) => n + r.unread, 0),
  };
}

/** Marks everything in the room up to its newest message as read for this user. */
export async function markRoomRead(roomId: string, userId: string, token: string) {
  const [newest] = await nocodeDb.roomMessages.findMany({ where: { room_id: roomId }, orderBy: { created_at: "desc" }, take: 1 }, token);
  if (!newest?.created_at) return;
  // The time comes from the newest message itself, so the database's clock is the only one involved.
  const existing = await nocodeDb.roomReads.findFirst({ room_id: roomId, user_id: userId }, token);
  if (existing) await nocodeDb.roomReads.update(String(existing.id), { last_read_at: String(newest.created_at) }, token);
  else await nocodeDb.roomReads.create({ room_id: roomId, user_id: userId, last_read_at: String(newest.created_at) }, token);
}
