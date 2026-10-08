type Row = Record<string, unknown>;

/**
 * The orders that belong to a creator. An order is theirs when it is for one of their services,
 * or, for an older direct course purchase (no service), for one of their courses.
 */
export function ordersOfCreator(orders: Row[], serviceIds: Set<string>, courseIds: Set<string>) {
  return orders.filter((o) =>
    o.service_id ? serviceIds.has(String(o.service_id)) : !!o.course_id && courseIds.has(String(o.course_id))
  );
}

/** What an order was for: the service's title, or the course's for an older direct course purchase. */
export function orderTitle(order: Row, services: Map<string, Row>, courses: Map<string, Row>) {
  const service = order.service_id ? services.get(String(order.service_id)) : undefined;
  if (service?.title) return String(service.title);
  const course = order.course_id ? courses.get(String(order.course_id)) : undefined;
  return String(course?.title || "");
}
