import { createTRPCRouter } from "~/server/api/trpc";
import { roomsRouter } from "./routers/rooms";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  rooms: roomsRouter,
});


export type AppRouter = typeof appRouter;
