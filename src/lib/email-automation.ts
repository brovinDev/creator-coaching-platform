import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

/** The signed-in creator, or an error shaped for NextResponse.json. */
export async function requireCreator() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { user: session.user } as const;
}

/** The service, only if the signed-in creator owns it. */
export async function getOwnedService(serviceId: string, token: string) {
  const creator = await requireCreator();
  if ("error" in creator) return { error: creator.error, status: creator.status } as const;

  const service = await nocodeDb.services.findUnique({ id: serviceId }, token);
  if (!service || service.creator_id !== creator.user.id) {
    return { error: "Service not found", status: 404 } as const;
  }
  return { service, user: creator.user } as const;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}
